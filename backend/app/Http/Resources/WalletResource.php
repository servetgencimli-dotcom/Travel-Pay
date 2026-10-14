<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WalletResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'wallet_number' => $this->wallet_number,
            'status' => $this->status,
            'balances' => WalletBalanceResource::collection($this->whenLoaded('balances')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
