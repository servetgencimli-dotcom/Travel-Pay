<?php

use Illuminate\Support\Facades\Route;

// Single-page TravelPay app (wallet, travel, security & admin) — talks to /api/v1.
Route::view('/', 'app');
Route::view('/admin', 'app');
