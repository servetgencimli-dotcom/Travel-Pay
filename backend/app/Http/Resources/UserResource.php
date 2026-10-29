<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => $this->role,
            'department_id' => $this->department_id,
            'department' => $this->department ? [
                'id' => $this->department->id,
                'name' => $this->department->name,
                'code' => $this->department->code,
            ] : null,
            'user_group_id' => $this->user_group_id,
            'user_group' => $this->userGroup ? [
                'id' => $this->userGroup->id,
                'name' => $this->userGroup->name,
                'slug' => $this->userGroup->slug,
            ] : null,
            'permissions' => $this->isSystemAdmin()
                ? \App\Models\Permission::pluck('slug')->toArray()
                : ($this->userGroup ? $this->userGroup->permissions->pluck('slug')->toArray() : []),
            'is_system_admin' => $this->isSystemAdmin(),
            'can_manage_permissions' => $this->canManagePermissions(),
            'can_access_admin' => $this->canAccessAdmin(),
            'status' => $this->status,
            'two_factor_enabled' => (bool) $this->two_factor_enabled,
            'last_login_at' => $this->last_login_at?->toISOString(),
            'avatar_url' => $this->avatar_url,
            'wallet' => new WalletResource($this->whenLoaded('wallet')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
