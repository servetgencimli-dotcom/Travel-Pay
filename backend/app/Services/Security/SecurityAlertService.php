<?php

namespace App\Services\Security;

use App\Models\FraudAlert;
use App\Models\SecurityEvent;
use App\Models\User;

class SecurityAlertService
{
    public function recordSecurityEvent(
        User|int|null $user,
        string $eventType,
        string $severity = 'info',
        ?string $ip = null,
        ?string $userAgent = null,
        ?int $deviceId = null,
        array $metadata = []
    ): SecurityEvent {
        $userId = $user instanceof User ? $user->id : $user;

        return SecurityEvent::create([
            'user_id' => $userId,
            'event_type' => $eventType,
            'severity' => $severity,
            'ip_address' => $ip,
            'user_agent' => $userAgent ? substr($userAgent, 0, 500) : null,
            'device_id' => $deviceId,
            'metadata' => !empty($metadata) ? $metadata : null,
            'created_at' => now(),
        ]);
    }

    public function createFraudAlert(
        User|int $user,
        string $title,
        string $severity = 'medium',
        int $riskScore = 50,
        ?string $description = null,
        ?int $transactionId = null,
        array $details = [],
        array $triggeredRules = []
    ): FraudAlert {
        $userId = $user instanceof User ? $user->id : $user;

        return FraudAlert::create([
            'user_id' => $userId,
            'transaction_id' => $transactionId,
            'severity' => $severity,
            'status' => 'new',
            'risk_score' => $riskScore,
            'title' => $title,
            'description' => $description,
            'details' => $details,
            'triggered_rules' => $triggeredRules,
        ]);
    }
}
