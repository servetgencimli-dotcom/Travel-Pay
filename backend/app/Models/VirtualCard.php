<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VirtualCard extends Model
{
    protected $fillable = [
        'user_id',
        'wallet_id',
        'card_token',
        'label',
        'brand',
        'last_four',
        'expiry_month',
        'expiry_year',
        'currency_code',
        'spending_limit',
        'spent_this_month',
        'is_single_use',
        'allow_online',
        'allow_international',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'spending_limit' => 'decimal:4',
            'spent_this_month' => 'decimal:4',
            'is_single_use' => 'boolean',
            'allow_online' => 'boolean',
            'allow_international' => 'boolean',
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

    public function remainingLimit(): string
    {
        return bcsub((string) $this->spending_limit, (string) $this->spent_this_month, 4);
    }
}
