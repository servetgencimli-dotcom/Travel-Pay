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
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->string('reference_number', 36)->unique();
            $table->foreignId('wallet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20)->index(); // top_up, transfer, exchange, payment, refund
            $table->string('status', 20)->default('pending')->index(); // pending, completed, failed, cancelled, held_for_review
            $table->decimal('amount', 18, 4);
            $table->decimal('fee', 18, 4)->default(0.0000);
            $table->string('currency_code', 3)->index();
            $table->foreignId('recipient_wallet_id')->nullable()->constrained('wallets')->nullOnDelete();
            $table->foreignId('recipient_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('description')->nullable();
            $table->string('idempotency_key', 64)->nullable()->unique();
            $table->unsignedSmallInteger('risk_score')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('transfer_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('recipient_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 18, 4);
            $table->string('currency_code', 3)->index();
            $table->string('status', 20)->default('pending')->index(); // pending, accepted, rejected, expired
            $table->string('note')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('currency_conversions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('wallet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transaction_id')->constrained()->cascadeOnDelete();
            $table->string('from_currency', 3)->index();
            $table->string('to_currency', 3)->index();
            $table->decimal('from_amount', 18, 4);
            $table->decimal('to_amount', 18, 4);
            $table->decimal('exchange_rate', 18, 6);
            $table->decimal('fee', 18, 4)->default(0.0000);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('currency_conversions');
        Schema::dropIfExists('transfer_requests');
        Schema::dropIfExists('transactions');
    }
};
