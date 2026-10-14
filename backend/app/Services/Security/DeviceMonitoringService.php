<?php

namespace App\Services\Security;

use App\Models\User;
use App\Models\UserDevice;
use Illuminate\Http\Request;

class DeviceMonitoringService
{
    public function __construct(
        protected SecurityAlertService $securityAlertService,
        protected AuditLogService $auditLogService
    ) {}

    public function trackDevice(User $user, Request $request): UserDevice
    {
        $deviceUuid = $request->header('X-Device-Id') ?? $request->input('device_uuid') ?? md5($request->userAgent() . $user->id);
        $deviceName = $request->header('X-Device-Name') ?? $request->input('device_name') ?? $this->parseDeviceName($request->userAgent());
        $deviceType = $request->header('X-Device-Type') ?? $request->input('device_type') ?? $this->detectDeviceType($request->userAgent());
        $os = $request->header('X-Device-OS') ?? $request->input('os') ?? $this->detectOS($request->userAgent());
        $ip = $request->ip();

        $device = UserDevice::where('user_id', $user->id)
            ->where('device_uuid', $deviceUuid)
            ->first();

        if ($device) {
            $device->update([
                'ip_address' => $ip,
                'last_active_at' => now(),
                'device_name' => $deviceName ?: $device->device_name,
            ]);
        } else {
            // New device detected!
            $device = UserDevice::create([
                'user_id' => $user->id,
                'device_uuid' => $deviceUuid,
                'device_name' => $deviceName,
                'device_type' => $deviceType,
                'os' => $os,
                'ip_address' => $ip,
                'last_active_at' => now(),
                'is_trusted' => true,
            ]);

            // Log security event for new device login
            $this->securityAlertService->recordSecurityEvent(
                user: $user,
                eventType: 'new_device_registered',
                severity: 'low',
                ip: $ip,
                userAgent: $request->userAgent(),
                deviceId: $device->id,
                metadata: [
                    'device_uuid' => $deviceUuid,
                    'device_name' => $deviceName,
                    'os' => $os,
                ]
            );

            $this->auditLogService->log(
                user: $user,
                action: 'device.registered',
                entityType: UserDevice::class,
                entityId: $device->id,
                oldValues: null,
                newValues: [
                    'device_name' => $deviceName,
                    'device_type' => $deviceType,
                    'os' => $os,
                ],
                ip: $ip,
                userAgent: $request->userAgent()
            );
        }

        return $device;
    }

    protected function detectDeviceType(?string $userAgent): string
    {
        if (!$userAgent) {
            return 'mobile';
        }
        $ua = strtolower($userAgent);
        if (str_contains($ua, 'tablet') || str_contains($ua, 'ipad')) {
            return 'tablet';
        }
        if (str_contains($ua, 'mobile') || str_contains($ua, 'android') || str_contains($ua, 'iphone')) {
            return 'mobile';
        }
        return 'desktop';
    }

    protected function detectOS(?string $userAgent): string
    {
        if (!$userAgent) {
            return 'Unknown';
        }
        $ua = strtolower($userAgent);
        if (str_contains($ua, 'iphone') || str_contains($ua, 'ipad') || str_contains($ua, 'ios')) {
            return 'iOS';
        }
        if (str_contains($ua, 'android')) {
            return 'Android';
        }
        if (str_contains($ua, 'windows')) {
            return 'Windows';
        }
        if (str_contains($ua, 'macintosh') || str_contains($ua, 'mac os')) {
            return 'macOS';
        }
        if (str_contains($ua, 'linux')) {
            return 'Linux';
        }
        return 'Unknown';
    }

    protected function parseDeviceName(?string $userAgent): string
    {
        $os = $this->detectOS($userAgent);
        $type = ucfirst($this->detectDeviceType($userAgent));
        return "{$os} {$type}";
    }
}
