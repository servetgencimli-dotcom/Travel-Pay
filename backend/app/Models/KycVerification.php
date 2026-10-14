<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KycVerification extends Model
{
    protected $fillable = [
        'user_id',
        'document_type',
        'document_number_masked',
        'document_number_hash',
        'nationality',
        'date_of_birth',
        'liveness_score',
        'document_score',
        'status',
        'rejection_reason',
        'verified_at',
    ];

    protected $hidden = [
        'document_number_hash',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'liveness_score' => 'integer',
            'document_score' => 'integer',
            'verified_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
