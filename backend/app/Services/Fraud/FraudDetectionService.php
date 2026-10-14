<?php

namespace App\Services\Fraud;

use App\Models\FraudRule;
use App\Models\SecurityEvent;
use App\Models\Transaction;
use App\Models\TransactionRiskAssessment;
use App\Models\User;
use App\Models\UserDevice;
use App\Services\Security\SecurityAlertService;
use App\Services\Wallet\ExchangeRateService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Rule-based 0-100 risk scoring for every outgoing money movement.
 */
class FraudDetectionService
{
    /** Severity order of rule actions — the most severe triggered action wins. */
    protected const ACTION_PRIORITY = ['allow' => 0, 'flag' => 1, 'step_up_2fa' => 2, 'hold' => 3, 'block' => 4];

    public function __construct(
        protected ExchangeRateService $rates,
        protected SecurityAlertService $securityAlertService
    ) {}

    /**
     * Gather the live context for a user and evaluate all active rules against it.
     */
    public function assess(User $user, string|float $amount, string $currency, string $type, ?Request $request = null): array
    {
        $context = [
            'type' => $type,
            'amount' => (string) $amount,
            'currency' => strtoupper($currency),
            'amount_azn' => (float) $this->rates->toAzn($amount, $currency),
            'velocity_10m' => Transaction::where('user_id', $user->id)
                ->where('created_at', '>=', now()->subMinutes(10))
                ->count() + 1,
            'device_status' => $this->deviceStatus($user, $request),
            'failed_logins_1h' => SecurityEvent::where('user_id', $user->id)
                ->where('event_type', 'login_failed')
                ->where('created_at', '>=', now()->subHour())
                ->count(),
        ];

        return $this->evaluate($context, $this->activeRules());
    }

    /**
     * Pure rule evaluation — also used by the admin risk sandbox, so it never touches the database.
     */
    public function evaluate(array $context, Collection $rules): array
    {
        $score = 0;
        $action = 'allow';
        $triggered = [];
        $factors = [];

        foreach ($rules as $rule) {
            $observed = match ($rule->rule_type) {
                'threshold' => $context['amount_azn'],
                'velocity' => $context['velocity_10m'],
                'device' => $context['device_status'],
                'pattern' => $context['failed_logins_1h'],
                default => null,
            };

            if ($observed === null || !$this->compare($observed, $rule->condition_operator, $rule->threshold_value)) {
                continue;
            }

            $score += $rule->risk_weight;
            $triggered[] = $rule->rule_code;
            $factors[] = [
                'rule' => $rule->rule_code,
                'name' => $rule->rule_name,
                'observed' => $observed,
                'threshold' => "{$rule->condition_operator} {$rule->threshold_value}",
                'weight' => $rule->risk_weight,
                'action' => $rule->action,
            ];

            if (self::ACTION_PRIORITY[$rule->action] > self::ACTION_PRIORITY[$action]) {
                $action = $rule->action;
            }
        }

        $score = min(100, $score);

        // Very high aggregate risk is always held, even if no single rule asked for it.
        if ($score >= 80 && self::ACTION_PRIORITY[$action] < self::ACTION_PRIORITY['hold']) {
            $action = 'hold';
        }

        return [
            'risk_score' => $score,
            'risk_level' => $score >= 60 ? 'high' : ($score >= 30 ? 'medium' : 'low'),
            'action' => $action,
            'triggered_rules' => $triggered,
            'factors' => $factors,
            'context' => $context,
        ];
    }

    /**
     * Persist the assessment against the transaction and raise a fraud alert when warranted.
     */
    public function record(Transaction $transaction, array $assessment): void
    {
        $transaction->update(['risk_score' => $assessment['risk_score']]);

        TransactionRiskAssessment::create([
            'transaction_id' => $transaction->id,
            'user_id' => $transaction->user_id,
            'risk_score' => $assessment['risk_score'],
            'risk_level' => $assessment['risk_level'],
            'factors' => $assessment['factors'],
            'recommended_action' => match ($assessment['action']) {
                'step_up_2fa' => 'challenge',
                'hold' => 'hold',
                'block' => 'block',
                default => 'allow',
            },
            'is_resolved' => !in_array($assessment['action'], ['hold'], true),
            'created_at' => now(),
        ]);

        if ($assessment['risk_score'] < 40 && !in_array($assessment['action'], ['hold', 'block'], true)) {
            return;
        }

        $score = $assessment['risk_score'];
        $this->securityAlertService->createFraudAlert(
            user: $transaction->user_id,
            title: match ($assessment['action']) {
                'block' => 'Transaction blocked by risk engine',
                'hold' => 'Transaction held for manual review',
                'step_up_2fa' => 'High-value transaction required 2FA step-up',
                default => 'Suspicious transaction pattern detected',
            },
            severity: $score >= 75 ? 'critical' : ($score >= 60 ? 'high' : ($score >= 40 ? 'medium' : 'low')),
            riskScore: $score,
            description: sprintf(
                '%s of %s %s scored %d/100 (%s).',
                ucfirst(str_replace('_', ' ', $transaction->type)),
                number_format((float) $transaction->amount, 2),
                $transaction->currency_code,
                $score,
                implode(', ', $assessment['triggered_rules']) ?: 'aggregate risk'
            ),
            transactionId: $transaction->id,
            details: $assessment['context'],
            triggeredRules: $assessment['triggered_rules']
        );
    }

    public function activeRules(): Collection
    {
        return FraudRule::where('is_active', true)->orderBy('id')->get();
    }

    /**
     * 'untrusted' when the request comes from an untrusted device, or from a device first seen in
     * the last hour on an account that already had other devices.
     */
    protected function deviceStatus(User $user, ?Request $request): string
    {
        if (!$request) {
            return 'trusted';
        }

        $uuid = $request->header('X-Device-Id') ?? md5($request->userAgent() . $user->id);
        $device = UserDevice::where('user_id', $user->id)->where('device_uuid', $uuid)->first();

        if (!$device) {
            return 'untrusted';
        }

        if (!$device->is_trusted) {
            return 'untrusted';
        }

        $isFresh = $device->created_at?->gt(now()->subHour());
        $hasOlderDevices = UserDevice::where('user_id', $user->id)->where('id', '!=', $device->id)->exists();

        return $isFresh && $hasOlderDevices ? 'untrusted' : 'trusted';
    }

    protected function compare(mixed $observed, string $operator, string $threshold): bool
    {
        if (is_string($observed)) {
            return match ($operator) {
                '==' => $observed === $threshold,
                '!=' => $observed !== $threshold,
                'in' => in_array($observed, array_map('trim', explode(',', $threshold)), true),
                default => false,
            };
        }

        $t = (float) $threshold;

        return match ($operator) {
            '>' => $observed > $t,
            '>=' => $observed >= $t,
            '<' => $observed < $t,
            '<=' => $observed <= $t,
            '==' => $observed == $t,
            '!=' => $observed != $t,
            default => false,
        };
    }
}
