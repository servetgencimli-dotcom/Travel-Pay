<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FraudAlert extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'transaction_id',
        'severity',
        'status',
        'risk_score',
        'title',
        'description',
        'details',
        'triggered_rules',
        'resolved_by',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'risk_score' => 'integer',
            'details' => 'array',
            'triggered_rules' => 'array',
            'resolved_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
