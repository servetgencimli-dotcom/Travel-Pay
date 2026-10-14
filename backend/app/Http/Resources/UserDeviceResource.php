<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserDeviceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'device_uuid' => $this->device_uuid,
            'device_name' => $this->device_name,
            'device_type' => $this->device_type,
            'os' => $this->os,
            'ip_address' => $this->ip_address,
            'last_active_at' => $this->last_active_at?->toISOString(),
            'is_trusted' => (bool) $this->is_trusted,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
