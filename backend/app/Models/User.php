<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'role',
        'department_id',
        'user_group_id',
        'status',
        'two_factor_enabled',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_confirmed_at',
        'last_login_at',
        'last_login_ip',
        'avatar_url',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_enabled' => 'boolean',
            'two_factor_confirmed_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin' || $this->isSystemAdmin();
    }

    public function isSystemAdmin(): bool
    {
        if ($this->role === 'admin') {
            return true;
        }

        return $this->userGroup && $this->userGroup->slug === 'system_administrator';
    }

    public function canManagePermissions(): bool
    {
        return $this->isSystemAdmin() || $this->hasPermission('manage_permissions');
    }

    public function canAccessAdmin(): bool
    {
        return $this->isAdmin() || $this->user_group_id !== null || $this->hasPermission('view_dashboard');
    }

    public function hasPermission(string $permissionSlug): bool
    {
        if ($this->isSystemAdmin()) {
            return true;
        }

        if (!$this->relationLoaded('userGroup')) {
            $this->load('userGroup.permissions');
        }

        return $this->userGroup?->permissions->contains('slug', $permissionSlug) ?? false;
    }

    public function department(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function userGroup(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(UserGroup::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function wallet(): HasOne
    {
        return $this->hasOne(Wallet::class);
    }

    public function devices(): HasMany
    {
        return $this->hasMany(UserDevice::class);
    }

    public function securityEvents(): HasMany
    {
        return $this->hasMany(SecurityEvent::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function trips(): HasMany
    {
        return $this->hasMany(Trip::class);
    }

    public function fraudAlerts(): HasMany
    {
        return $this->hasMany(FraudAlert::class);
    }

    public function bankAccounts(): HasMany
    {
        return $this->hasMany(LinkedBankAccount::class);
    }

    public function kycVerifications(): HasMany
    {
        return $this->hasMany(KycVerification::class);
    }

    public function latestKyc(): HasOne
    {
        return $this->hasOne(KycVerification::class)->latestOfMany();
    }

    public function virtualCards(): HasMany
    {
        return $this->hasMany(VirtualCard::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(TravelBooking::class);
    }

    public function isKycVerified(): bool
    {
        return $this->kycVerifications()->where('status', 'verified')->exists();
    }
}
