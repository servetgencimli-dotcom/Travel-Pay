<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\SecurityEvent;
use App\Models\User;
use App\Models\UserDevice;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receives_token_and_wallet(): void
    {
        $payload = [
            'name' => 'Rashad Aliyev',
            'email' => 'rashad@travelpay.com',
            'phone' => '+994509998877',
            'password' => 'SecurePass2026!',
            'password_confirmation' => 'SecurePass2026!',
            'device_uuid' => 'test-device-uuid-1',
            'device_name' => 'iPhone 15 Pro',
            'device_type' => 'mobile',
            'os' => 'iOS',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'user' => [
                        'id',
                        'name',
                        'email',
                        'phone',
                        'role',
                        'status',
                        'wallet' => [
                            'id',
                            'wallet_number',
                            'balances' => [
                                '*' => ['id', 'currency_code', 'balance', 'available_balance']
                            ]
                        ]
                    ],
                    'token',
                    'token_type',
                ]
            ]);

        // Assert database records
        $this->assertDatabaseHas('users', [
            'email' => 'rashad@travelpay.com',
            'role' => 'user',
            'status' => 'active',
        ]);

        $user = User::where('email', 'rashad@travelpay.com')->first();
        $this->assertNotNull($user);

        // Assert Wallet was automatically created
        $wallet = Wallet::where('user_id', $user->id)->first();
        $this->assertNotNull($wallet);
        $this->assertStringStartsWith('TP', $wallet->wallet_number);

        // Assert multi-currency balances: AZN, EUR, USD
        $this->assertDatabaseHas('wallet_balances', ['wallet_id' => $wallet->id, 'currency_code' => 'AZN']);
        $this->assertDatabaseHas('wallet_balances', ['wallet_id' => $wallet->id, 'currency_code' => 'EUR']);
        $this->assertDatabaseHas('wallet_balances', ['wallet_id' => $wallet->id, 'currency_code' => 'USD']);

        // Assert Device was registered
        $this->assertDatabaseHas('user_devices', [
            'user_id' => $user->id,
            'device_uuid' => 'test-device-uuid-1',
        ]);

        // Assert Security Event and Audit Log were created
        $this->assertDatabaseHas('security_events', [
            'user_id' => $user->id,
            'event_type' => 'user_registered',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'user.registered',
        ]);
    }

    public function test_user_registration_requires_valid_data(): void
    {
        $response = $this->postJson('/api/v1/auth/register', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'login_test@travelpay.com',
            'password' => bcrypt('ValidPass123!'),
            'status' => 'active',
        ]);

        Wallet::create([
            'user_id' => $user->id,
            'wallet_number' => 'TP123456789012',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'login_test@travelpay.com',
            'password' => 'ValidPass123!',
            'device_uuid' => 'login-device-1',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'user' => ['id', 'email'],
                    'token',
                    'token_type',
                ]
            ]);

        $this->assertDatabaseHas('security_events', [
            'user_id' => $user->id,
            'event_type' => 'login_success',
        ]);
    }

    public function test_user_cannot_login_with_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'wrong_pw@travelpay.com',
            'password' => bcrypt('CorrectPassword123!'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'wrong_pw@travelpay.com',
            'password' => 'IncorrectPass!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        $this->assertDatabaseHas('security_events', [
            'event_type' => 'login_failed',
        ]);
    }

    public function test_authenticated_user_can_access_me_endpoint(): void
    {
        $user = User::factory()->create([
            'email' => 'me_test@travelpay.com',
        ]);

        $wallet = Wallet::create([
            'user_id' => $user->id,
            'wallet_number' => 'TP987654321012',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'email' => $user->email,
                    ]
                ]
            ]);
    }

    public function test_unauthenticated_user_cannot_access_protected_endpoints(): void
    {
        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(401);
    }

    public function test_user_can_logout_and_revoke_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/auth/logout');

        $response->assertStatus(200)
            ->assertJson(['status' => 'success']);

        $this->assertCount(0, $user->fresh()->tokens);
    }

    public function test_user_can_setup_and_confirm_two_factor_auth(): void
    {
        $user = User::factory()->create();

        // 1. Enable 2FA
        $enableResponse = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/auth/2fa/enable');

        $enableResponse->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => ['secret', 'recovery_codes']
            ]);

        // 2. Confirm 2FA with demo OTP code
        $confirmResponse = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/auth/2fa/confirm', [
                'code' => '123456',
            ]);

        $confirmResponse->assertStatus(200);
        $this->assertTrue($user->fresh()->two_factor_enabled);
    }

    public function test_security_events_and_devices_endpoints(): void
    {
        $user = User::factory()->create();

        $device = UserDevice::create([
            'user_id' => $user->id,
            'device_uuid' => 'dev-uuid-123',
            'device_name' => 'Test Phone',
            'device_type' => 'mobile',
            'is_trusted' => true,
        ]);

        SecurityEvent::create([
            'user_id' => $user->id,
            'event_type' => 'test_security_event',
            'severity' => 'info',
            'ip_address' => '127.0.0.1',
        ]);

        $eventsResponse = $this->actingAs($user, 'sanctum')->getJson('/api/v1/security/events');
        $eventsResponse->assertStatus(200)
            ->assertJsonPath('data.0.event_type', 'test_security_event');

        $devicesResponse = $this->actingAs($user, 'sanctum')->getJson('/api/v1/security/devices');
        $devicesResponse->assertStatus(200)
            ->assertJsonPath('data.0.device_uuid', 'dev-uuid-123');

        $revokeResponse = $this->actingAs($user, 'sanctum')->deleteJson('/api/v1/security/devices/' . $device->id);
        $revokeResponse->assertStatus(200);

        $this->assertDatabaseMissing('user_devices', ['id' => $device->id]);
    }
}
