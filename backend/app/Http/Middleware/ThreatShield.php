<?php

namespace App\Http\Middleware;

use App\Services\Security\ThreatMonitorService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Edge protection for the API: IP blocklist, per-IP rate shield (DDoS) and a small
 * signature-based WAF for injection / malware payloads. Also sets security headers.
 */
class ThreatShield
{
    /** Fields never inspected (passwords legitimately contain any characters). */
    protected const SKIP_KEYS = ['password', 'password_confirmation', 'current_password', 'new_password'];

    protected const SIGNATURES = [
        'sql_injection' => [
            '/\bunion\b\s+(all\s+)?select\b/i',
            '/\b(or|and)\b\s+[\'"]?\d+[\'"]?\s*=\s*[\'"]?\d+/i',
            '/;\s*(drop|delete|truncate|alter)\s+table\b/i',
            '/\bsleep\s*\(\s*\d+\s*\)/i',
        ],
        'xss' => [
            '/<\s*script\b/i',
            '/javascript\s*:/i',
            '/\bon(error|load|mouseover|click)\s*=/i',
        ],
        'path_traversal' => [
            '/\.\.[\/\\\\]/',
        ],
        'remote_code' => [
            '/\$\{jndi:/i',
            '/;\s*(rm\s+-rf|wget\s+http|curl\s+http|nc\s+-e)/i',
            '/\b(eval|base64_decode|system|shell_exec)\s*\(/i',
        ],
    ];

    public function __construct(
        protected ThreatMonitorService $monitor
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $ip = (string) $request->ip();

        if ($this->monitor->isBlocked($ip)) {
            $this->monitor->registerBlockedHit($ip);

            return $this->deny('Access from your network has been temporarily blocked by TravelPay Threat Shield.', 403, 'ip_blocked');
        }

        $count = $this->monitor->countRequest($ip);
        if ($count > config('travelpay.security.ddos_requests_per_minute')) {
            $this->monitor->autoBlock($ip, $count, $request);

            return $this->deny('Too many requests — traffic pattern looks like a DDoS attack. Try again later.', 429, 'ddos_shield');
        }

        if ($threat = $this->inspect($request->except(self::SKIP_KEYS))) {
            $this->monitor->recordMaliciousPayload($ip, $threat, $request);

            return $this->deny('Request rejected by TravelPay WAF: potentially malicious content detected.', 422, 'waf_blocked');
        }

        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(self)');
        $response->headers->set('X-TravelPay-Shield', 'active');

        return $response;
    }

    /**
     * @return array{type: string, field: string}|null
     */
    protected function inspect(array $input, string $prefix = ''): ?array
    {
        foreach ($input as $key => $value) {
            $field = $prefix === '' ? (string) $key : "{$prefix}.{$key}";

            if (is_array($value)) {
                if ($hit = $this->inspect($value, $field)) {
                    return $hit;
                }
                continue;
            }

            if (!is_string($value) || $value === '') {
                continue;
            }

            foreach (self::SIGNATURES as $type => $patterns) {
                foreach ($patterns as $pattern) {
                    if (preg_match($pattern, $value)) {
                        return ['type' => $type, 'field' => $field];
                    }
                }
            }
        }

        return null;
    }

    protected function deny(string $message, int $status, string $code): Response
    {
        return response()->json([
            'status' => 'error',
            'error_code' => $code,
            'message' => $message,
        ], $status);
    }
}
