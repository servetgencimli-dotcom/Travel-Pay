<?php

namespace App\Services\Wallet;

use App\Exceptions\WalletException;
use App\Models\CurrencyConversion;
use App\Models\LinkedBankAccount;
use App\Models\PaymentConfirmation;
use App\Models\PaymentRequest;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletBalance;
use App\Notifications\WalletActivity;
use App\Services\Fraud\FraudDetectionService;
use App\Services\Security\AuditLogService;
use App\Services\Security\AuthService;
use App\Services\Travel\TravelService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WalletService
{
    /** Per-transaction ceiling (AZN equivalent) for users who have not completed eKYC. */
    public const UNVERIFIED_TX_LIMIT_AZN = 2000;

    public const SUPPORTED_CURRENCIES = ['AZN', 'EUR', 'USD'];

    public function __construct(
        protected LedgerService $ledger,
        protected ExchangeRateService $rates,
        protected FraudDetectionService $fraud,
        protected AuditLogService $audit,
        protected AuthService $auth,
        protected TravelService $travel
    ) {}

    // ---------------------------------------------------------------------
    // Top-up via Open Banking
    // ---------------------------------------------------------------------

    public function topUp(User $user, LinkedBankAccount $account, string|float $amount, Request $request): Transaction
    {
        $amount = $this->money($amount);
        $wallet = $this->activeWallet($user);

        if ($account->user_id !== $user->id || !$account->hasValidConsent()) {
            throw new WalletException('Bank consent is missing or expired. Re-link the bank account.', 422, 'consent_invalid');
        }

        if ($existing = $this->idempotent($user, $request)) {
            return $existing;
        }

        return DB::transaction(function () use ($user, $wallet, $account, $amount, $request) {
            $account = LinkedBankAccount::whereKey($account->id)->lockForUpdate()->first();
            if (bccomp((string) $account->available_balance, $amount, 4) < 0) {
                throw new WalletException("Insufficient funds at {$account->bank_name}.", 422, 'bank_insufficient_funds');
            }

            $currency = $account->currency_code;
            $balance = $this->lockBalance($wallet, $currency);

            $tx = $this->newTransaction($user, $wallet, $request, [
                'type' => 'top_up',
                'status' => 'completed',
                'amount' => $amount,
                'currency_code' => $currency,
                'description' => "Top-up from {$account->bank_name} {$account->iban_masked}",
                'metadata' => ['bank_account_id' => $account->id, 'bank' => $account->bank_name],
            ]);

            $account->update(['available_balance' => bcsub((string) $account->available_balance, $amount, 4)]);
            $balance->update(['balance' => bcadd((string) $balance->balance, $amount, 4)]);
            $this->ledger->post($tx, LedgerService::BANK_SETTLEMENT, LedgerService::CUSTOMER_FUNDS, $amount, $currency);

            $this->auditTx($user, 'wallet.top_up', $tx, $request);
            $this->notify($user, 'Wallet topped up', "+{$this->fmt($amount, $currency)} from {$account->bank_name}", 'top_up');

            return $tx;
        });
    }

    // ---------------------------------------------------------------------
    // P2P transfer
    // ---------------------------------------------------------------------

    public function transfer(User $sender, string $recipientRef, string|float $amount, string $currency, ?string $note, Request $request): Transaction
    {
        $amount = $this->money($amount);
        $currency = $this->currency($currency);
        $wallet = $this->activeWallet($sender);

        $recipient = $this->findRecipient($recipientRef);
        if (!$recipient) {
            throw new WalletException('Recipient not found. Use an email, phone or wallet number.', 404, 'recipient_not_found');
        }
        if ($recipient->id === $sender->id) {
            throw new WalletException('You cannot send money to yourself.', 422, 'self_transfer');
        }
        $recipientWallet = $this->activeWallet($recipient, 'Recipient wallet is not accepting payments.');

        if ($existing = $this->idempotent($sender, $request)) {
            return $existing;
        }

        $this->enforceKycLimit($sender, $amount, $currency);
        $description = $note ? "P2P to {$recipient->name}: {$note}" : "P2P transfer to {$recipient->name}";
        $assessment = $this->screen($sender, $wallet, $amount, $currency, 'transfer', $description, $request, holdable: true);

        return DB::transaction(function () use ($sender, $recipient, $wallet, $recipientWallet, $amount, $currency, $description, $assessment, $request) {
            $balance = $this->lockBalance($wallet, $currency);
            $this->ensureAvailable($balance, $amount);

            $tx = $this->newTransaction($sender, $wallet, $request, [
                'type' => 'transfer',
                'status' => 'pending',
                'amount' => $amount,
                'currency_code' => $currency,
                'recipient_wallet_id' => $recipientWallet->id,
                'recipient_user_id' => $recipient->id,
                'description' => $description,
            ]);

            if ($assessment['action'] === 'hold') {
                $this->holdFunds($balance, $tx, $amount);
                $this->notify($sender, 'Transfer held for review', "{$this->fmt($amount, $currency)} to {$recipient->name} is being reviewed by our security team.", 'security');
            } else {
                $balance->update(['balance' => bcsub((string) $balance->balance, $amount, 4)]);
                $this->creditWallet($recipientWallet, $currency, $amount);
                $this->ledger->post($tx, LedgerService::CUSTOMER_FUNDS, LedgerService::CUSTOMER_FUNDS, $amount, $currency, "P2P {$sender->name} → {$recipient->name}");
                $tx->update(['status' => 'completed']);

                $this->notify($sender, 'Money sent', "-{$this->fmt($amount, $currency)} to {$recipient->name}", 'transfer_out');
                $this->notify($recipient, 'Money received', "+{$this->fmt($amount, $currency)} from {$sender->name}", 'transfer_in');
            }

            $this->fraud->record($tx, $assessment);
            $this->auditTx($sender, 'wallet.transfer', $tx, $request);

            return $tx->fresh();
        });
    }

    // ---------------------------------------------------------------------
    // Multi-currency exchange
    // ---------------------------------------------------------------------

    public function quoteExchange(string|float $amount, string $from, string $to): array
    {
        $amount = $this->money($amount);
        $from = $this->currency($from);
        $to = $this->currency($to);

        $fee = bcmul($amount, ExchangeRateService::EXCHANGE_FEE_RATE, 4);
        $net = bcsub($amount, $fee, 4);
        $rate = $this->rates->rate($from, $to);

        return [
            'from_currency' => $from,
            'to_currency' => $to,
            'from_amount' => (float) $amount,
            'fee' => (float) $fee,
            'fee_percent' => (float) ExchangeRateService::EXCHANGE_FEE_RATE * 100,
            'rate' => (float) $rate,
            'to_amount' => (float) bcmul($net, $rate, 4),
        ];
    }

    public function exchange(User $user, string|float $amount, string $from, string $to, Request $request): Transaction
    {
        $quote = $this->quoteExchange($amount, $from, $to);
        if ($quote['from_currency'] === $quote['to_currency']) {
            throw new WalletException('Choose two different currencies.', 422, 'same_currency');
        }

        $amount = $this->money($amount);
        $wallet = $this->activeWallet($user);

        if ($existing = $this->idempotent($user, $request)) {
            return $existing;
        }

        $description = "Exchange {$quote['from_currency']} → {$quote['to_currency']}";
        $assessment = $this->screen($user, $wallet, $amount, $quote['from_currency'], 'exchange', $description, $request, holdable: false);

        return DB::transaction(function () use ($user, $wallet, $amount, $quote, $description, $assessment, $request) {
            $fromBalance = $this->lockBalance($wallet, $quote['from_currency']);
            $toBalance = $this->lockBalance($wallet, $quote['to_currency']);
            $this->ensureAvailable($fromBalance, $amount);

            $fee = $this->money($quote['fee']);
            $net = bcsub($amount, $fee, 4);
            $toAmount = $this->money($quote['to_amount']);

            $tx = $this->newTransaction($user, $wallet, $request, [
                'type' => 'exchange',
                'status' => 'completed',
                'amount' => $amount,
                'fee' => $fee,
                'currency_code' => $quote['from_currency'],
                'description' => $description,
                'metadata' => ['to_currency' => $quote['to_currency'], 'to_amount' => $quote['to_amount'], 'rate' => $quote['rate']],
            ]);

            $fromBalance->update(['balance' => bcsub((string) $fromBalance->balance, $amount, 4)]);
            $toBalance->update(['balance' => bcadd((string) $toBalance->balance, $toAmount, 4)]);

            CurrencyConversion::create([
                'user_id' => $user->id,
                'wallet_id' => $wallet->id,
                'transaction_id' => $tx->id,
                'from_currency' => $quote['from_currency'],
                'to_currency' => $quote['to_currency'],
                'from_amount' => $amount,
                'to_amount' => $toAmount,
                'exchange_rate' => $quote['rate'],
                'fee' => $fee,
            ]);

            $this->ledger->post($tx, LedgerService::CUSTOMER_FUNDS, LedgerService::FX_POSITION, $net, $quote['from_currency']);
            $this->ledger->post($tx, LedgerService::CUSTOMER_FUNDS, LedgerService::FEE_REVENUE, $fee, $quote['from_currency'], 'Exchange fee');
            $this->ledger->post($tx, LedgerService::FX_POSITION, LedgerService::CUSTOMER_FUNDS, $toAmount, $quote['to_currency']);

            $this->fraud->record($tx, $assessment);
            $this->auditTx($user, 'wallet.exchange', $tx, $request);
            $this->notify($user, 'Currency exchanged', "{$this->fmt($amount, $quote['from_currency'])} → {$this->fmt($toAmount, $quote['to_currency'])}", 'exchange');

            return $tx;
        });
    }

    // ---------------------------------------------------------------------
    // QR payments (merchant static QR or personal payment request)
    // ---------------------------------------------------------------------

    public function payRequest(User $payer, PaymentRequest $paymentRequest, string|float|null $amount, Request $request): array
    {
        $paymentRequest->loadMissing('merchant', 'creator');

        if ($paymentRequest->status !== 'pending') {
            throw new WalletException('This QR code is no longer valid.', 422, 'qr_inactive');
        }
        if ($paymentRequest->expires_at && $paymentRequest->expires_at->isPast()) {
            $paymentRequest->update(['status' => 'expired']);
            throw new WalletException('This QR code has expired.', 422, 'qr_expired');
        }
        if ($paymentRequest->creator_user_id === $payer->id) {
            throw new WalletException('You cannot pay your own QR code.', 422, 'self_payment');
        }

        $amount = $paymentRequest->amount !== null ? $this->money($paymentRequest->amount) : $this->money($amount ?? 0);
        if (bccomp($amount, '0', 4) <= 0) {
            throw new WalletException('Enter the amount to pay.', 422, 'amount_required');
        }

        $currency = $paymentRequest->currency_code;
        $wallet = $this->activeWallet($payer);
        $payee = $paymentRequest->creator;
        $payeeWallet = $this->activeWallet($payee, 'The merchant is not accepting payments right now.');
        $merchant = $paymentRequest->merchant;
        $payeeName = $merchant?->merchant_name ?? $payee->name;

        if ($existing = $this->idempotent($payer, $request)) {
            return ['transaction' => $existing, 'receipt' => PaymentConfirmation::where('transaction_id', $existing->id)->first(), 'cashback' => 0];
        }

        $this->enforceKycLimit($payer, $amount, $currency);
        $description = "QR payment to {$payeeName}" . ($paymentRequest->description ? " — {$paymentRequest->description}" : '');
        $assessment = $this->screen($payer, $wallet, $amount, $currency, 'payment', $description, $request, holdable: true);

        return DB::transaction(function () use ($payer, $payee, $wallet, $payeeWallet, $paymentRequest, $merchant, $payeeName, $amount, $currency, $description, $assessment, $request) {
            $balance = $this->lockBalance($wallet, $currency);
            $this->ensureAvailable($balance, $amount);

            $tx = $this->newTransaction($payer, $wallet, $request, [
                'type' => 'payment',
                'status' => 'pending',
                'amount' => $amount,
                'currency_code' => $currency,
                'recipient_wallet_id' => $payeeWallet->id,
                'recipient_user_id' => $payee->id,
                'description' => $description,
                'metadata' => [
                    'payment_request_id' => $paymentRequest->id,
                    'merchant_id' => $merchant?->id,
                    'merchant_name' => $merchant?->merchant_name,
                    'merchant_category' => $merchant?->category,
                ],
            ]);

            // Personal requests are single-use; merchant static QR codes stay open.
            $isStaticQr = $merchant !== null && $paymentRequest->amount === null;
            if (!$isStaticQr) {
                $paymentRequest->update(['status' => 'completed']);
            }

            $receipt = null;
            $cashback = '0.0000';

            if ($assessment['action'] === 'hold') {
                $this->holdFunds($balance, $tx, $amount);
                $this->notify($payer, 'Payment held for review', "{$this->fmt($amount, $currency)} to {$payeeName} is under security review.", 'security');
            } else {
                $balance->update(['balance' => bcsub((string) $balance->balance, $amount, 4)]);
                $this->creditWallet($payeeWallet, $currency, $amount);
                $this->ledger->post($tx, LedgerService::CUSTOMER_FUNDS, LedgerService::CUSTOMER_FUNDS, $amount, $currency, $description);
                $tx->update(['status' => 'completed']);
                $receipt = $this->issueReceipt($paymentRequest, $tx, $payer);

                // Tourist cashback funded from fee revenue.
                if ($merchant && (float) $merchant->cashback_percent > 0) {
                    $cashback = bcdiv(bcmul($amount, (string) $merchant->cashback_percent, 4), '100', 4);
                    $this->creditWallet($wallet, $currency, $cashback);
                    $this->ledger->post($tx, LedgerService::FEE_REVENUE, LedgerService::CUSTOMER_FUNDS, $cashback, $currency, "Cashback {$merchant->cashback_percent}% at {$merchant->merchant_name}");
                    $tx->update(['metadata' => array_merge($tx->metadata ?? [], ['cashback' => (float) $cashback])]);
                }

                $this->travel->trackExpense($payer, $tx, $merchant?->category ?? 'Other', $description);
                $this->notify($payer, 'Payment successful', "-{$this->fmt($amount, $currency)} at {$payeeName}" . ((float) $cashback > 0 ? " (+{$this->fmt($cashback, $currency)} cashback)" : ''), 'payment');
                $this->notify($payee, 'Payment received', "+{$this->fmt($amount, $currency)} from {$payer->name}", 'transfer_in');
            }

            $this->fraud->record($tx, $assessment);
            $this->auditTx($payer, 'wallet.qr_payment', $tx, $request);

            return ['transaction' => $tx->fresh(), 'receipt' => $receipt, 'cashback' => (float) $cashback];
        });
    }

    // ---------------------------------------------------------------------
    // Generic spend / refund used by bookings, cards and virtual assets
    // ---------------------------------------------------------------------

    /**
     * Debit the wallet for a purchase with no counterparty wallet (hotel, flight, card, crypto).
     * $after runs inside the same DB transaction so dependent records commit atomically.
     */
    public function spend(
        User $user,
        string|float $amount,
        string $currency,
        string $type,
        string $description,
        string $creditAccount,
        Request $request,
        array $metadata = [],
        ?callable $after = null
    ): Transaction {
        $amount = $this->money($amount);
        $currency = $this->currency($currency);
        $wallet = $this->activeWallet($user);

        $this->enforceKycLimit($user, $amount, $currency);
        $assessment = $this->screen($user, $wallet, $amount, $currency, $type, $description, $request, holdable: false);

        return DB::transaction(function () use ($user, $wallet, $amount, $currency, $type, $description, $creditAccount, $request, $metadata, $after, $assessment) {
            $balance = $this->lockBalance($wallet, $currency);
            $this->ensureAvailable($balance, $amount);

            $tx = $this->newTransaction($user, $wallet, $request, [
                'type' => $type,
                'status' => 'completed',
                'amount' => $amount,
                'currency_code' => $currency,
                'description' => $description,
                'metadata' => $metadata ?: null,
            ]);

            $balance->update(['balance' => bcsub((string) $balance->balance, $amount, 4)]);
            $this->ledger->post($tx, LedgerService::CUSTOMER_FUNDS, $creditAccount, $amount, $currency);
            $this->fraud->record($tx, $assessment);
            $this->auditTx($user, "wallet.{$type}", $tx, $request);

            if ($after) {
                $after($tx);
            }

            return $tx;
        });
    }

    /**
     * Credit the wallet from an internal account (crypto sale, booking refund).
     */
    public function receive(
        User $user,
        string|float $amount,
        string $currency,
        string $type,
        string $description,
        string $debitAccount,
        ?Request $request = null,
        array $metadata = []
    ): Transaction {
        $amount = $this->money($amount);
        $currency = $this->currency($currency);
        $wallet = $this->activeWallet($user);

        return DB::transaction(function () use ($user, $wallet, $amount, $currency, $type, $description, $debitAccount, $request, $metadata) {
            $balance = $this->lockBalance($wallet, $currency);

            $tx = $this->newTransaction($user, $wallet, $request, [
                'type' => $type,
                'status' => 'completed',
                'amount' => $amount,
                'currency_code' => $currency,
                'description' => $description,
                'metadata' => $metadata ?: null,
            ]);

            $balance->update(['balance' => bcadd((string) $balance->balance, $amount, 4)]);
            $this->ledger->post($tx, $debitAccount, LedgerService::CUSTOMER_FUNDS, $amount, $currency);
            $this->auditTx($user, "wallet.{$type}", $tx, $request);

            return $tx;
        });
    }

    // ---------------------------------------------------------------------
    // Manual review of held transactions (admin)
    // ---------------------------------------------------------------------

    public function approveHeld(Transaction $tx, User $admin, Request $request): Transaction
    {
        if ($tx->status !== 'held_for_review') {
            throw new WalletException('Only held transactions can be approved.', 422, 'not_held');
        }

        return DB::transaction(function () use ($tx, $admin, $request) {
            $tx = Transaction::whereKey($tx->id)->lockForUpdate()->first();
            $balance = $this->lockBalance($tx->wallet, $tx->currency_code);

            $balance->update([
                'balance' => bcsub((string) $balance->balance, (string) $tx->amount, 4),
                'locked_balance' => bcsub((string) $balance->locked_balance, (string) $tx->amount, 4),
            ]);
            $this->creditWallet($tx->recipientWallet, $tx->currency_code, (string) $tx->amount);
            $this->ledger->post($tx, LedgerService::CUSTOMER_FUNDS, LedgerService::CUSTOMER_FUNDS, (string) $tx->amount, $tx->currency_code, 'Approved after review: ' . $tx->description);
            $tx->update(['status' => 'completed']);
            $tx->riskAssessment?->update(['is_resolved' => true]);

            if ($tx->type === 'payment' && ($requestId = $tx->metadata['payment_request_id'] ?? null)) {
                if ($paymentRequest = PaymentRequest::find($requestId)) {
                    $this->issueReceipt($paymentRequest, $tx, $tx->user);
                }
            }

            $this->audit->log($admin, 'admin.transaction_approved', Transaction::class, $tx->id, ['status' => 'held_for_review'], ['status' => 'completed'], $request->ip(), $request->userAgent());
            $this->notify($tx->user, 'Transaction approved', "{$this->fmt($tx->amount, $tx->currency_code)} ({$tx->reference_number}) was approved and completed.", 'security');
            if ($tx->recipientUser) {
                $this->notify($tx->recipientUser, 'Money received', "+{$this->fmt($tx->amount, $tx->currency_code)} from {$tx->user->name}", 'transfer_in');
            }

            return $tx->fresh();
        });
    }

    public function rejectHeld(Transaction $tx, User $admin, Request $request): Transaction
    {
        if ($tx->status !== 'held_for_review') {
            throw new WalletException('Only held transactions can be rejected.', 422, 'not_held');
        }

        return DB::transaction(function () use ($tx, $admin, $request) {
            $tx = Transaction::whereKey($tx->id)->lockForUpdate()->first();
            $balance = $this->lockBalance($tx->wallet, $tx->currency_code);

            $balance->update(['locked_balance' => bcsub((string) $balance->locked_balance, (string) $tx->amount, 4)]);
            $tx->update(['status' => 'cancelled']);
            $tx->riskAssessment?->update(['is_resolved' => true]);

            if ($tx->type === 'payment' && ($requestId = $tx->metadata['payment_request_id'] ?? null)) {
                PaymentRequest::whereKey($requestId)->whereNull('merchant_id')->update(['status' => 'pending']);
            }

            $this->audit->log($admin, 'admin.transaction_rejected', Transaction::class, $tx->id, ['status' => 'held_for_review'], ['status' => 'cancelled'], $request->ip(), $request->userAgent());
            $this->notify($tx->user, 'Transaction rejected', "{$this->fmt($tx->amount, $tx->currency_code)} ({$tx->reference_number}) was rejected after review. Funds were released.", 'security');

            return $tx->fresh();
        });
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    public function findRecipient(string $ref): ?User
    {
        $ref = trim($ref);

        return User::where('email', strtolower($ref))
            ->orWhere('phone', $ref)
            ->orWhereHas('wallet', fn ($q) => $q->where('wallet_number', strtoupper($ref)))
            ->first();
    }

    public function activeWallet(User $user, string $message = 'Your wallet is frozen. Unfreeze it in the Security Center.'): Wallet
    {
        if (!$user->isActive()) {
            throw new WalletException("Account is {$user->status}.", 403, 'account_inactive');
        }

        $wallet = $user->wallet;
        if (!$wallet || $wallet->status !== 'active') {
            throw new WalletException($message, 403, 'wallet_frozen');
        }

        return $wallet;
    }

    public function money(string|float|int $amount): string
    {
        return number_format((float) $amount, 4, '.', '');
    }

    public function fmt(string|float $amount, string $currency): string
    {
        return number_format((float) $amount, 2) . ' ' . $currency;
    }

    protected function currency(string $currency): string
    {
        $currency = strtoupper($currency);
        if (!in_array($currency, self::SUPPORTED_CURRENCIES, true)) {
            throw new WalletException("Currency {$currency} is not supported.", 422, 'currency_unsupported');
        }

        return $currency;
    }

    protected function lockBalance(Wallet $wallet, string $currency): WalletBalance
    {
        WalletBalance::firstOrCreate(
            ['wallet_id' => $wallet->id, 'currency_code' => $currency],
            ['balance' => 0, 'locked_balance' => 0]
        );

        return WalletBalance::where('wallet_id', $wallet->id)
            ->where('currency_code', $currency)
            ->lockForUpdate()
            ->first();
    }

    protected function ensureAvailable(WalletBalance $balance, string $amount): void
    {
        if (bccomp($balance->available_balance, $amount, 4) < 0) {
            throw new WalletException(
                "Insufficient {$balance->currency_code} balance. Available: " . number_format((float) $balance->available_balance, 2),
                422,
                'insufficient_funds'
            );
        }
    }

    protected function creditWallet(Wallet $wallet, string $currency, string $amount): void
    {
        $balance = $this->lockBalance($wallet, $currency);
        $balance->update(['balance' => bcadd((string) $balance->balance, $amount, 4)]);
    }

    protected function holdFunds(WalletBalance $balance, Transaction $tx, string $amount): void
    {
        $balance->update(['locked_balance' => bcadd((string) $balance->locked_balance, $amount, 4)]);
        $tx->update(['status' => 'held_for_review']);
    }

    protected function enforceKycLimit(User $user, string $amount, string $currency): void
    {
        if ((float) $this->rates->toAzn($amount, $currency) <= self::UNVERIFIED_TX_LIMIT_AZN || $user->isKycVerified()) {
            return;
        }

        throw new WalletException(
            'Transactions above ' . number_format(self::UNVERIFIED_TX_LIMIT_AZN) . ' AZN require identity verification (eKYC).',
            403,
            'kyc_required'
        );
    }

    /**
     * Run the fraud engine before any funds move. Blocks are persisted as failed transactions so
     * the alert has something to point at; 2FA step-ups are enforced here.
     */
    protected function screen(User $user, Wallet $wallet, string $amount, string $currency, string $type, string $description, Request $request, bool $holdable): array
    {
        $assessment = $this->fraud->assess($user, $amount, $currency, $type, $request);

        if ($assessment['action'] === 'hold' && !$holdable) {
            $assessment['action'] = 'block';
        }

        if ($assessment['action'] === 'block') {
            $tx = $this->newTransaction($user, $wallet, null, [
                'type' => $type,
                'status' => 'failed',
                'amount' => $amount,
                'currency_code' => $currency,
                'description' => $description . ' [blocked by risk engine]',
            ]);
            $this->fraud->record($tx, $assessment);

            throw new WalletException(
                'This transaction was blocked by our fraud protection. Contact support if this was you.',
                403,
                'blocked_by_risk_engine',
                ['risk_score' => $assessment['risk_score'], 'rules' => $assessment['triggered_rules']]
            );
        }

        if ($assessment['action'] === 'step_up_2fa') {
            if ($user->two_factor_enabled) {
                $code = (string) $request->input('two_factor_code', '');
                if ($code === '') {
                    throw new WalletException(
                        'High-value transaction: enter your 2FA code to confirm.',
                        428,
                        'step_up_required',
                        ['risk_score' => $assessment['risk_score'], 'rules' => $assessment['triggered_rules']]
                    );
                }
                if (!$this->auth->verifyTwoFactorCode($user, $code)) {
                    throw new WalletException('Invalid 2FA code.', 422, 'invalid_2fa');
                }
            }
            // Without 2FA we let it through but it is still recorded and alerted on.
            $assessment['action'] = 'flag';
        }

        return $assessment;
    }

    protected function newTransaction(User $user, Wallet $wallet, ?Request $request, array $attributes): Transaction
    {
        $key = $request?->header('Idempotency-Key');

        return Transaction::create(array_merge([
            'reference_number' => 'TX' . now()->format('ymdHis') . strtoupper(Str::random(6)),
            'wallet_id' => $wallet->id,
            'user_id' => $user->id,
            'fee' => 0,
            'idempotency_key' => $key ? hash('sha256', $user->id . '|' . $key) : null,
        ], $attributes));
    }

    protected function idempotent(User $user, Request $request): ?Transaction
    {
        $key = $request->header('Idempotency-Key');
        if (!$key) {
            return null;
        }

        return Transaction::where('idempotency_key', hash('sha256', $user->id . '|' . $key))->first();
    }

    protected function issueReceipt(PaymentRequest $paymentRequest, Transaction $tx, User $payer): PaymentConfirmation
    {
        return PaymentConfirmation::create([
            'payment_request_id' => $paymentRequest->id,
            'transaction_id' => $tx->id,
            'payer_id' => $payer->id,
            'amount' => $tx->amount,
            'currency_code' => $tx->currency_code,
            'receipt_number' => 'RC' . now()->format('ymd') . strtoupper(Str::random(8)),
            'confirmed_at' => now(),
        ]);
    }

    protected function auditTx(User $user, string $action, Transaction $tx, ?Request $request): void
    {
        $this->audit->log(
            user: $user,
            action: $action,
            entityType: Transaction::class,
            entityId: $tx->id,
            newValues: [
                'reference' => $tx->reference_number,
                'amount' => (float) $tx->amount,
                'currency' => $tx->currency_code,
                'status' => $tx->status,
            ],
            ip: $request?->ip(),
            userAgent: $request?->userAgent()
        );
    }

    public function notify(User $user, string $title, string $body, string $kind): void
    {
        $user->notify(new WalletActivity($title, $body, $kind));
    }
}
