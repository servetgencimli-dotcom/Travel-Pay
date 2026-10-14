<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\FraudAlertResource;
use App\Http\Resources\SecurityEventResource;
use App\Http\Resources\UserDeviceResource;
use App\Models\FraudAlert;
use App\Models\SecurityEvent;
use App\Models\UserDevice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SecurityController extends Controller
{
    public function events(Request $request): JsonResponse
    {
        $events = SecurityEvent::where('user_id', $request->user()->id)
            ->orderByDesc('id')
            ->paginate($request->input('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data' => SecurityEventResource::collection($events),
            'meta' => [
                'current_page' => $events->currentPage(),
                'last_page' => $events->lastPage(),
                'total' => $events->total(),
            ],
        ]);
    }

    public function alerts(Request $request): JsonResponse
    {
        $alerts = FraudAlert::where('user_id', $request->user()->id)
            ->orderByDesc('id')
            ->paginate($request->input('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data' => $alerts->items(),
            'meta' => [
                'current_page' => $alerts->currentPage(),
                'last_page' => $alerts->lastPage(),
                'total' => $alerts->total(),
            ],
        ]);
    }

    public function devices(Request $request): JsonResponse
    {
        $devices = UserDevice::where('user_id', $request->user()->id)
            ->orderByDesc('last_active_at')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => UserDeviceResource::collection($devices),
        ]);
    }

    public function revokeDevice(Request $request, int $id): JsonResponse
    {
        $device = UserDevice::where('user_id', $request->user()->id)->findOrFail($id);
        $device->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Device revoked successfully.',
        ]);
    }
}
