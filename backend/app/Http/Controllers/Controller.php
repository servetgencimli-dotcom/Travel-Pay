<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

abstract class Controller
{
    protected function ok(mixed $data = null, ?string $message = null, int $status = 200): JsonResponse
    {
        return response()->json(array_filter([
            'status' => 'success',
            'message' => $message,
            'data' => $data,
        ], fn ($v) => $v !== null), $status);
    }

    protected function paginated(LengthAwarePaginator $page, ?callable $map = null): JsonResponse
    {
        $items = collect($page->items());

        return response()->json([
            'status' => 'success',
            'data' => $map ? $items->map($map)->values() : $items,
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
            ],
        ]);
    }
}
