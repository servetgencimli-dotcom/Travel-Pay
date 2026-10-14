<?php

namespace App\Services\Security;

use App\Models\BlockedIp;
use App\Models\SecurityEvent;
use App\Models\Transaction;
use App\Services\Fraud\FraudDetectionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Payment-flow & threat telemetry for the security operations dashboard.
 */
class ThreatMonitorService
{
    public function __construct(
        protected SecurityAlertService $securityAlertService
    ) {}

    // ------------------------------------------------------------------
    // Shield state (used by the ThreatShield middleware)
    // ------------------------------------------------------------------

    public function isBlocked(string $ip): bool
    {
        return Cache::remember("tp:blocked:{$ip}", 30, fn () => BlockedIp::where('ip_address', $ip)
            ->where(fn ($q) => $q->whereNull('blocked_until')->orWhere('blocked_until', '>', now()))
            ->exists());
    }

    public function registerBlockedHit(string $ip): void
    {
        BlockedIp::where('ip_address', $ip)->increment('hits');
        $this->bump('blocked');
    }

    public function countRequest(string $ip): int
    {
        $this->bump('requests');

        $key = "tp:rate:{$ip}:" . now()->format('YmdHi');
        Cache::add($key, 0, 120);

        return (int) Cache::increment($key);
    }

    public function autoBlock(string $ip, int $count, Request $request): void
    {
        $this->bump('blocked');

        $block = BlockedIp::firstOrNew(['ip_address' => $ip]);
        $isNew = !$block->exists || !$block->isActive();
        $block->fill([
            'reason' => "Auto-blocked: {$count} requests/min exceeded DDoS threshold",
            'source' => 'auto_ddos',
            'blocked_until' => now()->addMinutes(config('travelpay.security.ddos_block_minutes')),
        ])->save();
        Cache::forget("tp:blocked:{$ip}");

        if ($isNew) {
            $this->securityAlertService->recordSecurityEvent(
                user: $request->user()?->id,
                eventType: 'ddos_suspected',
                severity: 'critical',
                ip: $ip,
                userAgent: $request->userAgent(),
                metadata: ['requests_per_minute' => $count, 'path' => $request->path()]
            );
        }
    }

    public function recordMaliciousPayload(string $ip, array $threat, Request $request): void
    {
        $this->bump('threats');

        $this->securityAlertService->recordSecurityEvent(
            user: $request->user()?->id,
            eventType: 'malicious_payload_blocked',
            severity: 'high',
            ip: $ip,
            userAgent: $request->userAgent(),
            metadata: ['threat' => $threat['type'], 'field' => $threat['field'], 'path' => $request->path(), 'method' => $request->method()]
        );
    }

    public function block(string $ip, string $reason, ?int $minutes, ?int $adminId): BlockedIp
    {
        $block = BlockedIp::updateOrCreate(
            ['ip_address' => $ip],
            ['reason' => $reason, 'source' => 'manual', 'blocked_until' => $minutes ? now()->addMinutes($minutes) : null, 'created_by' => $adminId]
        );
        Cache::forget("tp:blocked:{$ip}");

        return $block;
    }

    public function unblock(BlockedIp $block): void
    {
        Cache::forget("tp:blocked:{$block->ip_address}");
        $block->delete();
    }

    // ------------------------------------------------------------------
    // Dashboard telemetry
    // ------------------------------------------------------------------

    public function overview(int $minutes = 30): array
    {
        $timeline = [];
        for ($i = $minutes - 1; $i >= 0; $i--) {
            $at = now()->subMinutes($i);
            $bucket = $at->format('YmdHi');
            $timeline[] = [
                'minute' => $at->format('H:i'),
                'requests' => (int) Cache::get("tp:metric:requests:{$bucket}", 0),
                'threats' => (int) Cache::get("tp:metric:threats:{$bucket}", 0),
                'blocked' => (int) Cache::get("tp:metric:blocked:{$bucket}", 0),
            ];
        }

        $since = now()->subDay();
        $eventsBySeverity = SecurityEvent::where('created_at', '>=', $since)
            ->select('severity', DB::raw('COUNT(*) as total'))
            ->groupBy('severity')
            ->pluck('total', 'severity');

        $topIps = SecurityEvent::where('created_at', '>=', $since)
            ->whereIn('severity', ['medium', 'high', 'critical'])
            ->whereNotNull('ip_address')
            ->select('ip_address', DB::raw('COUNT(*) as total'))
            ->groupBy('ip_address')
            ->orderByDesc('total')
            ->take(5)
            ->get();

        $recentThreats = SecurityEvent::whereIn('event_type', ['ddos_suspected', 'malicious_payload_blocked', 'login_failed', '2fa_failed', 'login_blocked_inactive'])
            ->orderByDesc('id')
            ->take(12)
            ->get();

        return [
            'timeline' => $timeline,
            'totals' => [
                'requests' => array_sum(array_column($timeline, 'requests')),
                'threats' => array_sum(array_column($timeline, 'threats')),
                'blocked' => array_sum(array_column($timeline, 'blocked')),
                'active_blocks' => BlockedIp::where(fn ($q) => $q->whereNull('blocked_until')->orWhere('blocked_until', '>', now()))->count(),
            ],
            'events_by_severity' => $eventsBySeverity,
            'top_risky_ips' => $topIps,
            'recent_threats' => $recentThreats,
            'payment_flow' => $this->paymentFlow(),
            'shield' => [
                'ddos_requests_per_minute' => config('travelpay.security.ddos_requests_per_minute'),
                'ddos_block_minutes' => config('travelpay.security.ddos_block_minutes'),
                'waf_signatures' => ['sql_injection', 'xss', 'path_traversal', 'remote_code'],
            ],
        ];
    }

