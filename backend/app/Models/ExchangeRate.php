<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExchangeRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'from_currency',
        'to_currency',
        'rate',
        'inverse_rate',
        'effective_at',
    ];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:6',
            'inverse_rate' => 'decimal:6',
            'effective_at' => 'datetime',
        ];
    }
}
