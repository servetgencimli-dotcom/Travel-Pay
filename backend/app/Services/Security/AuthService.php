<?php

namespace App\Services\Security;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletBalance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function __construct(
        protected AuditLogService $auditLogService,
        protected SecurityAlertService $securityAlertService,
        protected DeviceMonitoringService $deviceMonitoringService
    ) {}

    public function register(array $data, Request $request): array
    {
        return DB::transaction(function () use ($data, $request) {
            $user = User::create([
                'name' => $data['name'],
                'email' => strtolower($data['email']),
                'phone' => $data['phone'] ?? null,
                'password' => Hash::make($data['password']),
                'role' => $data['role'] ?? 'user',
                'status' => 'active',
                'last_login_at' => now(),
                'last_login_ip' => $request->ip(),
            ]);

            // Automatically create a digital wallet for the user
            $walletNumber = 'TP' . mt_rand(100000000000, 999999999999);
            $wallet = Wallet::create([
                'user_id' => $user->id,
                'wallet_number' => $walletNumber,
                'status' => 'active',
            ]);

            // Seed initial balances for primary currencies: AZN, EUR, USD
            $currencies = ['AZN', 'EUR', 'USD'];
            foreach ($currencies as $currency) {
                WalletBalance::create([
                    'wallet_id' => $wallet->id,
                    'currency_code' => $currency,
                    'balance' => 0.0000,
                    'locked_balance' => 0.0000,
                ]);
            }

            // Track device
            $device = $this->deviceMonitoringService->trackDevice($user, $request);

            // Record security & audit logs
            $this->securityAlertService->recordSecurityEvent(
                user: $user,
                eventType: 'user_registered',
                severity: 'info',
                ip: $request->ip(),
                userAgent: $request->userAgent(),
                deviceId: $device->id,
                metadata: ['wallet_number' => $walletNumber]
            );

            $this->auditLogService->log(
                user: $user,
                action: 'user.registered',
                entityType: User::class,
                entityId: $user->id,
                oldValues: null,
                newValues: [
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ],
                ip: $request->ip(),
                userAgent: $request->userAgent()
            );

            $token = $user->createToken('travelpay_access_token')->plainTextToken;

            return [
                'user' => $user->load('wallet.balances'),
                'token' => $token,
                'token_type' => 'Bearer',
            ];
        });
    }

    public function login(array $credentials, Request $request): array
    {
        $user = User::where('email', strtolower($credentials['email']))->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            $this->securityAlertService->recordSecurityEvent(
                user: $user?->id,
                eventType: 'login_failed',
                severity: 'low',
                ip: $request->ip(),
                userAgent: $request->userAgent(),
                metadata: ['attempted_email' => $credentials['email']]
            );

            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        if (!$user->isActive()) {
            $this->securityAlertService->recordSecurityEvent(
                user: $user,
                eventType: 'login_blocked_inactive',
                severity: 'medium',
                ip: $request->ip(),
                userAgent: $request->userAgent(),
                metadata: ['status' => $user->status]
            );

            throw ValidationException::withMessages([
                'email' => ['Your account has been ' . $user->status . '. Please contact support.'],
            ]);
        }

        // Two-Factor Authentication Check
        if ($user->two_factor_enabled) {
            $twoFactorCode = $request->input('two_factor_code');
            if (!$twoFactorCode) {
                return [
                    'requires_two_factor' => true,
                    'message' => 'Two-factor authentication code is required.',
                ];
            }

            if (!$this->verifyTwoFactorCode($user, $twoFactorCode)) {
                $this->securityAlertService->recordSecurityEvent(
                    user: $user,
                    eventType: '2fa_failed',
                    severity: 'medium',
                    ip: $request->ip(),
                    userAgent: $request->userAgent()
                );

                throw ValidationException::withMessages([
                    'two_factor_code' => ['Invalid two-factor authentication code.'],
                ]);
            }
        }

        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ]);

        $device = $this->deviceMonitoringService->trackDevice($user, $request);

        $this->securityAlertService->recordSecurityEvent(
            user: $user,
            eventType: 'login_success',
            severity: 'info',
            ip: $request->ip(),
            userAgent: $request->userAgent(),
            deviceId: $device->id
        );

        $this->auditLogService->log(
            user: $user,
            action: 'user.login',
            entityType: User::class,
            entityId: $user->id,
            oldValues: null,
            newValues: ['ip' => $request->ip()],
            ip: $request->ip(),
            userAgent: $request->userAgent()
        );

        $token = $user->createToken('travelpay_access_token')->plainTextToken;

        return [
            'requires_two_factor' => false,
            'user' => $user->load('wallet.balances'),
            'token' => $token,
            'token_type' => 'Bearer',
        ];
    }

    public function logout(User $user, Request $request): void
    {
        $user->currentAccessToken()?->delete();

        $this->securityAlertService->recordSecurityEvent(
            user: $user,
            eventType: 'logout',
            severity: 'info',
            ip: $request->ip(),
            userAgent: $request->userAgent()
        );

        $this->auditLogService->log(
            user: $user,
            action: 'user.logout',
            entityType: User::class,
            entityId: $user->id,
            ip: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    public function enableTwoFactor(User $user): array
    {
        $secret = strtoupper(Str::random(16));
        $recoveryCodes = collect(range(1, 8))->map(fn () => Str::random(10))->all();

        $user->update([
            'two_factor_secret' => encrypt($secret),
            'two_factor_recovery_codes' => encrypt(json_encode($recoveryCodes)),
        ]);

        return [
            'secret' => $secret,
            'recovery_codes' => $recoveryCodes,
        ];
    }

    public function confirmTwoFactor(User $user, string $code): bool
    {
        if ($this->verifyTwoFactorCode($user, $code)) {
            $user->update([
                'two_factor_enabled' => true,
                'two_factor_confirmed_at' => now(),
            ]);

            $this->securityAlertService->recordSecurityEvent(
                user: $user,
                eventType: '2fa_enabled',
                severity: 'info'
            );

            return true;
        }

        return false;
    }

    public function disableTwoFactor(User $user): void
    {
        $user->update([
            'two_factor_enabled' => false,
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ]);

        $this->securityAlertService->recordSecurityEvent(
            user: $user,
            eventType: '2fa_disabled',
            severity: 'low'
        );
    }

    protected function verifyTwoFactorCode(User $user, string $code): bool
    {
        if (!$user->two_factor_secret) {
            return false;
        }

        // Demo/Simulated 2FA verification: accepts '123456' as master bypass for sandbox testing,
        // or check against stored recovery codes
        if ($code === '123456') {
            return true;
        }

        if ($user->two_factor_recovery_codes) {
            try {
                $recoveryCodes = json_decode(decrypt($user->two_factor_recovery_codes), true);
                if (is_array($recoveryCodes) && in_array($code, $recoveryCodes, true)) {
                    // Remove used recovery code
                    $updatedCodes = array_values(array_diff($recoveryCodes, [$code]));
                    $user->update(['two_factor_recovery_codes' => encrypt(json_encode($updatedCodes))]);
                    return true;
                }
            } catch (\Exception $e) {
                // Decryption error
            }
        }

        return false;
    }
}
