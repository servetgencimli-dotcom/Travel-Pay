<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LinkedBankAccount;
use App\Models\Transaction;
use App\Services\Security\AuditLogService;
use App\Services\Security\SecurityAlertService;
use App\Services\Travel\CryptoService;
use App\Services\Wallet\ExchangeRateService;
use App\Services\Wallet\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class WalletController extends Controller
{
    public function __construct(
        protected WalletService $wallet,
        protected ExchangeRateService $rates,
        protected CryptoService $crypto
    ) {}

    /**
     * Home dashboard: balances, total net worth in AZN, crypto value, recent activity.
     */
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        $wallet = $user->wallet()->with('balances')->firstOrFail();

        $balances = $wallet->balances->sortBy(fn ($b) => array_search($b->currency_code, WalletService::SUPPORTED_CURRENCIES))->values()
            ->map(fn ($b) => [
                'currency_code' => $b->currency_code,
                'balance' => (float) $b->balance,
                'locked_balance' => (float) $b->locked_balance,
                'available_balance' => (float) $b->available_balance,
                'value_azn' => round((float) $this->rates->toAzn($b->balance, $b->currency_code), 2),
            ]);

        $crypto = $this->crypto->portfolio($wallet);
        $fiatAzn = $balances->sum('value_azn');

        $recent = Transaction::where(fn ($q) => $q->where('user_id', $user->id)->orWhere('recipient_user_id', $user->id))
            ->with(['user:id,name', 'recipientUser:id,name'])
            ->orderByDesc('id')
            ->take(8)
            ->get()
            ->map(fn ($tx) => $this->present($tx, $user->id));

        $monthStart = now()->startOfMonth();
        $monthOut = Transaction::where('user_id', $user->id)
            ->where('status', 'completed')
            ->whereIn('type', ['transfer', 'payment', 'booking', 'card_payment', 'crypto_payment'])
            ->where('created_at', '>=', $monthStart)
            ->get()
            ->sum(fn ($tx) => (float) $this->rates->toAzn($tx->amount, $tx->currency_code));

        return $this->ok([
            'wallet' => [
                'id' => $wallet->id,
                'wallet_number' => $wallet->wallet_number,
                'status' => $wallet->status,
            ],
            'balances' => $balances,
            'net_worth_azn' => round($fiatAzn + $crypto['total_value_azn'], 2),
            'fiat_value_azn' => round($fiatAzn, 2),
            'crypto_value_azn' => $crypto['total_value_azn'],
            'spent_this_month_azn' => round($monthOut, 2),
            'kyc_verified' => $user->isKycVerified(),
            'two_factor_enabled' => (bool) $user->two_factor_enabled,
            'unread_notifications' => $user->unreadNotifications()->count(),
            'recent_transactions' => $recent,
            'rates' => $this->rates->all(),
        ]);
    }

    public function transactions(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Transaction::where(fn ($q) => $q->where('user_id', $user->id)
            ->orWhere(fn ($q) => $q->where('recipient_user_id', $user->id)->where('status', 'completed')))
            ->with(['user:id,name', 'recipientUser:id,name']);

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }
        if ($currency = $request->input('currency')) {
            $query->where('currency_code', strtoupper($currency));
        }
        if ($search = $request->input('search')) {
            $query->where(fn ($q) => $q->where('description', 'like', "%{$search}%")->orWhere('reference_number', 'like', "%{$search}%"));
        }

        return $this->paginated(
            $query->orderByDesc('id')->paginate($request->integer('per_page', 15)),
            fn ($tx) => $this->present($tx, $user->id)
        );
    }

    public function showTransaction(Request $request, string $reference): JsonResponse
    {
        $user = $request->user();
        $tx = Transaction::where('reference_number', $reference)
            ->where(fn ($q) => $q->where('user_id', $user->id)->orWhere('recipient_user_id', $user->id))
            ->with(['user:id,name,email', 'recipientUser:id,name,email', 'riskAssessment', 'ledgerEntries.ledgerAccount:id,account_number,account_name'])
            ->firstOrFail();

        return $this->ok(array_merge($this->present($tx, $user->id), [
            'risk' => $tx->riskAssessment,
            'ledger_entries' => $tx->ledgerEntries,
        ]));
    }

    public function lookupRecipient(Request $request): JsonResponse
    {
        $request->validate(['query' => ['required', 'string', 'max:100']]);
        $recipient = $this->wallet->findRecipient($request->input('query'));

        if (!$recipient || $recipient->id === $request->user()->id) {
            return response()->json(['status' => 'error', 'message' => 'Recipient not found.'], 404);
        }

        return $this->ok([
            'name' => $recipient->name,
            'wallet_number' => $recipient->wallet?->wallet_number,
            'masked_email' => preg_replace('/(?<=.).(?=[^@]*@)/', '*', $recipient->email),
        ]);
    }

    public function transfer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'recipient' => ['required', 'string', 'max:100'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:1000000'],
            'currency' => ['required', 'string', 'size:3'],
            'note' => ['nullable', 'string', 'max:140'],
            'two_factor_code' => ['nullable', 'string', 'max:20'],
        ]);

        $tx = $this->wallet->transfer($request->user(), $data['recipient'], $data['amount'], $data['currency'], $data['note'] ?? null, $request);
        $held = $tx->status === 'held_for_review';

        return $this->ok(
            $this->present($tx->load('recipientUser:id,name'), $request->user()->id),
            $held ? 'Transfer is held for a security review. Funds are reserved until approved.' : 'Transfer completed.',
            $held ? 202 : 201
        );
    }

    public function quote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'from' => ['required', 'string', 'size:3'],
            'to' => ['required', 'string', 'size:3'],
        ]);

        return $this->ok($this->wallet->quoteExchange($data['amount'], $data['from'], $data['to']));
    }

    public function exchange(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:1000000'],
            'from' => ['required', 'string', 'size:3'],
            'to' => ['required', 'string', 'size:3', 'different:from'],
            'two_factor_code' => ['nullable', 'string', 'max:20'],
        ]);

        $tx = $this->wallet->exchange($request->user(), $data['amount'], $data['from'], $data['to'], $request);

        return $this->ok($this->present($tx, $request->user()->id), 'Currency exchanged.', 201);
    }

    public function topUp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'bank_account_id' => ['required', 'integer'],
            'amount' => ['required', 'numeric', 'min:1', 'max:50000'],
        ]);

        $account = LinkedBankAccount::where('user_id', $request->user()->id)->findOrFail($data['bank_account_id']);
        $tx = $this->wallet->topUp($request->user(), $account, $data['amount'], $request);

        return $this->ok($this->present($tx, $request->user()->id), 'Wallet topped up via Open Banking.', 201);
    }

    public function rates(): JsonResponse
    {
        return $this->ok($this->rates->all());
    }

    /**
     * Panic button: the owner can freeze their own wallet instantly (lost phone, suspected fraud).
     */
    public function freeze(Request $request, AuditLogService $audit, SecurityAlertService $alerts): JsonResponse
    {
        $user = $request->user();
        $user->wallet->update(['status' => 'frozen']);
        $user->tokens()->where('id', '!=', $user->currentAccessToken()?->id)->delete();

        $alerts->recordSecurityEvent($user, 'wallet_self_frozen', 'medium', $request->ip(), $request->userAgent());
        $audit->log($user, 'wallet.freeze', 'wallet', $user->wallet->id, ['status' => 'active'], ['status' => 'frozen'], $request->ip(), $request->userAgent());
        $this->wallet->notify($user, 'Wallet frozen', 'All outgoing payments are blocked and other sessions were signed out.', 'security');

        return $this->ok(['status' => 'frozen'], 'Wallet frozen. All other sessions were signed out.');
    }

    public function unfreeze(Request $request, AuditLogService $audit, SecurityAlertService $alerts): JsonResponse
    {
        $request->validate(['password' => ['required', 'string']]);
        $user = $request->user();

        if (!Hash::check($request->input('password'), $user->password)) {
            $alerts->recordSecurityEvent($user, 'wallet_unfreeze_failed', 'medium', $request->ip(), $request->userAgent());
            throw ValidationException::withMessages(['password' => ['Incorrect password.']]);
        }

        $user->wallet->update(['status' => 'active']);
        $alerts->recordSecurityEvent($user, 'wallet_unfrozen', 'info', $request->ip(), $request->userAgent());
        $audit->log($user, 'wallet.unfreeze', 'wallet', $user->wallet->id, ['status' => 'frozen'], ['status' => 'active'], $request->ip(), $request->userAgent());

        return $this->ok(['status' => 'active'], 'Wallet unfrozen.');
    }

    /**
     * Shape a transaction from the viewer's point of view (direction, counterparty).
     */
    public function present(Transaction $tx, int $viewerId): array
    {
        $incoming = $tx->recipient_user_id === $viewerId && $tx->user_id !== $viewerId;
        $isCredit = $incoming || in_array($tx->type, ['top_up', 'refund', 'crypto_sell'], true);

        return [
            'id' => $tx->id,
            'reference' => $tx->reference_number,
            'type' => $tx->type,
            'status' => $tx->status,
            'direction' => $isCredit ? 'in' : 'out',
            'amount' => (float) $tx->amount,
            'fee' => (float) $tx->fee,
            'currency_code' => $tx->currency_code,
            'description' => $incoming ? "From {$tx->user?->name}" . ($tx->type === 'payment' ? ' (QR payment)' : '') : $tx->description,
            'counterparty' => $incoming ? $tx->user?->name : $tx->recipientUser?->name,
            'risk_score' => $tx->risk_score,
            'metadata' => $tx->metadata,
            'created_at' => $tx->created_at?->toISOString(),
        ];
    }
}
