<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UserDevice extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'device_uuid',
        'device_name',
        'device_type',
        'os',
        'ip_address',
        'last_active_at',
        'is_trusted',
        'fcm_token',
    ];

    protected function casts(): array
    {
        return [
            'last_active_at' => 'datetime',
            'is_trusted' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function securityEvents(): HasMany
    {
        return $this->hasMany(SecurityEvent::class, 'device_id');
    }
}
