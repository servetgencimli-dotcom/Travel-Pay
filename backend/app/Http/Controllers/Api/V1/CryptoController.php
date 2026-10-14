<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\Travel\CryptoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CryptoController extends Controller
{
    public function __construct(
        protected CryptoService $crypto
    ) {}

    public function prices(): JsonResponse
    {
        return $this->ok($this->crypto->prices());
    }

    public function portfolio(Request $request): JsonResponse
    {
        $wallet = $request->user()->wallet;

        return $this->ok(array_merge($this->crypto->portfolio($wallet), [
            'prices' => $this->crypto->prices(),
            'history' => Transaction::where('user_id', $request->user()->id)
                ->whereIn('type', ['crypto_buy', 'crypto_sell', 'crypto_payment'])
                ->orderByDesc('id')
                ->take(15)
                ->get(['reference_number', 'type', 'amount', 'currency_code', 'description', 'metadata', 'created_at']),
        ]));
    }

    public function buy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'asset' => ['required', 'string', 'max:10'],
            'amount_azn' => ['required', 'numeric', 'min:5', 'max:100000'],
            'two_factor_code' => ['nullable', 'string', 'max:20'],
        ]);

        $result = $this->crypto->buy($request->user(), $data['asset'], (float) $data['amount_azn'], $request);

        return $this->ok([
            'reference' => $result['transaction']->reference_number,
            'units' => $result['units'],
            'price_azn' => $result['price_azn'],
        ], "Bought {$result['units']} " . strtoupper($data['asset']) . '.', 201);
    }

    public function sell(Request $request): JsonResponse
    {
        $data = $request->validate([
            'asset' => ['required', 'string', 'max:10'],
            'units' => ['required', 'numeric', 'min:0.00000001'],
        ]);

        $result = $this->crypto->sell($request->user(), $data['asset'], (float) $data['units'], $request);

        return $this->ok([
            'reference' => $result['transaction']->reference_number,
            'proceeds_azn' => $result['proceeds_azn'],
            'price_azn' => $result['price_azn'],
        ], 'Sold for ' . number_format($result['proceeds_azn'], 2) . ' AZN.', 201);
    }
}
