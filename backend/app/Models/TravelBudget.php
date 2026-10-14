<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TravelBudget extends Model
{
    use HasFactory;

    protected $fillable = [
        'trip_id',
        'currency_code',
        'total_budget',
        'allocated_budget',
    ];

    protected function casts(): array
    {
        return [
            'total_budget' => 'decimal:4',
            'allocated_budget' => 'decimal:4',
        ];
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }
}
