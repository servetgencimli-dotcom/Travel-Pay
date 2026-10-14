<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FraudRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'rule_name',
        'rule_code',
        'description',
        'rule_type',
        'condition_operator',
        'threshold_value',
        'risk_weight',
        'is_active',
        'action',
    ];

    protected function casts(): array
    {
        return [
            'risk_weight' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
