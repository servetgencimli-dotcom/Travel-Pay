<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Currency extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'symbol',
        'precision',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'precision' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
