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
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // Hotels, Restaurants, Transportation, Museums, Shopping, Entertainment, Other
            $table->string('icon')->nullable();
            $table->string('color', 20)->nullable();
            $table->boolean('is_default')->default(true);
            $table->timestamps();
        });

        Schema::create('trips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('destination_country');
            $table->date('start_date');
            $table->date('end_date');
            $table->string('base_currency', 3)->default('AZN');
            $table->string('status', 20)->default('planned')->index(); // planned, active, completed, cancelled
            $table->timestamps();
        });

        Schema::create('travel_budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained()->cascadeOnDelete();
            $table->string('currency_code', 3)->index();
            $table->decimal('total_budget', 18, 4);
            $table->decimal('allocated_budget', 18, 4)->default(0.0000);
            $table->timestamps();
        });

        Schema::create('travel_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('expense_category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 18, 4);
            $table->string('original_currency', 3)->index();
            $table->decimal('reporting_amount', 18, 4);
            $table->string('reporting_currency', 3)->index();
            $table->decimal('exchange_rate', 18, 6)->default(1.000000);
            $table->string('description')->nullable();
            $table->dateTime('spent_at')->index();
            $table->string('receipt_path')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('travel_expenses');
        Schema::dropIfExists('travel_budgets');
        Schema::dropIfExists('trips');
        Schema::dropIfExists('expense_categories');
    }
};
