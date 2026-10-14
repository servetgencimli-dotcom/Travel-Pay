<?php

namespace Database\Seeders;

use App\Models\Currency;
use App\Models\ExchangeRate;
use Illuminate\Database\Seeder;

class CurrencySeeder extends Seeder
{
    public function run(): void
    {
        $currencies = [
            [
                'code' => 'AZN',
                'name' => 'Azerbaijani Manat',
                'symbol' => '₼',
                'precision' => 2,
                'is_active' => true,
            ],
            [
                'code' => 'EUR',
                'name' => 'Euro',
                'symbol' => '€',
                'precision' => 2,
                'is_active' => true,
            ],
            [
                'code' => 'USD',
                'name' => 'US Dollar',
                'symbol' => '$',
                'precision' => 2,
                'is_active' => true,
            ],
        ];

        foreach ($currencies as $curr) {
            Currency::updateOrCreate(['code' => $curr['code']], $curr);
        }

        // Standard simulated market exchange rates (Pegged baseline: 1 USD = 1.70 AZN, 1 EUR = 1.85 AZN)
        $rates = [
            ['from_currency' => 'USD', 'to_currency' => 'AZN', 'rate' => 1.700000, 'inverse_rate' => 0.588235],
            ['from_currency' => 'AZN', 'to_currency' => 'USD', 'rate' => 0.588235, 'inverse_rate' => 1.700000],
            ['from_currency' => 'EUR', 'to_currency' => 'AZN', 'rate' => 1.850000, 'inverse_rate' => 0.540541],
            ['from_currency' => 'AZN', 'to_currency' => 'EUR', 'rate' => 0.540541, 'inverse_rate' => 1.850000],
            ['from_currency' => 'EUR', 'to_currency' => 'USD', 'rate' => 1.088235, 'inverse_rate' => 0.918919],
            ['from_currency' => 'USD', 'to_currency' => 'EUR', 'rate' => 0.918919, 'inverse_rate' => 1.088235],
        ];

        foreach ($rates as $rate) {
            ExchangeRate::updateOrCreate(
                ['from_currency' => $rate['from_currency'], 'to_currency' => $rate['to_currency']],
                $rate
            );
        }
    }
}
