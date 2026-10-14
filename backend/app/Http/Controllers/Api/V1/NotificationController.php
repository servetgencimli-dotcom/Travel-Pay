<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'status' => 'success',
            'data' => $user->notifications()->take(30)->get()->map(fn ($n) => [
                'id' => $n->id,
                'title' => $n->data['title'] ?? '',
                'body' => $n->data['body'] ?? '',
                'kind' => $n->data['kind'] ?? 'info',
                'read' => $n->read_at !== null,
                'created_at' => $n->created_at?->toISOString(),
            ]),
            'meta' => ['unread' => $user->unreadNotifications()->count()],
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return $this->ok(null, 'All notifications marked as read.');
    }
}
