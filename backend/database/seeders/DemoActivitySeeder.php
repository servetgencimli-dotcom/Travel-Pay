<?php

namespace Database\Seeders;

use App\Models\KycVerification;
use App\Models\LinkedBankAccount;
use App\Models\Merchant;
use App\Models\Transaction;
use App\Models\TravelBudget;
use App\Models\Trip;
use App\Models\User;
use App\Models\VirtualCard;
use App\Services\Wallet\WalletService;
use Illuminate\Database\Seeder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Realistic demo activity for the primary demo traveller so every screen has data.
 * Runs through the real WalletService, so the ledger and fraud engine are exercised too.
 * Skipped if the user already has transactions (safe to re-run).
 */
class DemoActivitySeeder extends Seeder
{
    public function run(WalletService $wallet): void
    {
        $elvin = User::where('email', 'elvin@travelpay.com')->first();
        $aysel = User::where('email', 'aysel@travelpay.com')->first();
        if (!$elvin || !$aysel || Transaction::where('user_id', $elvin->id)->exists()) {
            return;
        }

        // Staff accounts are identity-verified so they can operate above the unverified limit.
        if ($admin = User::where('email', 'admin@travelpay.com')->first()) {
            KycVerification::firstOrCreate(
                ['user_id' => $admin->id, 'status' => 'verified'],
                [
                    'document_type' => 'id_card',
                    'document_number_masked' => 'AA*****01',
                    'document_number_hash' => hash('sha256', 'id_card|AA0000001'),
                    'nationality' => 'AZ',
                    'date_of_birth' => '1990-01-01',
                    'liveness_score' => 99,
                    'document_score' => 99,
                    'verified_at' => now(),
                ]
            );
        }

        KycVerification::firstOrCreate(
            ['user_id' => $elvin->id, 'status' => 'verified'],
            [
                'document_type' => 'id_card',
                'document_number_masked' => 'AA*****67',
                'document_number_hash' => hash('sha256', 'id_card|AA1234567'),
                'nationality' => 'AZ',
                'date_of_birth' => '2003-05-14',
                'liveness_score' => 96,
                'document_score' => 98,
                'verified_at' => now(),
            ]
        );

        LinkedBankAccount::firstOrCreate(
            ['user_id' => $elvin->id, 'iban_hash' => hash('sha256', 'AZ21NABZ00000000137010001944')],
            [
                'bank_name' => 'Kapital Bank',
                'bank_code' => 'KAPITAL',
                'iban_masked' => 'AZ21 **** **** 1944',
                'account_holder' => $elvin->name,
                'currency_code' => 'AZN',
                'available_balance' => 8500,
                'consent_token_hash' => hash('sha256', Str::random(48)),
                'consent_expires_at' => now()->addDays(90),
                'status' => 'active',
            ]
        );

        VirtualCard::firstOrCreate(
            ['user_id' => $elvin->id, 'label' => 'Baku Trip Card'],
            [
                'wallet_id' => $elvin->wallet->id,
                'card_token' => 'tok_' . Str::random(40),
                'brand' => 'VISA',
                'last_four' => '4821',
                'expiry_month' => 10,
                'expiry_year' => (int) now()->addYears(3)->format('Y'),
                'currency_code' => 'AZN',
                'spending_limit' => 1500,
            ]
        );

        $trip = Trip::create([
            'user_id' => $elvin->id,
            'title' => 'Baku Discovery Week',
            'destination_country' => 'Azerbaijan',
            'start_date' => now()->subDays(2)->toDateString(),
            'end_date' => now()->addDays(5)->toDateString(),
            'base_currency' => 'AZN',
            'status' => 'active',
        ]);
        TravelBudget::create(['trip_id' => $trip->id, 'currency_code' => 'AZN', 'total_budget' => 1500]);

        Trip::create([
            'user_id' => $elvin->id,
            'title' => 'Sheki & Gabala Weekend',
            'destination_country' => 'Azerbaijan',
            'start_date' => now()->addDays(20)->toDateString(),
            'end_date' => now()->addDays(23)->toDateString(),
            'base_currency' => 'AZN',
            'status' => 'planned',
        ]);

        $request = Request::create('/seed', 'POST');
        $request->headers->set('X-Device-Id', 'demo-device-' . $elvin->id);

        $pay = function (string $code, float $amount) use ($wallet, $elvin, $request) {
            $merchant = Merchant::where('merchant_code', $code)->with('paymentRequests')->first();
            $qr = $merchant?->paymentRequests->whereNull('amount')->first();
            if ($qr) {
                $wallet->payRequest($elvin, $qr, $amount, $request);
            }
        };

        $pay('MRC-SHIRVANSHAH', 15);
        $pay('MRC-SHIRVAN-REST', 64.50);
        $pay('MRC-BAKUTAXI', 12.80);
        $pay('MRC-CARPET', 10);
        $pay('MRC-FIRUZA', 38.20);
        $pay('MRC-HEYDAR', 25);

        $wallet->transfer($elvin, $aysel->email, 120, 'AZN', 'Dinner split', $request);
        $wallet->transfer($aysel, $elvin->email, 45, 'EUR', 'Museum tickets', tap(Request::create('/seed', 'POST'), fn ($r) => $r->headers->set('X-Device-Id', 'demo-device-' . $aysel->id)));
        $wallet->exchange($elvin, 200, 'EUR', 'AZN', $request);

        // Spread the demo activity over the last few days so charts have shape.
        Transaction::where('user_id', $elvin->id)->orderBy('id')->get()->each(function (Transaction $tx, int $i) {
            $at = now()->subDays(max(0, 2 - intdiv($i, 3)))->setTime(10 + $i, 15);
            $tx->timestamps = false;
            $tx->forceFill(['created_at' => $at, 'updated_at' => $at])->save();
        });
    }
}
