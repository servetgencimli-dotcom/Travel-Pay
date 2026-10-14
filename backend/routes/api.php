<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\SecurityController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - V1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // Public Authentication Endpoints (Rate limited to 10 requests per minute)
    Route::prefix('auth')->middleware(['throttle:10,1'])->group(function () {
        Route::post('register', [AuthController::class, 'register'])->name('api.v1.auth.register');
        Route::post('login', [AuthController::class, 'login'])->name('api.v1.auth.login');
    });

    // Authenticated Routes
    Route::middleware(['auth:sanctum'])->group(function () {

        // User & Session Management
        Route::prefix('auth')->group(function () {
            Route::get('me', [AuthController::class, 'me'])->name('api.v1.auth.me');
            Route::post('logout', [AuthController::class, 'logout'])->name('api.v1.auth.logout');
            Route::post('2fa/enable', [AuthController::class, 'enableTwoFactor'])->name('api.v1.auth.2fa.enable');
            Route::post('2fa/confirm', [AuthController::class, 'confirmTwoFactor'])->name('api.v1.auth.2fa.confirm');
            Route::post('2fa/disable', [AuthController::class, 'disableTwoFactor'])->name('api.v1.auth.2fa.disable');
        });

        // Security, Device & Audit Monitoring
        Route::prefix('security')->group(function () {
            Route::get('events', [SecurityController::class, 'events'])->name('api.v1.security.events');
            Route::get('alerts', [SecurityController::class, 'alerts'])->name('api.v1.security.alerts');
            Route::get('devices', [SecurityController::class, 'devices'])->name('api.v1.security.devices');
            Route::delete('devices/{id}', [SecurityController::class, 'revokeDevice'])->name('api.v1.security.devices.revoke');
        });
    });
});
