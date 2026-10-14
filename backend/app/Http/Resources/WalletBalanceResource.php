<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WalletBalanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'currency_code' => $this->currency_code,
            'balance' => (float) $this->balance,
            'locked_balance' => (float) $this->locked_balance,
            'available_balance' => (float) $this->available_balance,
        ];
    }
}
