<?php

namespace App\Services\Travel;

use App\Exceptions\WalletException;
use App\Models\CryptoAsset;
use App\Models\CryptoHolding;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Wallet\LedgerService;
use App\Services\Wallet\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Virtual assets (sandbox): buy/sell against the AZN wallet and pay travel bookings.
 * Prices are simulated around a base price with a smooth, time-based drift.
 */
class CryptoService
{
    /** Spread charged on buy/sell (1%). */
    public const SPREAD = 0.01;

    public function __construct(
        protected WalletService $wallet
    ) {}

    public function prices(): array
    {
        return CryptoAsset::where('is_active', true)->orderBy('id')->get()
            ->map(fn (CryptoAsset $a) => $this->quote($a))
            ->all();
    }

    public function quote(CryptoAsset $asset): array
    {
        $price = $this->livePrice($asset);
        $yesterday = $this->livePrice($asset, now()->subDay()->timestamp);

        return [
            'code' => $asset->code,
            'name' => $asset->name,
            'network' => $asset->network,
            'color' => $asset->color,
            'price_azn' => round($price, 2),
            'buy_price_azn' => round($price * (1 + self::SPREAD), 2),
            'sell_price_azn' => round($price * (1 - self::SPREAD), 2),
            'change_24h' => round(($price - $yesterday) / $yesterday * 100, 2),
        ];
    }

    public function livePrice(CryptoAsset $asset, ?int $timestamp = null): float
    {
        $t = $timestamp ?? now()->timestamp;
        $base = (float) $asset->base_price_azn;
        $seed = crc32($asset->code) % 100;

        // Stablecoins barely move; volatile assets drift up to ~±6%.
        $amplitude = str_starts_with($asset->code, 'USD') ? 0.002 : 0.06;
        $drift = sin($t / 7200 + $seed) * $amplitude + sin($t / 900 + $seed * 2) * $amplitude / 4;

        return $base * (1 + $drift);
    }

    public function portfolio(Wallet $wallet): array
    {
        $assets = CryptoAsset::where('is_active', true)->get()->keyBy('code');
        $holdings = CryptoHolding::where('wallet_id', $wallet->id)->where('amount', '>', 0)->get();

        $rows = $holdings->map(function (CryptoHolding $h) use ($assets) {
            $asset = $assets[$h->asset_code] ?? null;
            $price = $asset ? $this->livePrice($asset) : 0;
            $value = (float) $h->amount * $price;
            $cost = (float) $h->amount * (float) $h->average_cost_azn;

            return [
                'asset_code' => $h->asset_code,
                'name' => $asset?->name,
                'color' => $asset?->color,
                'amount' => (float) $h->amount,
                'price_azn' => round($price, 2),
                'value_azn' => round($value, 2),
                'average_cost_azn' => round((float) $h->average_cost_azn, 2),
                'pnl_azn' => round($value - $cost, 2),
                'pnl_percent' => $cost > 0 ? round(($value - $cost) / $cost * 100, 2) : 0,
            ];
        })->values();

        return [
            'total_value_azn' => round($rows->sum('value_azn'), 2),
            'total_pnl_azn' => round($rows->sum('pnl_azn'), 2),
            'holdings' => $rows,
        ];
    }

    public function buy(User $user, string $assetCode, float $aznAmount, Request $request): array
    {
        $asset = $this->asset($assetCode);
        $price = $this->livePrice($asset) * (1 + self::SPREAD);
        $units = round($aznAmount / $price, 8);

        $tx = $this->wallet->spend(
            $user, $aznAmount, 'AZN', 'crypto_buy',
            "Bought {$units} {$asset->code}",
            LedgerService::CRYPTO_CUSTODY,
            $request,
            ['asset' => $asset->code, 'units' => $units, 'price_azn' => round($price, 2)],
            function () use ($user, $asset, $units, $price) {
                $holding = $this->lockHolding($user->wallet, $asset->code);
                $newAmount = (float) $holding->amount + $units;
                $avgCost = $newAmount > 0
                    ? (((float) $holding->amount * (float) $holding->average_cost_azn) + $units * $price) / $newAmount
                    : 0;
                $holding->update(['amount' => $newAmount, 'average_cost_azn' => $avgCost]);
            }
        );

        $this->wallet->notify($user, 'Crypto purchased', "+{$units} {$asset->code} for " . number_format($aznAmount, 2) . ' AZN', 'crypto');

        return ['transaction' => $tx, 'units' => $units, 'price_azn' => round($price, 2)];
    }

