<?php

namespace App\Services\Wallet;

use App\Models\LedgerAccount;
use App\Models\LedgerEntry;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

/**
 * Double-entry bookkeeping. Every money movement posts one debit and one credit of equal
 * amount, so the sum of debits always equals the sum of credits per currency.
 */
class LedgerService
{
    public const CUSTOMER_FUNDS = 'CUSTOMER-FUNDS';     // liability: money owed to wallet holders
    public const BANK_SETTLEMENT = 'BANK-SETTLEMENT';   // asset: funds held at partner banks
    public const FEE_REVENUE = 'FEE-REVENUE';           // revenue: exchange / service fees
    public const FX_POSITION = 'FX-POSITION';           // equity: currency exchange desk position
    public const CRYPTO_CUSTODY = 'CRYPTO-CUSTODY';     // liability: virtual assets held for users
    public const TRAVEL_PAYABLE = 'TRAVEL-PAYABLE';     // liability: owed to hotels / airlines
    public const CARD_SETTLEMENT = 'CARD-SETTLEMENT';   // liability: owed to card network

    protected const ACCOUNT_TYPES = [
        self::CUSTOMER_FUNDS => ['Customer Wallet Funds', 'liability'],
        self::BANK_SETTLEMENT => ['Partner Bank Settlement', 'asset'],
        self::FEE_REVENUE => ['Fee Revenue', 'revenue'],
        self::FX_POSITION => ['FX Desk Position', 'equity'],
        self::CRYPTO_CUSTODY => ['Virtual Asset Custody', 'liability'],
        self::TRAVEL_PAYABLE => ['Travel Partners Payable', 'liability'],
        self::CARD_SETTLEMENT => ['Card Network Settlement', 'liability'],
    ];

    public function account(string $key, string $currency): LedgerAccount
    {
        $currency = strtoupper($currency);
        [$name, $type] = self::ACCOUNT_TYPES[$key];

        return LedgerAccount::firstOrCreate(
            ['account_number' => "{$key}-{$currency}"],
            ['account_name' => "{$name} ({$currency})", 'type' => $type, 'currency_code' => $currency, 'balance' => 0]
        );
    }

    public function post(Transaction $transaction, string $debitKey, string $creditKey, string|float $amount, string $currency, ?string $description = null): void
    {
        $amount = (string) $amount;
        if (bccomp($amount, '0', 4) <= 0) {
            return;
        }

        DB::transaction(function () use ($transaction, $debitKey, $creditKey, $amount, $currency, $description) {
            $this->entry($transaction, $this->account($debitKey, $currency), 'debit', $amount, $description);
            $this->entry($transaction, $this->account($creditKey, $currency), 'credit', $amount, $description);
        });
    }

    protected function entry(Transaction $transaction, LedgerAccount $account, string $side, string $amount, ?string $description): void
    {
        $account = LedgerAccount::whereKey($account->id)->lockForUpdate()->first();

        // Assets/expenses grow on the debit side; liabilities/equity/revenue grow on the credit side.
        $increasesOnDebit = in_array($account->type, ['asset', 'expense'], true);
        $increase = ($side === 'debit') === $increasesOnDebit;
        $newBalance = $increase
            ? bcadd((string) $account->balance, $amount, 4)
            : bcsub((string) $account->balance, $amount, 4);

        $account->update(['balance' => $newBalance]);

        LedgerEntry::create([
            'transaction_id' => $transaction->id,
            'ledger_account_id' => $account->id,
            'entry_type' => $side,
            'amount' => $amount,
            'currency_code' => $account->currency_code,
            'balance_after' => $newBalance,
            'description' => $description ?? $transaction->description,
            'created_at' => now(),
        ]);
    }

    /**
     * Trial balance: debits vs credits per currency. A healthy ledger is always balanced.
     */
    public function trialBalance(): array
    {
        return LedgerEntry::select(
            'currency_code',
            DB::raw("SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END) as total_debit"),
            DB::raw("SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END) as total_credit")
        )
            ->groupBy('currency_code')
            ->get()
            ->map(fn ($row) => [
                'currency_code' => $row->currency_code,
                'total_debit' => round((float) $row->total_debit, 4),
                'total_credit' => round((float) $row->total_credit, 4),
                'balanced' => bccomp((string) $row->total_debit, (string) $row->total_credit, 4) === 0,
            ])->all();
    }
}
