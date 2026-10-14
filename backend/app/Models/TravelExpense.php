<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TravelExpense extends Model
{
    use HasFactory;

    protected $fillable = [
        'trip_id',
        'user_id',
        'expense_category_id',
        'transaction_id',
        'amount',
        'original_currency',
        'reporting_amount',
        'reporting_currency',
        'exchange_rate',
        'description',
        'spent_at',
        'receipt_path',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:4',
            'reporting_amount' => 'decimal:4',
            'exchange_rate' => 'decimal:6',
            'spent_at' => 'datetime',
        ];
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id');
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
