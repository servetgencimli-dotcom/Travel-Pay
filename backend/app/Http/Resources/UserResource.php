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
            'status' => $this->status,
            'two_factor_enabled' => (bool) $this->two_factor_enabled,
            'last_login_at' => $this->last_login_at?->toISOString(),
            'avatar_url' => $this->avatar_url,
            'wallet' => new WalletResource($this->whenLoaded('wallet')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
