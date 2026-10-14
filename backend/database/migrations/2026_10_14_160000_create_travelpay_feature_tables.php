<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Open Banking: simulated bank accounts linked to the wallet via consent
        Schema::create('linked_bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('bank_name');
            $table->string('bank_code', 20);
            $table->string('iban_masked', 40);
            $table->string('iban_hash', 64)->index();
            $table->string('account_holder');
            $table->string('currency_code', 3)->default('AZN');
            $table->decimal('available_balance', 18, 4)->default(0.0000); // simulated balance reported by bank API
            $table->string('consent_token_hash', 64)->nullable();
            $table->timestamp('consent_expires_at')->nullable();
            $table->string('status', 20)->default('active')->index(); // active, revoked
            $table->timestamps();
            $table->unique(['user_id', 'iban_hash']);
        });

        // eKYC: digital identity verification
        Schema::create('kyc_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('document_type', 20); // passport, id_card, driver_license
            $table->string('document_number_masked', 40);
            $table->string('document_number_hash', 64)->index();
            $table->string('nationality', 2);
            $table->date('date_of_birth');
            $table->unsignedTinyInteger('liveness_score')->default(0); // 0 - 100
            $table->unsignedTinyInteger('document_score')->default(0); // 0 - 100
            $table->string('status', 20)->default('pending')->index(); // pending, verified, rejected
            $table->string('rejection_reason')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });

        // Tokenized virtual cards (PAN never stored, only token + last four)
        Schema::create('virtual_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('wallet_id')->constrained()->cascadeOnDelete();
            $table->string('card_token', 64)->unique();
            $table->string('label')->default('Travel Card');
            $table->string('brand', 20)->default('VISA');
            $table->string('last_four', 4);
            $table->unsignedTinyInteger('expiry_month');
            $table->unsignedSmallInteger('expiry_year');
            $table->string('currency_code', 3)->default('AZN');
            $table->decimal('spending_limit', 18, 4)->default(1000.0000); // monthly limit
            $table->decimal('spent_this_month', 18, 4)->default(0.0000);
            $table->boolean('is_single_use')->default(false);
            $table->boolean('allow_online')->default(true);
            $table->boolean('allow_international')->default(true);
            $table->string('status', 20)->default('active')->index(); // active, frozen, used, cancelled
            $table->timestamps();
        });

        // Virtual assets
        Schema::create('crypto_assets', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique(); // BTC, ETH, USDT
            $table->string('name');
            $table->string('network')->nullable();
            $table->decimal('base_price_azn', 24, 8);
            $table->unsignedTinyInteger('precision')->default(8);
            $table->string('color', 20)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('crypto_holdings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained()->cascadeOnDelete();
            $table->string('asset_code', 10)->index();
            $table->decimal('amount', 24, 8)->default(0);
            $table->decimal('average_cost_azn', 24, 8)->default(0);
            $table->timestamps();
            $table->unique(['wallet_id', 'asset_code']);
        });

        // Hotel / flight / tour bookings
        Schema::create('travel_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('trip_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->string('booking_reference', 16)->unique();
            $table->string('booking_type', 20)->index(); // hotel, flight, tour
            $table->string('catalog_code', 32);
            $table->string('title');
            $table->string('provider');
            $table->string('destination');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->unsignedSmallInteger('quantity')->default(1); // nights or passengers
            $table->decimal('amount', 18, 4);
            $table->string('currency_code', 3);
            $table->string('payment_method', 20)->default('wallet'); // wallet, crypto
            $table->string('crypto_asset', 10)->nullable();
            $table->decimal('crypto_amount', 24, 8)->nullable();
            $table->string('status', 20)->default('confirmed')->index(); // confirmed, cancelled
            $table->timestamps();
        });

        // Cybersecurity: blocked IP list (manual or automatic DDoS shield)
        Schema::create('blocked_ips', function (Blueprint $table) {
            $table->id();
            $table->string('ip_address', 45)->unique();
            $table->string('reason');
            $table->string('source', 20)->default('manual'); // manual, auto_ddos, auto_malware
            $table->unsignedInteger('hits')->default(0);
            $table->timestamp('blocked_until')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Tourist-facing merchant metadata (restaurants, museums, hotels)
        Schema::table('merchants', function (Blueprint $table) {
            $table->string('city')->nullable()->after('category');
            $table->string('address')->nullable()->after('city');
            $table->string('description')->nullable()->after('address');
            $table->decimal('rating', 3, 1)->default(4.5)->after('description');
            $table->decimal('cashback_percent', 5, 2)->default(0)->after('rating');
            $table->boolean('accepts_crypto')->default(false)->after('cashback_percent');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('merchants', function (Blueprint $table) {
            $table->dropColumn(['city', 'address', 'description', 'rating', 'cashback_percent', 'accepts_crypto']);
        });

        Schema::dropIfExists('blocked_ips');
        Schema::dropIfExists('travel_bookings');
        Schema::dropIfExists('crypto_holdings');
        Schema::dropIfExists('crypto_assets');
        Schema::dropIfExists('virtual_cards');
        Schema::dropIfExists('kyc_verifications');
        Schema::dropIfExists('linked_bank_accounts');
    }
};
