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
        // 1. Departments table
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->string('manager_name')->nullable();
            $table->string('status')->default('active'); // active, inactive
            $table->timestamps();
        });

        // 2. User Groups table (Roles/Groups)
        Schema::create('user_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->boolean('is_system')->default(false); // e.g., System Administrator cannot be deleted
            $table->timestamps();
        });

        // 3. Platform Permissions table
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('category')->default('General');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // 4. Pivot: User Group <-> Permissions
        Schema::create('user_group_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_group_id')->constrained('user_groups')->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_group_id', 'permission_id']);
        });

        // 5. Add department_id and user_group_id to users table
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable()->after('role')->constrained('departments')->nullOnDelete();
            $table->foreignId('user_group_id')->nullable()->after('department_id')->constrained('user_groups')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropForeign(['user_group_id']);
            $table->dropColumn(['department_id', 'user_group_id']);
        });

        Schema::dropIfExists('user_group_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('user_groups');
        Schema::dropIfExists('departments');
    }
};
