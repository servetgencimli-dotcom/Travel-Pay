<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Merchant;
use App\Models\PaymentConfirmation;
use App\Models\PaymentRequest;
use App\Services\Wallet\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    public function __construct(
        protected WalletService $wallet
    ) {}

    /**
     * Tourist places / partner merchants with their static payment QR.
     */
    public function places(Request $request): JsonResponse
    {
        $query = Merchant::where('status', 'active')
            ->with(['paymentRequests' => fn ($q) => $q->whereNull('amount')->where('status', 'pending')]);

        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }
        if ($city = $request->input('city')) {
            $query->where('city', $city);
        }
        if ($search = $request->input('search')) {
            $query->where(fn ($q) => $q->where('merchant_name', 'like', "%{$search}%")->orWhere('description', 'like', "%{$search}%"));
        }

        $places = $query->orderByDesc('rating')->get()->map(fn (Merchant $m) => [
            'id' => $m->id,
            'name' => $m->merchant_name,
            'code' => $m->merchant_code,
            'category' => $m->category,
            'city' => $m->city,
            'address' => $m->address,
            'description' => $m->description,
            'rating' => (float) $m->rating,
            'cashback_percent' => (float) $m->cashback_percent,
            'accepts_crypto' => $m->accepts_crypto,
            'qr_token' => $m->paymentRequests->first()?->qr_code_token,
            'currency_code' => $m->paymentRequests->first()?->currency_code ?? 'AZN',
        ]);

        return $this->ok([
            'places' => $places,
            'categories' => Merchant::where('status', 'active')->distinct()->orderBy('category')->pluck('category'),
            'cities' => Merchant::where('status', 'active')->whereNotNull('city')->distinct()->orderBy('city')->pluck('city'),
        ]);
    }

    /**
     * Personal "request money" QR that another TravelPay user can scan and pay.
     */
    public function createRequest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:100000'],
            'currency' => ['required', 'string', 'in:AZN,EUR,USD'],
            'description' => ['nullable', 'string', 'max:140'],
            'expires_in_minutes' => ['nullable', 'integer', 'min:5', 'max:10080'],
        ]);

        $this->wallet->activeWallet($request->user());

        $paymentRequest = PaymentRequest::create([
            'creator_user_id' => $request->user()->id,
            'qr_code_token' => Str::random(40),
            'amount' => $data['amount'],
            'currency_code' => $data['currency'],
            'description' => $data['description'] ?? null,
            'status' => 'pending',
            'expires_at' => now()->addMinutes($data['expires_in_minutes'] ?? 60),
        ]);

        return $this->ok($this->presentRequest($paymentRequest), 'Payment QR created.', 201);
    }

    public function myRequests(Request $request): JsonResponse
    {
        $requests = PaymentRequest::where('creator_user_id', $request->user()->id)
            ->whereNull('merchant_id')
            ->with('confirmation.payer:id,name')
            ->orderByDesc('id')
            ->take(20)
            ->get()
            ->map(fn ($r) => $this->presentRequest($r));

        return $this->ok($requests);
    }

    public function cancelRequest(Request $request, int $id): JsonResponse
    {
        $paymentRequest = PaymentRequest::where('creator_user_id', $request->user()->id)->whereNull('merchant_id')->findOrFail($id);
        if ($paymentRequest->status === 'pending') {
            $paymentRequest->update(['status' => 'cancelled']);
        }

        return $this->ok($this->presentRequest($paymentRequest), 'Payment request cancelled.');
    }

    /**
     * Resolve a scanned QR code before paying so the user sees who they are paying.
     */
    public function lookup(string $token): JsonResponse
    {
        $paymentRequest = PaymentRequest::where('qr_code_token', $this->normalizeToken($token))
            ->with(['merchant', 'creator:id,name'])
            ->firstOrFail();

        return $this->ok($this->presentRequest($paymentRequest));
    }

    public function pay(Request $request, string $token): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['nullable', 'numeric', 'min:0.01', 'max:100000'],
            'two_factor_code' => ['nullable', 'string', 'max:20'],
        ]);

        $paymentRequest = PaymentRequest::where('qr_code_token', $this->normalizeToken($token))->firstOrFail();
        $result = $this->wallet->payRequest($request->user(), $paymentRequest, $data['amount'] ?? null, $request);
        $tx = $result['transaction'];
        $held = $tx->status === 'held_for_review';

        return $this->ok([
            'reference' => $tx->reference_number,
            'status' => $tx->status,
            'amount' => (float) $tx->amount,
            'currency_code' => $tx->currency_code,
            'payee' => $paymentRequest->merchant?->merchant_name ?? $paymentRequest->creator->name,
            'receipt_number' => $result['receipt']?->receipt_number,
            'cashback' => $result['cashback'],
            'risk_score' => $tx->risk_score,
        ], $held ? 'Payment held for security review.' : 'Payment successful.', $held ? 202 : 201);
    }

    public function receipts(Request $request): JsonResponse
    {
        $receipts = PaymentConfirmation::where('payer_id', $request->user()->id)
            ->with(['paymentRequest.merchant:id,merchant_name,category', 'paymentRequest.creator:id,name', 'transaction:id,reference_number,metadata'])
            ->orderByDesc('id')
            ->take(30)
            ->get()
            ->map(fn (PaymentConfirmation $c) => [
                'receipt_number' => $c->receipt_number,
                'payee' => $c->paymentRequest?->merchant?->merchant_name ?? $c->paymentRequest?->creator?->name,
                'category' => $c->paymentRequest?->merchant?->category,
                'amount' => (float) $c->amount,
                'currency_code' => $c->currency_code,
                'cashback' => $c->transaction?->metadata['cashback'] ?? 0,
                'reference' => $c->transaction?->reference_number,
                'confirmed_at' => $c->confirmed_at?->toISOString(),
            ]);

        return $this->ok($receipts);
    }

    protected function normalizeToken(string $token): string
    {
        // Accept both the raw token and the full deep link "travelpay://pay/{token}".
        return trim(Str::afterLast(trim($token), '/'));
    }

    protected function presentRequest(PaymentRequest $r): array
    {
        $r->loadMissing(['merchant', 'creator:id,name']);

        return [
            'id' => $r->id,
            'token' => $r->qr_code_token,
            'qr_payload' => "travelpay://pay/{$r->qr_code_token}",
            'payee' => $r->merchant?->merchant_name ?? $r->creator?->name,
            'payee_type' => $r->merchant ? 'merchant' : 'person',
            'category' => $r->merchant?->category,
            'cashback_percent' => (float) ($r->merchant?->cashback_percent ?? 0),
            'amount' => $r->amount !== null ? (float) $r->amount : null,
            'currency_code' => $r->currency_code,
            'description' => $r->description,
            'status' => ($r->status === 'pending' && $r->expires_at?->isPast()) ? 'expired' : $r->status,
            'expires_at' => $r->expires_at?->toISOString(),
            'paid_by' => $r->relationLoaded('confirmation') ? $r->confirmation?->payer?->name : null,
            'created_at' => $r->created_at?->toISOString(),
        ];
    }
}
