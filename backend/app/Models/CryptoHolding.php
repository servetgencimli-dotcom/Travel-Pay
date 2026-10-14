<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CryptoHolding extends Model
{
    protected $fillable = [
        'wallet_id',
        'asset_code',
        'amount',
        'average_cost_azn',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:8',
            'average_cost_azn' => 'decimal:8',
        ];
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }
}
