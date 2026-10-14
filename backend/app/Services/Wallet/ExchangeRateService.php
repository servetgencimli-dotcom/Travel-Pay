<?php

namespace App\Services\Wallet;

use App\Exceptions\WalletException;
use App\Models\ExchangeRate;

class ExchangeRateService
{
    /**
     * Conversion fee charged on in-app currency exchange (0.5%).
     */
    public const EXCHANGE_FEE_RATE = '0.005';

    public function rate(string $from, string $to): string
    {
        $from = strtoupper($from);
        $to = strtoupper($to);

        if ($from === $to) {
            return '1.000000';
        }

        $rate = ExchangeRate::where('from_currency', $from)->where('to_currency', $to)->value('rate');

        if ($rate === null) {
            throw new WalletException("Exchange rate {$from}/{$to} is not available.", 422, 'rate_unavailable');
        }

        return (string) $rate;
    }

    public function convert(string|float $amount, string $from, string $to): string
    {
        return bcmul((string) $amount, $this->rate($from, $to), 4);
    }

    /**
     * Normalise any amount to AZN so fraud thresholds and analytics compare like with like.
     */
    public function toAzn(string|float $amount, string $currency): string
    {
        return $this->convert($amount, $currency, 'AZN');
    }

    public function all(): array
    {
        return ExchangeRate::orderBy('from_currency')->orderBy('to_currency')->get()
            ->map(fn (ExchangeRate $r) => [
                'pair' => "{$r->from_currency}/{$r->to_currency}",
                'from' => $r->from_currency,
                'to' => $r->to_currency,
                'rate' => (float) $r->rate,
                'updated_at' => $r->effective_at?->toISOString(),
            ])->all();
    }
}
