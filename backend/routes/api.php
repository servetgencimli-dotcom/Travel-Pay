<?php

use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BookingController;
use App\Http\Controllers\Api\V1\CardController;
use App\Http\Controllers\Api\V1\CryptoController;
use App\Http\Controllers\Api\V1\InsightsController;
use App\Http\Controllers\Api\V1\KycController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\OpenBankingController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\SecurityController;
use App\Http\Controllers\Api\V1\TripController;
use App\Http\Controllers\Api\V1\WalletController;
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

        // Digital Wallet: balances, P2P, exchange, top-up, panic freeze
        Route::prefix('wallet')->group(function () {
            Route::get('summary', [WalletController::class, 'summary'])->name('api.v1.wallet.summary');
            Route::get('transactions', [WalletController::class, 'transactions'])->name('api.v1.wallet.transactions');
            Route::get('transactions/{reference}', [WalletController::class, 'showTransaction'])->name('api.v1.wallet.transactions.show');
            Route::get('rates', [WalletController::class, 'rates'])->name('api.v1.wallet.rates');
            Route::post('recipient-lookup', [WalletController::class, 'lookupRecipient'])->middleware('throttle:30,1')->name('api.v1.wallet.recipient');
            Route::post('transfer', [WalletController::class, 'transfer'])->middleware('throttle:20,1')->name('api.v1.wallet.transfer');
            Route::post('exchange/quote', [WalletController::class, 'quote'])->name('api.v1.wallet.exchange.quote');
            Route::post('exchange', [WalletController::class, 'exchange'])->middleware('throttle:20,1')->name('api.v1.wallet.exchange');
            Route::post('top-up', [WalletController::class, 'topUp'])->middleware('throttle:20,1')->name('api.v1.wallet.topup');
            Route::post('freeze', [WalletController::class, 'freeze'])->name('api.v1.wallet.freeze');
            Route::post('unfreeze', [WalletController::class, 'unfreeze'])->middleware('throttle:5,1')->name('api.v1.wallet.unfreeze');
        });

        // QR Payments & tourist places
        Route::prefix('payments')->group(function () {
            Route::get('places', [PaymentController::class, 'places'])->name('api.v1.payments.places');
            Route::get('requests', [PaymentController::class, 'myRequests'])->name('api.v1.payments.requests');
            Route::post('requests', [PaymentController::class, 'createRequest'])->name('api.v1.payments.requests.create');
            Route::post('requests/{id}/cancel', [PaymentController::class, 'cancelRequest'])->name('api.v1.payments.requests.cancel');
            Route::get('receipts', [PaymentController::class, 'receipts'])->name('api.v1.payments.receipts');
            Route::get('qr/{token}', [PaymentController::class, 'lookup'])->where('token', '.+')->name('api.v1.payments.qr.lookup');
            Route::post('qr/{token}/pay', [PaymentController::class, 'pay'])->where('token', '.+')->middleware('throttle:20,1')->name('api.v1.payments.qr.pay');
        });

        // Open Banking & eKYC
        Route::prefix('open-banking')->group(function () {
            Route::get('banks', [OpenBankingController::class, 'banks'])->name('api.v1.openbanking.banks');
            Route::get('accounts', [OpenBankingController::class, 'index'])->name('api.v1.openbanking.accounts');
            Route::post('accounts', [OpenBankingController::class, 'link'])->name('api.v1.openbanking.link');
            Route::delete('accounts/{id}', [OpenBankingController::class, 'revoke'])->name('api.v1.openbanking.revoke');
        });
        Route::get('kyc', [KycController::class, 'status'])->name('api.v1.kyc.status');
        Route::post('kyc', [KycController::class, 'submit'])->middleware('throttle:5,1')->name('api.v1.kyc.submit');

        // Tokenized virtual cards
        Route::prefix('cards')->group(function () {
            Route::get('/', [CardController::class, 'index'])->name('api.v1.cards.index');
            Route::post('/', [CardController::class, 'store'])->name('api.v1.cards.store');
            Route::patch('{id}', [CardController::class, 'update'])->name('api.v1.cards.update');
            Route::delete('{id}', [CardController::class, 'destroy'])->name('api.v1.cards.destroy');
            Route::post('{id}/charge', [CardController::class, 'charge'])->middleware('throttle:20,1')->name('api.v1.cards.charge');
        });

        // Smart tourism: trips, budgets, expenses, bookings
        Route::get('expense-categories', [TripController::class, 'categories'])->name('api.v1.expense-categories');
        Route::prefix('trips')->group(function () {
            Route::get('/', [TripController::class, 'index'])->name('api.v1.trips.index');
            Route::post('/', [TripController::class, 'store'])->name('api.v1.trips.store');
            Route::get('{id}', [TripController::class, 'show'])->name('api.v1.trips.show');
            Route::patch('{id}', [TripController::class, 'update'])->name('api.v1.trips.update');
            Route::delete('{id}', [TripController::class, 'destroy'])->name('api.v1.trips.destroy');
            Route::put('{id}/budget', [TripController::class, 'setBudget'])->name('api.v1.trips.budget');
            Route::post('{id}/expenses', [TripController::class, 'addExpense'])->name('api.v1.trips.expenses.store');
            Route::delete('{id}/expenses/{expenseId}', [TripController::class, 'deleteExpense'])->name('api.v1.trips.expenses.destroy');
        });
        Route::prefix('bookings')->group(function () {
            Route::get('catalog', [BookingController::class, 'catalog'])->name('api.v1.bookings.catalog');
            Route::get('/', [BookingController::class, 'index'])->name('api.v1.bookings.index');
            Route::post('/', [BookingController::class, 'store'])->middleware('throttle:20,1')->name('api.v1.bookings.store');
            Route::post('{id}/cancel', [BookingController::class, 'cancel'])->name('api.v1.bookings.cancel');
        });

        // Virtual assets
        Route::prefix('crypto')->group(function () {
            Route::get('prices', [CryptoController::class, 'prices'])->name('api.v1.crypto.prices');
            Route::get('portfolio', [CryptoController::class, 'portfolio'])->name('api.v1.crypto.portfolio');
            Route::post('buy', [CryptoController::class, 'buy'])->middleware('throttle:20,1')->name('api.v1.crypto.buy');
            Route::post('sell', [CryptoController::class, 'sell'])->middleware('throttle:20,1')->name('api.v1.crypto.sell');
        });

        // Analytics & notifications
        Route::get('insights', InsightsController::class)->name('api.v1.insights');
        Route::get('notifications', [NotificationController::class, 'index'])->name('api.v1.notifications');
        Route::post('notifications/read', [NotificationController::class, 'markAllRead'])->name('api.v1.notifications.read');

        // Security, Device & Audit Monitoring
        Route::prefix('security')->group(function () {
            Route::get('score', [SecurityController::class, 'score'])->name('api.v1.security.score');
            Route::get('events', [SecurityController::class, 'events'])->name('api.v1.security.events');
            Route::get('alerts', [SecurityController::class, 'alerts'])->name('api.v1.security.alerts');
            Route::get('devices', [SecurityController::class, 'devices'])->name('api.v1.security.devices');
            Route::patch('devices/{id}', [SecurityController::class, 'trustDevice'])->name('api.v1.security.devices.trust');
            Route::delete('devices/{id}', [SecurityController::class, 'revokeDevice'])->name('api.v1.security.devices.revoke');
            Route::get('sessions', [SecurityController::class, 'sessions'])->name('api.v1.security.sessions');
            Route::delete('sessions/{id}', [SecurityController::class, 'revokeSession'])->name('api.v1.security.sessions.revoke');
            Route::post('sessions/revoke-others', [SecurityController::class, 'revokeOtherSessions'])->name('api.v1.security.sessions.revoke-others');
            Route::post('password', [SecurityController::class, 'changePassword'])->middleware('throttle:5,1')->name('api.v1.security.password');
        });

        // Administrator Operations (Protected by Role: admin)
        Route::prefix('admin')->middleware(['admin'])->group(function () {
            Route::get('dashboard', [AdminController::class, 'dashboard'])->name('api.v1.admin.dashboard');
            Route::get('users', [AdminController::class, 'users'])->name('api.v1.admin.users');
            Route::patch('users/{id}/status', [AdminController::class, 'updateUserStatus'])->name('api.v1.admin.users.status');
            Route::get('wallets', [AdminController::class, 'wallets'])->name('api.v1.admin.wallets');
            Route::get('transactions', [AdminController::class, 'transactions'])->name('api.v1.admin.transactions');
            Route::post('transactions/{id}/approve', [AdminController::class, 'approveTransaction'])->name('api.v1.admin.transactions.approve');
            Route::post('transactions/{id}/reject', [AdminController::class, 'rejectTransaction'])->name('api.v1.admin.transactions.reject');
            Route::get('fraud-alerts', [AdminController::class, 'fraudAlerts'])->name('api.v1.admin.fraud-alerts');
            Route::patch('fraud-alerts/{id}/status', [AdminController::class, 'updateFraudAlertStatus'])->name('api.v1.admin.fraud-alerts.status');
            Route::get('security-events', [AdminController::class, 'securityEvents'])->name('api.v1.admin.security-events');
            Route::get('fraud-rules', [AdminController::class, 'fraudRules'])->name('api.v1.admin.fraud-rules');
            Route::put('fraud-rules/{id}', [AdminController::class, 'updateFraudRule'])->name('api.v1.admin.fraud-rules.update');
            Route::get('travel-analytics', [AdminController::class, 'travelAnalytics'])->name('api.v1.admin.travel-analytics');
            Route::get('audit-logs', [AdminController::class, 'auditLogs'])->name('api.v1.admin.audit-logs');
            Route::get('ledger', [AdminController::class, 'ledger'])->name('api.v1.admin.ledger');
            Route::get('threats', [AdminController::class, 'threats'])->name('api.v1.admin.threats');
            Route::post('blocked-ips', [AdminController::class, 'blockIp'])->name('api.v1.admin.blocked-ips.store');
            Route::delete('blocked-ips/{id}', [AdminController::class, 'unblockIp'])->name('api.v1.admin.blocked-ips.destroy');
            Route::post('sandbox/simulate', [AdminController::class, 'sandbox'])->name('api.v1.admin.sandbox');
            Route::get('kyc', [AdminController::class, 'kyc'])->name('api.v1.admin.kyc');
            Route::get('bookings', [AdminController::class, 'bookings'])->name('api.v1.admin.bookings');
            Route::get('merchants', [AdminController::class, 'merchants'])->name('api.v1.admin.merchants');
        });
    });
});
