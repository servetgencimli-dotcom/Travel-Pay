<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransactionRiskAssessment extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'transaction_id',
        'user_id',
        'risk_score',
        'risk_level',
        'factors',
        'recommended_action',
        'is_resolved',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'risk_score' => 'integer',
            'factors' => 'array',
            'is_resolved' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
