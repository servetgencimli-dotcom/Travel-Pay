<?php

namespace Tests\Feature;

use App\Models\FraudAlert;
use App\Models\LedgerEntry;
use App\Models\Merchant;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Security\ThreatMonitorService;
use App\Services\Wallet\LedgerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TravelPayFlowsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed inside each test's transaction: $seed only applies when this class migrates first.
        $this->seed();
    }

    protected function elvin(): User
    {
        return User::where('email', 'elvin@travelpay.com')->first();
    }

    protected function aysel(): User
    {
        return User::where('email', 'aysel@travelpay.com')->first();
    }

    protected function balance(User $user, string $currency): float
    {
        return (float) $user->wallet()->first()->balances()->where('currency_code', $currency)->value('balance');
    }

    public function test_demo_seed_produces_balanced_ledger_and_activity(): void
    {
        $this->assertGreaterThan(5, Transaction::where('user_id', $this->elvin()->id)->count());

        foreach (app(LedgerService::class)->trialBalance() as $row) {
            $this->assertTrue($row['balanced'], "Ledger unbalanced for {$row['currency_code']}");
        }

        Sanctum::actingAs($this->elvin());
        $this->getJson('/api/v1/wallet/summary')
            ->assertOk()
            ->assertJsonStructure(['data' => ['balances', 'net_worth_azn', 'recent_transactions', 'rates']]);
        $this->getJson('/api/v1/insights')->assertOk()->assertJsonPath('data.period_days', 30);
        $this->getJson('/api/v1/trips')->assertOk()->assertJsonPath('data.0.title', 'Baku Discovery Week');
    }

    public function test_p2p_transfer_moves_money_and_posts_ledger(): void
    {
        $elvin = $this->elvin();
        $aysel = $this->aysel();
        $before = [$this->balance($elvin, 'USD'), $this->balance($aysel, 'USD')];

        Sanctum::actingAs($elvin);
        $response = $this->postJson('/api/v1/wallet/transfer', [
            'recipient' => $aysel->wallet->wallet_number,
            'amount' => 50,
            'currency' => 'USD',
            'note' => 'Coffee',
        ])->assertCreated()->assertJsonPath('data.status', 'completed');

        $this->assertEquals($before[0] - 50, $this->balance($elvin, 'USD'));
        $this->assertEquals($before[1] + 50, $this->balance($aysel, 'USD'));

        $tx = Transaction::where('reference_number', $response->json('data.reference'))->first();
        $this->assertSame(2, LedgerEntry::where('transaction_id', $tx->id)->count());
    }

    public function test_critical_amount_is_held_then_approved_by_admin(): void
    {
        $aysel = $this->aysel();
        $admin = User::where('email', 'admin@travelpay.com')->first();
        $before = $this->balance($admin, 'AZN');

        Sanctum::actingAs($admin);
        $response = $this->postJson('/api/v1/wallet/transfer', [
            'recipient' => $aysel->email,
            'amount' => 6000,
            'currency' => 'AZN',
        ])->assertStatus(202)->assertJsonPath('data.status', 'held_for_review');

        $tx = Transaction::where('reference_number', $response->json('data.reference'))->first();
        $this->assertTrue(FraudAlert::where('transaction_id', $tx->id)->exists());
        $this->assertEquals($before, $this->balance($admin, 'AZN'));

        $ayselBefore = $this->balance($aysel, 'AZN');
        $this->postJson("/api/v1/admin/transactions/{$tx->id}/approve")->assertOk();

        $this->assertEquals($before - 6000, $this->balance($admin, 'AZN'));
        $this->assertEquals($ayselBefore + 6000, $this->balance($aysel, 'AZN'));
        $this->assertSame('completed', $tx->fresh()->status);

        // A second approval must not settle the money again.
        $this->postJson("/api/v1/admin/transactions/{$tx->id}/approve")->assertStatus(422);
        $this->assertEquals($ayselBefore + 6000, $this->balance($aysel, 'AZN'));
    }

    public function test_admin_cannot_change_own_status_and_suspension_revokes_tokens(): void
    {
        $admin = User::where('email', 'admin@travelpay.com')->first();
        $aysel = $this->aysel();
        $aysel->createToken('phone');

        Sanctum::actingAs($admin);
        $this->patchJson("/api/v1/admin/users/{$admin->id}/status", ['status' => 'suspended'])->assertStatus(422);
        $this->assertSame('active', $admin->fresh()->status);

        $this->patchJson("/api/v1/admin/users/{$aysel->id}/status", ['status' => 'suspended'])->assertOk();
        $this->assertSame(0, $aysel->tokens()->count());
    }

    public function test_demo_otp_is_rejected_when_disabled(): void
    {
        $elvin = $this->elvin();
        $elvin->update(['two_factor_secret' => encrypt('SECRET')]);
        $auth = app(\App\Services\Security\AuthService::class);

        $this->assertTrue($auth->verifyTwoFactorCode($elvin, '123456'));
        config(['travelpay.security.demo_otp_enabled' => false]);
        $this->assertFalse($auth->verifyTwoFactorCode($elvin, '123456'));
    }

    public function test_unverified_user_is_limited_and_kyc_unlocks(): void
    {
        $aysel = $this->aysel();
        Sanctum::actingAs($aysel);

        $this->postJson('/api/v1/wallet/transfer', ['recipient' => 'elvin@travelpay.com', 'amount' => 1500, 'currency' => 'USD'])
            ->assertStatus(403)
            ->assertJsonPath('error_code', 'kyc_required');

        $this->postJson('/api/v1/kyc', [
            'document_type' => 'passport',
            'document_number' => 'C01234567',
            'nationality' => 'AZ',
            'date_of_birth' => '2001-01-01',
            'selfie_confirmed' => true,
        ])->assertCreated()->assertJsonPath('data.status', 'verified');
    }

    public function test_exchange_charges_fee_and_converts(): void
    {
        $elvin = $this->elvin();
        $eur = $this->balance($elvin, 'EUR');
        $azn = $this->balance($elvin, 'AZN');

        Sanctum::actingAs($elvin);
        $this->postJson('/api/v1/wallet/exchange', ['amount' => 100, 'from' => 'EUR', 'to' => 'AZN'])->assertCreated();

        $this->assertEquals($eur - 100, $this->balance($elvin, 'EUR'));
        $this->assertEqualsWithDelta($azn + 99.5 * 1.85, $this->balance($elvin, 'AZN'), 0.01);
    }

    public function test_merchant_qr_payment_gives_cashback_and_tracks_trip_expense(): void
    {
        $elvin = $this->elvin();
        $merchant = Merchant::where('merchant_code', 'MRC-SHIRVANSHAH')->first();
        $token = $merchant->paymentRequests()->whereNull('amount')->value('qr_code_token');
        $azn = $this->balance($elvin, 'AZN');

        Sanctum::actingAs($elvin);
        $this->getJson("/api/v1/payments/qr/travelpay://pay/{$token}")->assertOk()->assertJsonPath('data.payee', $merchant->merchant_name);

        $this->postJson("/api/v1/payments/qr/{$token}/pay", ['amount' => 20])
            ->assertCreated()
            ->assertJsonPath('data.cashback', 1);

        $this->assertEqualsWithDelta($azn - 20 + 1, $this->balance($elvin, 'AZN'), 0.001);
        $this->assertDatabaseHas('travel_expenses', ['user_id' => $elvin->id, 'amount' => 20]);
    }

    public function test_personal_payment_request_flow(): void
    {
        Sanctum::actingAs($this->aysel());
        $token = $this->postJson('/api/v1/payments/requests', ['amount' => 30, 'currency' => 'AZN', 'description' => 'Tickets'])
            ->assertCreated()->json('data.token');

        Sanctum::actingAs($this->elvin());
        $this->postJson("/api/v1/payments/qr/{$token}/pay")->assertCreated();
        $this->postJson("/api/v1/payments/qr/{$token}/pay")->assertStatus(422)->assertJsonPath('error_code', 'qr_inactive');
    }

    public function test_crypto_buy_and_hotel_booking_with_crypto_then_cancel(): void
    {
        Sanctum::actingAs($this->elvin());

        $this->postJson('/api/v1/crypto/buy', ['asset' => 'USDT', 'amount_azn' => 900])->assertCreated();
        $units = $this->getJson('/api/v1/crypto/portfolio')->assertOk()->json('data.holdings.0.amount');
        $this->assertGreaterThan(500, $units);

        $booking = $this->postJson('/api/v1/bookings', [
            'catalog_code' => 'HTL-SHEKI',
            'start_date' => now()->addDays(21)->toDateString(),
            'quantity' => 2,
            'payment_method' => 'crypto',
            'crypto_asset' => 'USDT',
        ])->assertCreated()->json('data');

        $this->assertSame('crypto', $booking['payment_method']);
        $this->postJson("/api/v1/bookings/{$booking['id']}/cancel")->assertOk()->assertJsonPath('data.status', 'cancelled');
        $this->assertEqualsWithDelta($units, $this->getJson('/api/v1/crypto/portfolio')->json('data.holdings.0.amount'), 0.0001);
    }

    public function test_virtual_card_enforces_freeze_and_limits(): void
    {
        Sanctum::actingAs($this->elvin());

        $card = $this->postJson('/api/v1/cards', ['currency' => 'AZN', 'spending_limit' => 100])->assertCreated()->json('data');
        $charge = ['merchant' => 'Baku Coffee', 'amount' => 40, 'category' => 'Restaurants'];

        $this->postJson("/api/v1/cards/{$card['id']}/charge", $charge)->assertCreated();
        $this->postJson("/api/v1/cards/{$card['id']}/charge", array_merge($charge, ['amount' => 70]))
            ->assertStatus(422)->assertJsonPath('error_code', 'card_declined');

        $this->patchJson("/api/v1/cards/{$card['id']}", ['status' => 'frozen'])->assertOk();
        $this->postJson("/api/v1/cards/{$card['id']}/charge", $charge)->assertStatus(422);
    }

    public function test_frozen_wallet_blocks_payments(): void
    {
        Sanctum::actingAs($this->elvin());
        $this->postJson('/api/v1/wallet/freeze')->assertOk();
        $this->postJson('/api/v1/wallet/transfer', ['recipient' => 'aysel@travelpay.com', 'amount' => 5, 'currency' => 'AZN'])
            ->assertStatus(403)->assertJsonPath('error_code', 'wallet_frozen');
        $this->postJson('/api/v1/wallet/unfreeze', ['password' => 'Password123!'])->assertOk();
    }

    public function test_waf_blocks_injection_and_blocklist_denies_ip(): void
    {
        Sanctum::actingAs($this->elvin());
        $this->postJson('/api/v1/wallet/recipient-lookup', ['query' => "x' OR 1=1 --"])
            ->assertStatus(422)->assertJsonPath('error_code', 'waf_blocked');
        $this->assertDatabaseHas('security_events', ['event_type' => 'malicious_payload_blocked']);

        app(ThreatMonitorService::class)->block('127.0.0.1', 'test', 10, null);
        $this->getJson('/api/v1/wallet/summary')->assertStatus(403)->assertJsonPath('error_code', 'ip_blocked');
    }

    public function test_admin_security_endpoints(): void
    {
        Sanctum::actingAs(User::where('email', 'admin@travelpay.com')->first());

        $this->getJson('/api/v1/admin/threats')->assertOk()->assertJsonStructure(['data' => ['timeline', 'payment_flow', 'blocked_ips']]);
        $this->getJson('/api/v1/admin/ledger')->assertOk()->assertJsonStructure(['data' => ['accounts', 'trial_balance']]);
        $this->postJson('/api/v1/admin/sandbox/simulate', ['scenario' => 'account_takeover', 'count' => 100])
            ->assertOk()->assertJsonPath('data.transactions', 100);
        $this->postJson('/api/v1/admin/blocked-ips', ['ip_address' => '10.0.0.66', 'reason' => 'Botnet', 'minutes' => 60])->assertCreated();
        $this->getJson('/api/v1/admin/dashboard')->assertOk()->assertJsonPath('data.overview.active_ip_blocks', 1);
    }

    public function test_regular_user_cannot_use_admin_endpoints(): void
    {
        Sanctum::actingAs($this->elvin());
        $this->getJson('/api/v1/admin/threats')->assertForbidden();
    }
}
