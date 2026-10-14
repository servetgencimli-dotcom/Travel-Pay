<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LedgerAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'account_number',
        'account_name',
        'type',
        'currency_code',
        'balance',
    ];

    protected function casts(): array
    {
        return [
            'balance' => 'decimal:4',
        ];
    }

    public function entries(): HasMany
    {
        return $this->hasMany(LedgerEntry::class);
    }
}
