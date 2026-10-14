<?php

namespace Database\Seeders;

use App\Models\CryptoAsset;
use Illuminate\Database\Seeder;

class CryptoAssetSeeder extends Seeder
{
    public function run(): void
    {
        $assets = [
            ['code' => 'BTC', 'name' => 'Bitcoin', 'network' => 'Bitcoin', 'base_price_azn' => 175000, 'color' => '#F7931A'],
            ['code' => 'ETH', 'name' => 'Ethereum', 'network' => 'Ethereum', 'base_price_azn' => 6200, 'color' => '#627EEA'],
            ['code' => 'USDT', 'name' => 'Tether USD', 'network' => 'TRC-20', 'base_price_azn' => 1.70, 'color' => '#26A17B'],
            ['code' => 'SOL', 'name' => 'Solana', 'network' => 'Solana', 'base_price_azn' => 290, 'color' => '#9945FF'],
        ];

        foreach ($assets as $asset) {
            CryptoAsset::updateOrCreate(['code' => $asset['code']], $asset + ['precision' => 8, 'is_active' => true]);
        }
    }
}