    /**
     * Statistical monitoring of payment flows: hourly volume over 24h with z-score anomaly flags.
     */
    public function paymentFlow(): array
    {
        $rows = Transaction::where('created_at', '>=', now()->subHours(24))
            ->get(['created_at', 'status', 'amount', 'currency_code', 'risk_score']);

        $hours = [];
        for ($i = 23; $i >= 0; $i--) {
            $hours[now()->subHours($i)->format('Y-m-d H')] = ['count' => 0, 'failed' => 0, 'held' => 0, 'risk_sum' => 0];
        }

        foreach ($rows as $tx) {
            $key = $tx->created_at->format('Y-m-d H');
            if (!isset($hours[$key])) {
                continue;
            }
            $hours[$key]['count']++;
            $hours[$key]['risk_sum'] += $tx->risk_score;
            if ($tx->status === 'failed') {
                $hours[$key]['failed']++;
            }
            if ($tx->status === 'held_for_review') {
                $hours[$key]['held']++;
            }
        }

        $counts = array_column($hours, 'count');
        $mean = count($counts) ? array_sum($counts) / count($counts) : 0;
        $variance = count($counts) ? array_sum(array_map(fn ($c) => ($c - $mean) ** 2, $counts)) / count($counts) : 0;
        $std = sqrt($variance);

        $series = [];
        foreach ($hours as $key => $h) {
            $z = $std > 0 ? ($h['count'] - $mean) / $std : 0;
            $series[] = [
                'hour' => substr($key, -2) . ':00',
                'count' => $h['count'],
                'failed' => $h['failed'],
                'held' => $h['held'],
                'avg_risk' => $h['count'] ? round($h['risk_sum'] / $h['count'], 1) : 0,
                'z_score' => round($z, 2),
                'anomaly' => $z >= 2.5 && $h['count'] >= 3,
            ];
        }

        return [
            'series' => $series,
            'mean_per_hour' => round($mean, 2),
            'std_dev' => round($std, 2),
            'total_24h' => $rows->count(),
            'failed_24h' => $rows->where('status', 'failed')->count(),
            'held_24h' => $rows->where('status', 'held_for_review')->count(),
            'avg_risk_24h' => round((float) $rows->avg('risk_score'), 1),
            'anomalies' => count(array_filter($series, fn ($s) => $s['anomaly'])),
        ];
    }

    /**
     * Risk sandbox: run synthetic traffic through the live fraud rules without touching real money.
     */
    public function simulate(FraudDetectionService $fraud, string $scenario, int $count): array
    {
        $rules = $fraud->activeRules();
        $outcomes = ['allow' => 0, 'flag' => 0, 'step_up_2fa' => 0, 'hold' => 0, 'block' => 0];
        $scores = [];
        $samples = [];
        $ruleHits = [];

        for ($i = 0; $i < $count; $i++) {
            $context = match ($scenario) {
                'card_testing' => ['amount_azn' => mt_rand(1, 30), 'velocity_10m' => mt_rand(4, 20), 'device_status' => mt_rand(0, 3) ? 'untrusted' : 'trusted', 'failed_logins_1h' => mt_rand(0, 2)],
                'account_takeover' => ['amount_azn' => mt_rand(800, 9000), 'velocity_10m' => mt_rand(1, 6), 'device_status' => 'untrusted', 'failed_logins_1h' => mt_rand(2, 8)],
                'tourist_peak' => ['amount_azn' => mt_rand(10, 1500), 'velocity_10m' => mt_rand(1, 5), 'device_status' => mt_rand(0, 9) ? 'trusted' : 'untrusted', 'failed_logins_1h' => 0],
                default => ['amount_azn' => mt_rand(5, 600), 'velocity_10m' => mt_rand(1, 3), 'device_status' => 'trusted', 'failed_logins_1h' => mt_rand(0, 9) ? 0 : 1],
            };
            $context += ['type' => 'sandbox', 'amount' => (string) $context['amount_azn'], 'currency' => 'AZN'];

            $result = $fraud->evaluate($context, $rules);
            $outcomes[$result['action']]++;
            $scores[] = $result['risk_score'];
            foreach ($result['triggered_rules'] as $code) {
                $ruleHits[$code] = ($ruleHits[$code] ?? 0) + 1;
            }
            if (count($samples) < 8) {
                $samples[] = ['context' => $context, 'score' => $result['risk_score'], 'action' => $result['action'], 'rules' => $result['triggered_rules']];
            }
        }

        arsort($ruleHits);

        return [
            'scenario' => $scenario,
            'transactions' => $count,
            'outcomes' => $outcomes,
            'avg_risk_score' => $count ? round(array_sum($scores) / $count, 1) : 0,
            'max_risk_score' => $scores ? max($scores) : 0,
            'interception_rate' => $count ? round(($outcomes['hold'] + $outcomes['block'] + $outcomes['step_up_2fa']) / $count * 100, 1) : 0,
            'rule_hits' => $ruleHits,
            'samples' => $samples,
        ];
    }

    protected function bump(string $metric): void
    {
        $key = "tp:metric:{$metric}:" . now()->format('YmdHi');
        Cache::add($key, 0, 3600);
        Cache::increment($key);
    }
}
