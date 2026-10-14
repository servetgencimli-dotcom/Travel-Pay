<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletBalance extends Model
{
    use HasFactory;

    protected $fillable = [
        'wallet_id',
        'currency_code',
        'balance',
        'locked_balance',
    ];

    protected function casts(): array
    {
        return [
            'balance' => 'decimal:4',
            'locked_balance' => 'decimal:4',
        ];
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }

    public function getAvailableBalanceAttribute(): string
    {
        return bcsub((string) $this->balance, (string) $this->locked_balance, 4);
    }
}
