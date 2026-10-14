<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\UserDevice;
use App\Models\Wallet;
use App\Models\WalletBalance;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Core Reference Data
        $this->call([
            CurrencySeeder::class,
            ExpenseCategorySeeder::class,
            FraudRuleSeeder::class,
        ]);

        // 2. Administrator Account
        $admin = User::updateOrCreate(
            ['email' => 'admin@travelpay.com'],
            [
                'name' => 'TravelPay Administrator',
                'phone' => '+994120000001',
                'password' => Hash::make('Password123!'),
                'role' => 'admin',
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );
        $this->ensureUserWallet($admin, ['AZN' => 50000.00, 'EUR' => 25000.00, 'USD' => 30000.00]);

        // 3. Demo User 1 - Primary Student/Traveler
        $user1 = User::updateOrCreate(
            ['email' => 'elvin@travelpay.com'],
            [
                'name' => 'Elvin Mammadov',
                'phone' => '+994501234567',
                'password' => Hash::make('Password123!'),
                'role' => 'user',
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );
        $this->ensureUserWallet($user1, ['AZN' => 2500.00, 'EUR' => 1200.00, 'USD' => 850.00]);

        // 4. Demo User 2 - P2P Transfer Counterparty
        $user2 = User::updateOrCreate(
            ['email' => 'aysel@travelpay.com'],
            [
                'name' => 'Aysel Aliyeva',
                'phone' => '+994507654321',
                'password' => Hash::make('Password123!'),
                'role' => 'user',
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );
        $this->ensureUserWallet($user2, ['AZN' => 1800.00, 'EUR' => 500.00, 'USD' => 400.00]);
    }

    protected function ensureUserWallet(User $user, array $balances): Wallet
    {
        $wallet = Wallet::firstOrCreate(
            ['user_id' => $user->id],
            [
                'wallet_number' => 'TP' . str_pad((string) $user->id, 12, '0', STR_PAD_LEFT),
                'status' => 'active',
            ]
        );

        foreach ($balances as $currency => $amount) {
            WalletBalance::updateOrCreate(
                ['wallet_id' => $wallet->id, 'currency_code' => $currency],
                ['balance' => $amount, 'locked_balance' => 0.0000]
            );
        }

        // Register default simulated device
        UserDevice::firstOrCreate(
            ['user_id' => $user->id, 'device_uuid' => 'demo-device-' . $user->id],
            [
                'device_name' => 'Demo Smartphone',
                'device_type' => 'mobile',
                'os' => 'iOS',
                'ip_address' => '127.0.0.1',
                'last_active_at' => now(),
                'is_trusted' => true,
            ]
        );

        return $wallet;
    }
}
