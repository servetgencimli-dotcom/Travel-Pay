<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Department extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'description',
        'manager_name',
        'status',
    ];

    public function userGroups(): HasMany
    {
        return $this->hasMany(UserGroup::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
