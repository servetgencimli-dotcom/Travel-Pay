<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CurrencyConversion extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'wallet_id',
        'transaction_id',
        'from_currency',
        'to_currency',
        'from_amount',
        'to_amount',
        'exchange_rate',
        'fee',
    ];

    protected function casts(): array
    {
        return [
            'from_amount' => 'decimal:4',
            'to_amount' => 'decimal:4',
            'exchange_rate' => 'decimal:6',
            'fee' => 'decimal:4',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
