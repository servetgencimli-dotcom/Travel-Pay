<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Services\Security\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(
        protected AuthService $authService
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register($request->validated(), $request);

        return response()->json([
            'status' => 'success',
            'message' => 'User registered successfully with digital wallet.',
            'data' => [
                'user' => new UserResource($result['user']),
                'token' => $result['token'],
                'token_type' => $result['token_type'],
            ],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login($request->validated(), $request);

        if (!empty($result['requires_two_factor'])) {
            return response()->json([
                'status' => 'pending_2fa',
                'message' => $result['message'],
                'requires_two_factor' => true,
            ], 200);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Login successful.',
            'data' => [
                'user' => new UserResource($result['user']),
                'token' => $result['token'],
                'token_type' => $result['token_type'],
            ],
        ], 200);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user(), $request);

        return response()->json([
            'status' => 'success',
            'message' => 'Logged out successfully.',
        ], 200);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('wallet.balances');

        return response()->json([
            'status' => 'success',
            'data' => [
                'user' => new UserResource($user),
            ],
        ], 200);
    }

    public function enableTwoFactor(Request $request): JsonResponse
    {
        $data = $this->authService->enableTwoFactor($request->user());

        return response()->json([
            'status' => 'success',
            'message' => 'Two-factor setup initialized. Confirm with OTP 123456 or authenticator code.',
            'data' => $data,
        ], 200);
    }

    public function confirmTwoFactor(Request $request): JsonResponse
    {
        $request->validate([
            'code' => ['required', 'string'],
        ]);

        $confirmed = $this->authService->confirmTwoFactor($request->user(), $request->input('code'));

        if (!$confirmed) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid authentication code.',
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Two-factor authentication confirmed and activated.',
        ], 200);
    }

    public function disableTwoFactor(Request $request): JsonResponse
    {
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (!Hash::check($request->input('password'), $request->user()->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'The provided password does not match your current password.',
            ], 422);
        }

        $this->authService->disableTwoFactor($request->user());

        return response()->json([
            'status' => 'success',
            'message' => 'Two-factor authentication disabled.',
        ], 200);
    }
}
