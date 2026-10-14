<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TravelBooking;
use App\Services\Travel\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function __construct(
        protected BookingService $bookings
    ) {}

    public function catalog(Request $request): JsonResponse
    {
        return $this->ok($this->bookings->catalog($request->input('type'), $request->input('search')));
    }

    public function index(Request $request): JsonResponse
    {
        return $this->ok(
            TravelBooking::where('user_id', $request->user()->id)
                ->with('trip:id,title')
                ->orderByDesc('id')
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'catalog_code' => ['required', 'string', 'max:32'],
            'start_date' => ['required', 'date', 'after_or_equal:today'],
            'quantity' => ['required', 'integer', 'min:1', 'max:30'],
            'payment_method' => ['required', 'string', 'in:wallet,crypto'],
            'crypto_asset' => ['required_if:payment_method,crypto', 'nullable', 'string', 'max:10'],
            'trip_id' => ['nullable', 'integer'],
            'two_factor_code' => ['nullable', 'string', 'max:20'],
        ]);

        $booking = $this->bookings->book($request->user(), $data, $request);

        return $this->ok($booking, "Booking confirmed: {$booking->booking_reference}", 201);
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $booking = TravelBooking::where('user_id', $request->user()->id)->findOrFail($id);

        return $this->ok($this->bookings->cancel($request->user(), $booking, $request), 'Booking cancelled and refunded.');
    }
}
