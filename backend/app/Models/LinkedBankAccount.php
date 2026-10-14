<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LinkedBankAccount extends Model
{
    protected $fillable = [
        'user_id',
        'bank_name',
        'bank_code',
        'iban_masked',
        'iban_hash',
        'account_holder',
        'currency_code',
        'available_balance',
        'consent_token_hash',
        'consent_expires_at',
        'status',
    ];

    protected $hidden = [
        'iban_hash',
        'consent_token_hash',
    ];

    protected function casts(): array
    {
        return [
            'available_balance' => 'decimal:4',
            'consent_expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function hasValidConsent(): bool
    {
        return $this->status === 'active'
            && $this->consent_expires_at !== null
            && $this->consent_expires_at->isFuture();
    }
}