    public function sell(User $user, string $assetCode, float $units, Request $request): array
    {
        $asset = $this->asset($assetCode);
        $wallet = $this->wallet->activeWallet($user);
        $price = $this->livePrice($asset) * (1 - self::SPREAD);
        $proceeds = round($units * $price, 2);

        $tx = DB::transaction(function () use ($user, $wallet, $asset, $units, $price, $proceeds, $request) {
            $this->debitHolding($wallet, $asset->code, $units);

            return $this->wallet->receive(
                $user, $proceeds, 'AZN', 'crypto_sell',
                "Sold {$units} {$asset->code}",
                LedgerService::CRYPTO_CUSTODY,
                $request,
                ['asset' => $asset->code, 'units' => $units, 'price_azn' => round($price, 2)]
            );
        });

        $this->wallet->notify($user, 'Crypto sold', "-{$units} {$asset->code} → +" . number_format($proceeds, 2) . ' AZN', 'crypto');

        return ['transaction' => $tx, 'proceeds_azn' => $proceeds, 'price_azn' => round($price, 2)];
    }

    /**
     * Pay an AZN-denominated amount from crypto holdings (used for hotel / flight bookings).
     */
    public function payWithCrypto(User $user, string $assetCode, float $aznAmount, string $description, string $creditAccount, Request $request, array $metadata = []): array
    {
        $asset = $this->asset($assetCode);
        $wallet = $this->wallet->activeWallet($user);
        $price = $this->livePrice($asset) * (1 - self::SPREAD);
        $units = round($aznAmount / $price, 8);

        $tx = DB::transaction(function () use ($user, $wallet, $asset, $units, $aznAmount, $description, $creditAccount, $request, $metadata) {
            $this->debitHolding($wallet, $asset->code, $units);

            // Settle: crypto custody converts units to AZN, which is then paid to the travel partner.
            $tx = Transaction::create([
                'reference_number' => 'TX' . now()->format('ymdHis') . strtoupper(\Illuminate\Support\Str::random(6)),
                'wallet_id' => $wallet->id,
                'user_id' => $user->id,
                'type' => 'crypto_payment',
                'status' => 'completed',
                'amount' => $aznAmount,
                'fee' => 0,
                'currency_code' => 'AZN',
                'description' => $description . " (paid {$units} {$asset->code})",
                'metadata' => array_merge($metadata, ['asset' => $asset->code, 'units' => $units]),
            ]);
            app(LedgerService::class)->post($tx, LedgerService::CRYPTO_CUSTODY, $creditAccount, $aznAmount, 'AZN');

            return $tx;
        });

        return ['transaction' => $tx, 'units' => $units];
    }

    public function refundToHolding(User $user, string $assetCode, float $units): void
    {
        $holding = $this->lockHolding($user->wallet, strtoupper($assetCode));
        $holding->update(['amount' => (float) $holding->amount + $units]);
    }

    protected function asset(string $code): CryptoAsset
    {
        $asset = CryptoAsset::where('code', strtoupper($code))->where('is_active', true)->first();
        if (!$asset) {
            throw new WalletException("Virtual asset {$code} is not supported.", 422, 'asset_unsupported');
        }

        return $asset;
    }

    protected function lockHolding(Wallet $wallet, string $code): CryptoHolding
    {
        CryptoHolding::firstOrCreate(['wallet_id' => $wallet->id, 'asset_code' => $code], ['amount' => 0, 'average_cost_azn' => 0]);

        return CryptoHolding::where('wallet_id', $wallet->id)->where('asset_code', $code)->lockForUpdate()->first();
    }

    protected function debitHolding(Wallet $wallet, string $code, float $units): void
    {
        $holding = $this->lockHolding($wallet, $code);
        if ((float) $holding->amount + 1e-9 < $units) {
            throw new WalletException("Insufficient {$code}. Available: " . rtrim(rtrim(number_format((float) $holding->amount, 8, '.', ''), '0'), '.'), 422, 'insufficient_crypto');
        }
        $holding->update(['amount' => max(0, (float) $holding->amount - $units)]);
    }
}
