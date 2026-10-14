<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CryptoAsset extends Model
{
    protected $fillable = [
        'code',
        'name',
        'network',
        'base_price_azn',
        'precision',
        'color',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'base_price_azn' => 'decimal:8',
            'precision' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
