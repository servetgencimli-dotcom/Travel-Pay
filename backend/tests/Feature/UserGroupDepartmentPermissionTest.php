<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\FraudRule;
use App\Models\Permission;
use App\Models\User;
use App\Models\UserGroup;
use App\Models\Wallet;
use App\Models\WalletBalance;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserGroupDepartmentPermissionTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $regularUser;
    protected User $staffWithPerm;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        // 1. System Admin
        $this->admin = User::where('email', 'admin@travelpay.com')->first();

        // 2. Regular user without permissions
        $this->regularUser = User::where('email', 'elvin@travelpay.com')->first();

        // 3. Department
        $dept = Department::firstOrCreate(
            ['code' => 'TEST_DEPT'],
            ['name' => 'Test Department', 'manager_name' => 'Test Manager', 'status' => 'active']
        );

        // 4. Permissions
        $managePerm = Permission::firstOrCreate(
            ['slug' => 'manage_permissions'],
            ['name' => 'Manage Permissions', 'category' => 'Security']
        );

        $viewUsersPerm = Permission::firstOrCreate(
            ['slug' => 'view_users'],
            ['name' => 'View Users', 'category' => 'Users']
        );

        // Group WITH manage_permissions
        $groupWithPerm = UserGroup::firstOrCreate(
            ['slug' => 'perm_managers'],
            ['name' => 'Permission Managers Group', 'department_id' => $dept->id, 'is_system' => false]
        );
        $groupWithPerm->permissions()->sync([$managePerm->id, $viewUsersPerm->id]);

        $this->staffWithPerm = User::firstOrCreate(
            ['email' => 'staff_perm_test@travelpay.com'],
            [
                'name' => 'Staff With Manage Perm',
                'phone' => '+994120007777',
                'password' => bcrypt('Password123!'),
                'role' => 'admin',
                'department_id' => $dept->id,
                'user_group_id' => $groupWithPerm->id,
                'status' => 'active',
            ]
        );
    }

    public function test_departments_crud_and_listing(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/v1/admin/departments');
        $response->assertStatus(200);

        $createRes = $this->actingAs($this->admin)->postJson('/api/v1/admin/departments', [
            'name' => 'Audit & Compliance New',
            'code' => 'AUDIT_NEW',
            'description' => 'Test Department Description',
            'manager_name' => 'Kamran Aliyev',
            'status' => 'active',
        ]);
        $createRes->assertStatus(201);
        $this->assertDatabaseHas('departments', ['code' => 'AUDIT_NEW']);
    }

    public function test_user_group_creation_and_user_assignment(): void
    {
        $dept = Department::first();

        $groupRes = $this->actingAs($this->admin)->postJson('/api/v1/admin/user-groups', [
            'name' => 'Risk Analysts Tier 2',
            'department_id' => $dept->id,
            'description' => 'Secondary tier analysts',
        ]);
        $groupRes->assertStatus(201);
        $groupId = $groupRes->json('data.id');

        // Create new user assigned to this department and group
        $userRes = $this->actingAs($this->admin)->postJson('/api/v1/admin/users', [
            'name' => 'Elmir Safarov',
            'email' => 'elmir.test' . time() . '@travelpay.com',
            'phone' => '+994509998877',
            'password' => 'Password123!',
            'role' => 'user',
            'department_id' => $dept->id,
            'user_group_id' => $groupId,
            'initial_azn' => 1500,
            'initial_eur' => 300,
            'initial_usd' => 200,
        ]);
        $userRes->assertStatus(201);
        $this->assertDatabaseHas('users', ['email' => $userRes->json('data.email'), 'department_id' => $dept->id]);
    }

    public function test_permissions_can_only_be_managed_by_system_admin_or_user_with_manage_permissions(): void
    {
        $group = UserGroup::first();
        $allPerms = Permission::pluck('id')->toArray();

        // 1. Regular user trying to assign permissions -> 403 Forbidden
        $unauthRes = $this->actingAs($this->regularUser)->putJson("/api/v1/admin/user-groups/{$group->id}/permissions", [
            'permission_ids' => $allPerms,
        ]);
        $unauthRes->assertStatus(403);

        // 2. Staff user who HAS 'manage_permissions' permission -> 200 OK
        $authStaffRes = $this->actingAs($this->staffWithPerm)->putJson("/api/v1/admin/user-groups/{$group->id}/permissions", [
            'permission_ids' => $allPerms,
        ]);
        $authStaffRes->assertStatus(200);

        // 3. System Admin -> 200 OK
        $adminRes = $this->actingAs($this->admin)->putJson("/api/v1/admin/user-groups/{$group->id}/permissions", [
            'permission_ids' => array_slice($allPerms, 0, 2),
        ]);
        $adminRes->assertStatus(200);
    }

    public function test_create_new_fraud_rule(): void
    {
        $res = $this->actingAs($this->admin)->postJson('/api/v1/admin/fraud-rules', [
            'rule_name' => 'Rapid Micro Deposits Risk',
            'rule_code' => 'RAPID_MICRO_DEP_' . time(),
            'description' => 'Flags rapid small deposits indicative of card testing',
            'rule_type' => 'velocity',
            'condition_operator' => '>',
            'threshold_value' => '5_in_10m',
            'risk_weight' => 50,
            'action' => 'hold',
            'is_active' => true,
        ]);
        $res->assertStatus(201);
    }

    public function test_create_new_fraud_alert(): void
    {
        $res = $this->actingAs($this->admin)->postJson('/api/v1/admin/fraud-alerts', [
            'user_id' => $this->regularUser->id,
            'title' => 'Suspicious Tor Network Connection',
            'description' => 'User connected from known exit node',
            'severity' => 'critical',
            'risk_score' => 90,
        ]);
        $res->assertStatus(201);
    }

    public function test_wallet_manual_credit(): void
    {
        $wallet = Wallet::firstOrCreate(
            ['user_id' => $this->regularUser->id],
            ['wallet_number' => 'TPTEST0001', 'status' => 'active']
        );

        $res = $this->actingAs($this->admin)->postJson("/api/v1/admin/wallets/{$wallet->id}/credit", [
            'currency_code' => 'AZN',
            'amount' => 500.00,
            'reason' => 'VIP Traveler Compensation Bonus',
        ]);
        $res->assertStatus(200);

        $balance = WalletBalance::where('wallet_id', $wallet->id)->where('currency_code', 'AZN')->first();
        $this->assertGreaterThanOrEqual(500, (float) $balance->balance);
    }
}
