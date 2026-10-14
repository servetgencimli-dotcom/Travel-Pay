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
        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('wallet_number', 20)->unique();
            $table->string('status')->default('active')->index(); // active, frozen, closed
            $table->timestamps();
        });

        Schema::create('wallet_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained()->cascadeOnDelete();
            $table->string('currency_code', 3)->index();
            $table->decimal('balance', 18, 4)->default(0.0000);
            $table->decimal('locked_balance', 18, 4)->default(0.0000);
            $table->timestamps();

            $table->unique(['wallet_id', 'currency_code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wallet_balances');
        Schema::dropIfExists('wallets');
    }
};
