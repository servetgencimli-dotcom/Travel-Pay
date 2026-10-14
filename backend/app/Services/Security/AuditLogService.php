<?php

namespace App\Services\Security;

use App\Models\AuditLog;
use App\Models\User;

class AuditLogService
{
    /**
     * Keys that should be masked/redacted in audit logs for privacy and cybersecurity.
     */
    protected static array $sensitiveKeys = [
        'password',
        'password_confirmation',
        'token',
        'access_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'cvv',
        'pin',
        'api_key',
    ];

    public function log(
        User|int|null $user,
        string $action,
        ?string $entityType = null,
        ?int $entityId = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $ip = null,
        ?string $userAgent = null
    ): AuditLog {
        $userId = $user instanceof User ? $user->id : $user;

        return AuditLog::create([
            'user_id' => $userId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'old_values' => $oldValues ? $this->maskSensitiveData($oldValues) : null,
            'new_values' => $newValues ? $this->maskSensitiveData($newValues) : null,
            'ip_address' => $ip,
            'user_agent' => $userAgent ? substr($userAgent, 0, 500) : null,
            'created_at' => now(),
        ]);
    }

    protected function maskSensitiveData(array $data): array
    {
        $sanitized = [];
        foreach ($data as $key => $value) {
            if (in_array(strtolower($key), self::$sensitiveKeys, true)) {
                $sanitized[$key] = '[REDACTED]';
            } elseif (is_array($value)) {
                $sanitized[$key] = $this->maskSensitiveData($value);
            } else {
                $sanitized[$key] = $value;
            }
        }

        return $sanitized;
    }
}
