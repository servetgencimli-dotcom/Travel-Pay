<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\WalletException;
use App\Http\Controllers\Controller;
use App\Models\VirtualCard;
use App\Services\Security\AuditLogService;
use App\Services\Travel\TravelService;
use App\Services\Wallet\ExchangeRateService;
use App\Services\Wallet\LedgerService;
use App\Services\Wallet\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Tokenized virtual cards: the merchant only ever sees a token, never a real card number.
 */
class CardController extends Controller
{
    public function __construct(
        protected WalletService $wallet,
        protected ExchangeRateService $rates,
        protected TravelService $travel,
        protected AuditLogService $audit
    ) {}

    public function index(Request $request): JsonResponse
    {
        $cards = VirtualCard::where('user_id', $request->user()->id)
            ->where('status', '!=', 'cancelled')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($c) => $this->present($c));

        return $this->ok($cards);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:40'],
            'currency' => ['required', 'string', 'in:AZN,EUR,USD'],
            'spending_limit' => ['required', 'numeric', 'min:10', 'max:20000'],
            'is_single_use' => ['boolean'],
        ]);

        $user = $request->user();
        $wallet = $this->wallet->activeWallet($user);

        if (VirtualCard::where('user_id', $user->id)->whereIn('status', ['active', 'frozen'])->count() >= 5) {
            throw new WalletException('You can have at most 5 active virtual cards.', 422, 'card_limit');
        }

        $card = VirtualCard::create([
            'user_id' => $user->id,
            'wallet_id' => $wallet->id,
            'card_token' => 'tok_' . Str::random(40),
            'label' => $data['label'] ?? (($data['is_single_use'] ?? false) ? 'Single-use card' : 'Travel Card'),
            'brand' => 'VISA',
            'last_four' => (string) random_int(1000, 9999),
            'expiry_month' => (int) now()->addYears(3)->format('n'),
            'expiry_year' => (int) now()->addYears(3)->format('Y'),
            'currency_code' => $data['currency'],
            'spending_limit' => $data['spending_limit'],
            'is_single_use' => $data['is_single_use'] ?? false,
        ]);

        $this->audit->log($user, 'card.created', VirtualCard::class, $card->id, null, ['last_four' => $card->last_four, 'limit' => (float) $card->spending_limit], $request->ip(), $request->userAgent());

        return $this->ok($this->present($card), 'Virtual card issued.', 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $card = VirtualCard::where('user_id', $request->user()->id)->findOrFail($id);
        $data = $request->validate([
            'status' => ['sometimes', 'string', 'in:active,frozen'],
            'spending_limit' => ['sometimes', 'numeric', 'min:10', 'max:20000'],
            'allow_online' => ['sometimes', 'boolean'],
            'allow_international' => ['sometimes', 'boolean'],
            'label' => ['sometimes', 'string', 'max:40'],
        ]);

        if (in_array($card->status, ['used', 'cancelled'], true)) {
            throw new WalletException('This card can no longer be changed.', 422, 'card_closed');
        }

        $old = $card->only(array_keys($data));
        $card->update($data);
        $this->audit->log($request->user(), 'card.updated', VirtualCard::class, $card->id, $old, $data, $request->ip(), $request->userAgent());

        return $this->ok($this->present($card), 'Card updated.');
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $card = VirtualCard::where('user_id', $request->user()->id)->findOrFail($id);
        $card->update(['status' => 'cancelled']);
        $this->audit->log($request->user(), 'card.cancelled', VirtualCard::class, $card->id, null, null, $request->ip(), $request->userAgent());

        return $this->ok(null, 'Card cancelled. Its token can no longer be charged.');
    }

    /**
     * Sandbox merchant charge: authorises a payment against the card token.
     */
    public function charge(Request $request, int $id): JsonResponse
    {
        $card = VirtualCard::where('user_id', $request->user()->id)->findOrFail($id);
        $data = $request->validate([
            'merchant' => ['required', 'string', 'max:80'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:20000'],
            'category' => ['required', 'string', 'in:Hotels,Restaurants,Transportation,Museums,Shopping,Entertainment,Other'],
            'online' => ['boolean'],
            'international' => ['boolean'],
            'two_factor_code' => ['nullable', 'string', 'max:20'],
        ]);

        $decline = match (true) {
            $card->status === 'frozen' => 'Card is frozen.',
            $card->status !== 'active' => 'Card is no longer active.',
            ($data['online'] ?? false) && !$card->allow_online => 'Online payments are disabled for this card.',
            ($data['international'] ?? false) && !$card->allow_international => 'International payments are disabled for this card.',
            bccomp($card->remainingLimit(), number_format((float) $data['amount'], 4, '.', ''), 4) < 0 => 'Monthly spending limit exceeded.',
            default => null,
        };

        if ($decline) {
            throw new WalletException("Declined: {$decline}", 422, 'card_declined');
        }

        $tx = $this->wallet->spend(
            $request->user(),
            $data['amount'],
            $card->currency_code,
            'card_payment',
            "Card •••• {$card->last_four} at {$data['merchant']}",
            LedgerService::CARD_SETTLEMENT,
            $request,
            ['card_token' => substr($card->card_token, 0, 12) . '…', 'last_four' => $card->last_four, 'merchant_name' => $data['merchant'], 'category' => $data['category']],
            function () use ($card, $data) {
                // Re-check under a row lock so parallel charges cannot exceed the limit or reuse a single-use card.
                $locked = VirtualCard::whereKey($card->id)->lockForUpdate()->first();
                $amount = number_format((float) $data['amount'], 4, '.', '');
                if ($locked->status !== 'active') {
                    throw new WalletException('Declined: Card is no longer active.', 422, 'card_declined');
                }
                if (bccomp($locked->remainingLimit(), $amount, 4) < 0) {
                    throw new WalletException('Declined: Monthly spending limit exceeded.', 422, 'card_declined');
                }
                $locked->update([
                    'spent_this_month' => bcadd((string) $locked->spent_this_month, $amount, 4),
                    'status' => $locked->is_single_use ? 'used' : $locked->status,
                ]);
            }
        );

        $this->travel->trackExpense($request->user(), $tx, $data['category'], "{$data['merchant']} (card •••• {$card->last_four})");
        $this->wallet->notify($request->user(), 'Card payment', "-" . number_format((float) $data['amount'], 2) . " {$card->currency_code} at {$data['merchant']}", 'card');

        return $this->ok([
            'reference' => $tx->reference_number,
            'authorization_code' => strtoupper(Str::random(6)),
            'card' => $this->present($card->fresh()),
        ], 'Payment authorised with card token.', 201);
    }

    protected function present(VirtualCard $c): array
    {
        return [
            'id' => $c->id,
            'label' => $c->label,
            'brand' => $c->brand,
            'masked_pan' => '•••• •••• •••• ' . $c->last_four,
            'last_four' => $c->last_four,
            'token_preview' => substr($c->card_token, 0, 12) . '…',
            'expiry' => sprintf('%02d/%02d', $c->expiry_month, $c->expiry_year % 100),
            'currency_code' => $c->currency_code,
            'spending_limit' => (float) $c->spending_limit,
            'spent_this_month' => (float) $c->spent_this_month,
            'remaining' => (float) $c->remainingLimit(),
            'is_single_use' => $c->is_single_use,
            'allow_online' => $c->allow_online,
            'allow_international' => $c->allow_international,
            'status' => $c->status,
        ];
    }
}
