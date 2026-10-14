<?php

namespace App\Services\Travel;

use App\Exceptions\WalletException;
use App\Models\TravelBooking;
use App\Models\Trip;
use App\Models\User;
use App\Services\Wallet\ExchangeRateService;
use App\Services\Wallet\LedgerService;
use App\Services\Wallet\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BookingService
{
    public function __construct(
        protected WalletService $wallet,
        protected CryptoService $crypto,
        protected TravelService $travel,
        protected ExchangeRateService $rates
    ) {}

    public function catalog(?string $type = null, ?string $search = null): array
    {
        $items = collect(config('travelpay.catalog'))
            ->flatMap(fn ($list, $kind) => collect($list)->map(fn ($item) => array_merge($item, [
                'type' => $kind,
                'unit' => match ($kind) {
                    'hotel' => 'night',
                    'flight' => 'passenger',
                    default => 'person',
                },
                'price_azn' => round((float) $this->rates->toAzn($item['price'], $item['currency']), 2),
            ])));

        if ($type) {
            $items = $items->where('type', $type);
        }
        if ($search) {
            $needle = mb_strtolower($search);
            $items = $items->filter(fn ($i) => str_contains(mb_strtolower($i['title'] . ' ' . $i['destination'] . ' ' . $i['provider']), $needle));
        }

        return $items->values()->all();
    }

    public function find(string $code): array
    {
        $item = collect($this->catalog())->firstWhere('code', $code);
        if (!$item) {
            throw new WalletException('Offer not found.', 404, 'offer_not_found');
        }

        return $item;
    }

    public function book(User $user, array $data, Request $request): TravelBooking
    {
        $item = $this->find($data['catalog_code']);
        $quantity = (int) ($data['quantity'] ?? 1);
        $start = Carbon::parse($data['start_date']);
        $end = $item['type'] === 'hotel' ? $start->copy()->addDays($quantity) : null;
        $amount = round($item['price'] * $quantity, 2);
        $method = $data['payment_method'] ?? 'wallet';

        $trip = isset($data['trip_id'])
            ? Trip::where('user_id', $user->id)->findOrFail($data['trip_id'])
            : $this->travel->currentTrip($user, $start);

        $reference = strtoupper(Str::random(3)) . '-' . random_int(100000, 999999);
        $description = ucfirst($item['type']) . ": {$item['title']}" . ($item['type'] === 'hotel' ? " ({$quantity} nights)" : " ×{$quantity}");
        $metadata = ['booking_reference' => $reference, 'catalog_code' => $item['code']];

        $cryptoAsset = null;
        $cryptoUnits = null;

        if ($method === 'crypto') {
            if (!$item['accepts_crypto']) {
                throw new WalletException("{$item['provider']} does not accept virtual assets for this offer.", 422, 'crypto_not_accepted');
            }
            $amountAzn = round((float) $this->rates->toAzn($amount, $item['currency']), 2);
            $result = $this->crypto->payWithCrypto($user, $data['crypto_asset'], $amountAzn, $description, LedgerService::TRAVEL_PAYABLE, $request, $metadata);
            $tx = $result['transaction'];
            $cryptoAsset = strtoupper($data['crypto_asset']);
            $cryptoUnits = $result['units'];
        } else {
            $tx = $this->wallet->spend($user, $amount, $item['currency'], 'booking', $description, LedgerService::TRAVEL_PAYABLE, $request, $metadata);
        }

        return DB::transaction(function () use ($user, $trip, $tx, $reference, $item, $start, $end, $quantity, $amount, $method, $cryptoAsset, $cryptoUnits, $description) {
            $booking = TravelBooking::create([
                'user_id' => $user->id,
                'trip_id' => $trip?->id,
                'transaction_id' => $tx->id,
                'booking_reference' => $reference,
                'booking_type' => $item['type'],
                'catalog_code' => $item['code'],
                'title' => $item['title'],
                'provider' => $item['provider'],
                'destination' => $item['destination'],
                'start_date' => $start,
                'end_date' => $end,
                'quantity' => $quantity,
                'amount' => $amount,
                'currency_code' => $item['currency'],
                'payment_method' => $method,
                'crypto_asset' => $cryptoAsset,
                'crypto_amount' => $cryptoUnits,
                'status' => 'confirmed',
            ]);

            if ($trip) {
                $this->travel->trackExpense($user, $tx, $item['type'], $description, $trip);
            }

            $paid = $method === 'crypto' ? "{$cryptoUnits} {$cryptoAsset}" : number_format($amount, 2) . " {$item['currency']}";
            $this->wallet->notify($user, 'Booking confirmed', "{$item['title']} — {$reference}, paid {$paid}", 'booking');

            return $booking;
        });
    }

    /**
     * Free cancellation up to the start date: wallet bookings are refunded to the wallet,
     * crypto bookings back to the same asset.
     */
    public function cancel(User $user, TravelBooking $booking, Request $request): TravelBooking
    {
        if ($booking->user_id !== $user->id) {
            abort(404);
        }
        if ($booking->status !== 'confirmed') {
            throw new WalletException('Booking is already cancelled.', 422, 'booking_cancelled');
        }
        if ($booking->start_date->isPast() && !$booking->start_date->isToday()) {
            throw new WalletException('Bookings can only be cancelled before the start date.', 422, 'booking_started');
        }

        return DB::transaction(function () use ($user, $booking, $request) {
            if ($booking->payment_method === 'crypto') {
                $this->crypto->refundToHolding($user, $booking->crypto_asset, (float) $booking->crypto_amount);
            } else {
                $this->wallet->receive(
                    $user, (string) $booking->amount, $booking->currency_code, 'refund',
                    "Refund: {$booking->title} ({$booking->booking_reference})",
                    LedgerService::TRAVEL_PAYABLE,
                    $request,
                    ['booking_reference' => $booking->booking_reference]
                );
            }

            if ($booking->transaction_id) {
                \App\Models\TravelExpense::where('transaction_id', $booking->transaction_id)->delete();
            }

            $booking->update(['status' => 'cancelled']);
            $this->wallet->notify($user, 'Booking cancelled', "{$booking->title} ({$booking->booking_reference}) was cancelled and refunded.", 'booking');

            return $booking;
        });
    }
}
