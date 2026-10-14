<?php

namespace Database\Seeders;

use App\Models\Merchant;
use App\Models\PaymentRequest;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletBalance;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Tourist-facing partner merchants. Each one gets an owner account, a wallet and a static
 * (open-amount) payment QR code that tourists can scan.
 */
class MerchantSeeder extends Seeder
{
    public function run(): void
    {
        $merchants = [
            ['code' => 'MRC-SHIRVANSHAH', 'name' => 'Shirvanshahs Palace Museum', 'category' => 'Museums', 'city' => 'Baku', 'address' => 'Icherisheher, Qala döngəsi 76', 'description' => '15th-century palace complex — UNESCO World Heritage site.', 'rating' => 4.9, 'cashback' => 5, 'crypto' => false],
            ['code' => 'MRC-CARPET', 'name' => 'Azerbaijan Carpet Museum', 'category' => 'Museums', 'city' => 'Baku', 'address' => 'Seaside Boulevard, Mikayil Huseynov 28', 'description' => 'The world\'s largest collection of Azerbaijani carpets.', 'rating' => 4.8, 'cashback' => 5, 'crypto' => false],
            ['code' => 'MRC-SHIRVAN-REST', 'name' => 'Shirvanshah Muzey Restaurant', 'category' => 'Restaurants', 'city' => 'Baku', 'address' => 'Salatin Asgarova 86', 'description' => 'Traditional Azerbaijani cuisine in a historic bathhouse.', 'rating' => 4.7, 'cashback' => 3, 'crypto' => true],
            ['code' => 'MRC-FIRUZA', 'name' => 'Firuze Restaurant', 'category' => 'Restaurants', 'city' => 'Baku', 'address' => 'Rasul Rza 14', 'description' => 'Local favourite for plov, dolma and qutab.', 'rating' => 4.6, 'cashback' => 2, 'crypto' => false],
            ['code' => 'MRC-BAKUTAXI', 'name' => 'Baku Taxi Company', 'category' => 'Transportation', 'city' => 'Baku', 'address' => 'City-wide', 'description' => 'Official London-cab taxis — pay by QR inside the car.', 'rating' => 4.4, 'cashback' => 1, 'crypto' => false],
            ['code' => 'MRC-HEYDAR', 'name' => 'Heydar Aliyev Center', 'category' => 'Entertainment', 'city' => 'Baku', 'address' => 'Heydar Aliyev Ave 1', 'description' => 'Zaha Hadid landmark with exhibitions and concerts.', 'rating' => 4.9, 'cashback' => 4, 'crypto' => true],
            ['code' => 'MRC-28MALL', 'name' => '28 Mall', 'category' => 'Shopping', 'city' => 'Baku', 'address' => 'Azadliq Ave 15A', 'description' => 'Shopping centre in the heart of Baku.', 'rating' => 4.3, 'cashback' => 2, 'crypto' => false],
            ['code' => 'MRC-SHEKI-KHAN', 'name' => 'Sheki Khan\'s Palace', 'category' => 'Museums', 'city' => 'Sheki', 'address' => 'Sheki Fortress', 'description' => '18th-century palace famous for its shebeke stained glass.', 'rating' => 4.9, 'cashback' => 5, 'crypto' => false],
            ['code' => 'MRC-GABALA-CABLE', 'name' => 'Tufandag Cable Car', 'category' => 'Entertainment', 'city' => 'Gabala', 'address' => 'Tufandag Mountain Resort', 'description' => 'Panoramic cable-car rides over the Caucasus.', 'rating' => 4.7, 'cashback' => 3, 'crypto' => true],
        ];

        foreach ($merchants as $m) {
            $owner = User::updateOrCreate(
                ['email' => strtolower(str_replace('MRC-', '', $m['code'])) . '@merchant.travelpay.com'],
                [
                    'name' => $m['name'],
                    'password' => Hash::make(Str::random(32)),
                    'role' => 'merchant',
                    'status' => 'active',
                    'email_verified_at' => now(),
                ]
            );

            $wallet = Wallet::firstOrCreate(
                ['user_id' => $owner->id],
                ['wallet_number' => 'TPM' . str_pad((string) $owner->id, 11, '0', STR_PAD_LEFT), 'status' => 'active']
            );
            foreach (['AZN', 'EUR', 'USD'] as $currency) {
                WalletBalance::firstOrCreate(['wallet_id' => $wallet->id, 'currency_code' => $currency], ['balance' => 0, 'locked_balance' => 0]);
            }

            $merchant = Merchant::updateOrCreate(
                ['merchant_code' => $m['code']],
                [
                    'user_id' => $owner->id,
                    'merchant_name' => $m['name'],
                    'category' => $m['category'],
                    'city' => $m['city'],
                    'address' => $m['address'],
                    'description' => $m['description'],
                    'rating' => $m['rating'],
                    'cashback_percent' => $m['cashback'],
                    'accepts_crypto' => $m['crypto'],
                    'status' => 'active',
                ]
            );

            PaymentRequest::firstOrCreate(
                ['merchant_id' => $merchant->id, 'amount' => null, 'status' => 'pending'],
                [
                    'creator_user_id' => $owner->id,
                    'qr_code_token' => 'M' . Str::random(39),
                    'currency_code' => 'AZN',
                    'description' => 'Static merchant QR',
                ]
            );
        }
    }
}
