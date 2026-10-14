<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference_number',
        'wallet_id',
        'user_id',
        'type',
        'status',
        'amount',
        'fee',
        'currency_code',
        'recipient_wallet_id',
        'recipient_user_id',
        'description',
        'idempotency_key',
        'risk_score',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:4',
            'fee' => 'decimal:4',
            'risk_score' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function recipientWallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class, 'recipient_wallet_id');
    }

    public function recipientUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_user_id');
    }

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(LedgerEntry::class);
    }

    public function riskAssessment(): HasOne
    {
        return $this->hasOne(TransactionRiskAssessment::class);
    }

    public function fraudAlerts(): HasMany
    {
        return $this->hasMany(FraudAlert::class);
    }
}
