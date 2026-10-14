<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TravelBooking extends Model
{
    protected $fillable = [
        'user_id',
        'trip_id',
        'transaction_id',
        'booking_reference',
        'booking_type',
        'catalog_code',
        'title',
        'provider',
        'destination',
        'start_date',
        'end_date',
        'quantity',
        'amount',
        'currency_code',
        'payment_method',
        'crypto_asset',
        'crypto_amount',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'quantity' => 'integer',
            'amount' => 'decimal:4',
            'crypto_amount' => 'decimal:8',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
