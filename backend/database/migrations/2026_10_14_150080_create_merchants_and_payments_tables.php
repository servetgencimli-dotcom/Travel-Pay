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
        Schema::create('merchants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('merchant_name');
            $table->string('merchant_code', 32)->unique();
            $table->string('category')->default('Retail');
            $table->string('api_key_hash')->nullable();
            $table->string('status', 20)->default('active')->index(); // active, inactive
            $table->timestamps();
        });

        Schema::create('payment_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('creator_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('qr_code_token', 64)->unique();
            $table->decimal('amount', 18, 4)->nullable(); // null allows open-ended amounts
            $table->string('currency_code', 3)->index();
            $table->string('description')->nullable();
            $table->string('status', 20)->default('pending')->index(); // pending, completed, expired, cancelled
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('payment_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transaction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payer_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 18, 4);
            $table->string('currency_code', 3)->index();
            $table->string('receipt_number', 32)->unique();
            $table->timestamp('confirmed_at')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_confirmations');
        Schema::dropIfExists('payment_requests');
        Schema::dropIfExists('merchants');
    }
};
