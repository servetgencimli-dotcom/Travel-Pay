<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || !$request->user()->canAccessAdmin()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized. Administrator or authorized staff access required.',
            ], 403);
        }

        return $next($request);
    }
}
