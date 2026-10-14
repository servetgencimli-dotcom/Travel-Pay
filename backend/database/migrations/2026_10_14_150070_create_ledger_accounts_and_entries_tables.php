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
        Schema::create('ledger_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('account_number', 32)->unique();
            $table->string('account_name');
            $table->string('type', 20); // asset, liability, equity, revenue, expense
            $table->string('currency_code', 3)->index();
            $table->decimal('balance', 18, 4)->default(0.0000);
            $table->timestamps();
        });

        Schema::create('ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ledger_account_id')->constrained()->cascadeOnDelete();
            $table->string('entry_type', 10)->index(); // debit, credit
            $table->decimal('amount', 18, 4);
            $table->string('currency_code', 3)->index();
            $table->decimal('balance_after', 18, 4);
            $table->string('description')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ledger_entries');
        Schema::dropIfExists('ledger_accounts');
    }
};
