<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\FraudAlertResource;
use App\Http\Resources\SecurityEventResource;
use App\Http\Resources\UserDeviceResource;
use App\Models\FraudAlert;
use App\Models\SecurityEvent;
use App\Models\User;
use App\Models\UserDevice;
use App\Services\Security\AuditLogService;
use App\Services\Security\SecurityAlertService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class SecurityController extends Controller
{
    public function events(Request $request): JsonResponse
    {
        $events = SecurityEvent::where('user_id', $request->user()->id)
            ->orderByDesc('id')
            ->paginate($request->input('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data' => SecurityEventResource::collection($events),
            'meta' => [
                'current_page' => $events->currentPage(),
                'last_page' => $events->lastPage(),
                'total' => $events->total(),
            ],
        ]);
    }

    public function alerts(Request $request): JsonResponse
    {
        $alerts = FraudAlert::where('user_id', $request->user()->id)
            ->orderByDesc('id')
            ->paginate($request->input('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data' => $alerts->items(),
            'meta' => [
                'current_page' => $alerts->currentPage(),
                'last_page' => $alerts->lastPage(),
                'total' => $alerts->total(),
            ],
        ]);
    }

    public function devices(Request $request): JsonResponse
    {
        $devices = UserDevice::where('user_id', $request->user()->id)
            ->orderByDesc('last_active_at')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => UserDeviceResource::collection($devices),
        ]);
    }

    public function revokeDevice(Request $request, int $id): JsonResponse
    {
        $device = UserDevice::where('user_id', $request->user()->id)->findOrFail($id);
        $device->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Device revoked successfully.',
        ]);
    }

    public function trustDevice(Request $request, int $id): JsonResponse
    {
        $request->validate(['is_trusted' => ['required', 'boolean']]);
        $device = UserDevice::where('user_id', $request->user()->id)->findOrFail($id);
        $device->update(['is_trusted' => $request->boolean('is_trusted')]);

        return $this->ok(new UserDeviceResource($device), $device->is_trusted ? 'Device marked as trusted.' : 'Device marked as untrusted.');
    }

    /**
     * Active API sessions (Sanctum tokens) so users can spot and kill unknown logins.
     */
    public function sessions(Request $request): JsonResponse
    {
        $currentId = $request->user()->currentAccessToken()?->id;

        return $this->ok($request->user()->tokens()->orderByDesc('last_used_at')->get()->map(fn ($t) => [
            'id' => $t->id,
            'name' => $t->name,
            'current' => $t->id === $currentId,
            'last_used_at' => $t->last_used_at?->toISOString(),
            'created_at' => $t->created_at?->toISOString(),
        ]));
    }

    public function revokeSession(Request $request, int $id): JsonResponse
    {
        $request->user()->tokens()->whereKey($id)->delete();

        return $this->ok(null, 'Session revoked.');
    }

    public function revokeOtherSessions(Request $request, SecurityAlertService $alerts): JsonResponse
    {
        $count = $request->user()->tokens()->where('id', '!=', $request->user()->currentAccessToken()?->id)->delete();
        $alerts->recordSecurityEvent($request->user(), 'sessions_revoked', 'low', $request->ip(), $request->userAgent(), metadata: ['count' => $count]);

        return $this->ok(['revoked' => $count], "Signed out of {$count} other session(s).");
    }

    public function changePassword(Request $request, SecurityAlertService $alerts, AuditLogService $audit): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $user = $request->user();
        if (!Hash::check($request->input('current_password'), $user->password)) {
            $alerts->recordSecurityEvent($user, 'password_change_failed', 'medium', $request->ip(), $request->userAgent());
            throw ValidationException::withMessages(['current_password' => ['Current password is incorrect.']]);
        }

        $user->update(['password' => Hash::make($request->input('password'))]);
        $user->tokens()->where('id', '!=', $user->currentAccessToken()?->id)->delete();

        $alerts->recordSecurityEvent($user, 'password_changed', 'info', $request->ip(), $request->userAgent());
        $audit->log($user, 'user.password_changed', User::class, $user->id, null, ['password' => 'changed'], $request->ip(), $request->userAgent());

        return $this->ok(null, 'Password changed. Other sessions were signed out.');
    }

    /**
     * Security posture score with an actionable checklist.
     */
    public function score(Request $request): JsonResponse
    {
        $user = $request->user();

        $highEvents = SecurityEvent::where('user_id', $user->id)
            ->whereIn('severity', ['high', 'critical'])
            ->where('created_at', '>=', now()->subDays(7))
            ->count();
        $untrusted = UserDevice::where('user_id', $user->id)->where('is_trusted', false)->count();
        $sessions = $user->tokens()->count();
        $openAlerts = FraudAlert::where('user_id', $user->id)->whereIn('status', ['new', 'investigating'])->count();

        $checks = [
            ['key' => '2fa', 'label' => 'Two-factor authentication enabled', 'ok' => (bool) $user->two_factor_enabled, 'weight' => 30],
            ['key' => 'kyc', 'label' => 'Identity verified (eKYC)', 'ok' => $user->isKycVerified(), 'weight' => 20],
            ['key' => 'events', 'label' => 'No high-severity security events in 7 days', 'ok' => $highEvents === 0, 'weight' => 20],
            ['key' => 'devices', 'label' => 'No untrusted devices', 'ok' => $untrusted === 0, 'weight' => 10],
            ['key' => 'sessions', 'label' => 'At most 3 active sessions', 'ok' => $sessions <= 3, 'weight' => 10],
            ['key' => 'alerts', 'label' => 'No open fraud alerts', 'ok' => $openAlerts === 0, 'weight' => 10],
        ];

        $score = collect($checks)->where('ok', true)->sum('weight');

        return $this->ok([
            'score' => $score,
            'grade' => $score >= 90 ? 'A' : ($score >= 70 ? 'B' : ($score >= 50 ? 'C' : 'D')),
            'checks' => $checks,
            'active_sessions' => $sessions,
        ]);
    }
}
