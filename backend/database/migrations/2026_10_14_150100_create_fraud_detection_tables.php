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
        Schema::create('fraud_rules', function (Blueprint $table) {
            $table->id();
            $table->string('rule_name');
            $table->string('rule_code', 32)->unique();
            $table->string('description')->nullable();
            $table->string('rule_type', 20)->index(); // threshold, velocity, device, location, pattern
            $table->string('condition_operator', 10); // >, >=, <, <=, ==, !=, in
            $table->string('threshold_value');
            $table->unsignedSmallInteger('risk_weight')->default(10);
            $table->boolean('is_active')->default(true)->index();
            $table->string('action', 20)->default('flag'); // flag, step_up_2fa, hold, block
            $table->timestamps();
        });

        Schema::create('fraud_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->string('severity', 20)->default('low')->index(); // low, medium, high, critical
            $table->string('status', 20)->default('new')->index(); // new, investigating, resolved, dismissed
            $table->unsignedSmallInteger('risk_score')->default(0);
            $table->string('title');
            $table->text('description')->nullable();
            $table->json('details')->nullable();
            $table->json('triggered_rules')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('transaction_risk_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('risk_score')->default(0); // 0 - 100
            $table->string('risk_level', 10)->index(); // low, medium, high
            $table->json('factors')->nullable();
            $table->string('recommended_action', 20)->default('allow'); // allow, challenge, hold, block
            $table->boolean('is_resolved')->default(false);
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transaction_risk_assessments');
        Schema::dropIfExists('fraud_alerts');
        Schema::dropIfExists('fraud_rules');
    }
};
