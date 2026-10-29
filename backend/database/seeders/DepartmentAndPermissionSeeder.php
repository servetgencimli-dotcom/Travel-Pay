<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Permission;
use App\Models\User;
use App\Models\UserGroup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DepartmentAndPermissionSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Departments
        $departmentsData = [
            [
                'name' => 'Information Technology & Cyber Security',
                'code' => 'IT_SEC',
                'description' => 'Core platform infrastructure, WAF defense, identity management, and cryptographic access control.',
                'manager_name' => 'Rashad Aliyev',
                'status' => 'active',
            ],
            [
                'name' => 'Risk & Fraud Surveillance',
                'code' => 'RISK',
                'description' => 'Real-time velocity scoring, fraud pattern recognition, anomaly limits, and risk heuristics.',
                'manager_name' => 'Orkhan Huseynov',
                'status' => 'active',
            ],
            [
                'name' => 'Finance, Treasury & Accounting',
                'code' => 'FINANCE',
                'description' => 'Multi-currency reserves, general double-entry ledger audits, liquidity balances, and treasury operations.',
                'manager_name' => 'Leyla Mammadova',
                'status' => 'active',
            ],
            [
                'name' => 'Customer Operations & Support',
                'code' => 'OPS',
                'description' => 'Customer account services, wallet support, merchant verification inquiries, and tier-1 assistance.',
                'manager_name' => 'Nigar Gasimova',
                'status' => 'active',
            ],
            [
                'name' => 'Compliance, Legal & Internal Audit',
                'code' => 'COMPLIANCE',
                'description' => 'Regulatory KYC/AML verification, AML compliance thresholds, and immutable audit log reviews.',
                'manager_name' => 'Fuad Guliyev',
                'status' => 'active',
            ],
        ];

        $departments = [];
        foreach ($departmentsData as $d) {
            $departments[$d['code']] = Department::updateOrCreate(['code' => $d['code']], $d);
        }

        // 2. Permissions
        $permissionsData = [
            // Permission & Access Control
            [
                'name' => 'Manage Permissions (Delegation)',
                'slug' => 'manage_permissions',
                'category' => 'Access & Identity Control',
                'description' => 'SPECIAL PRIVILEGE: Grants authority to allocate, modify, and revoke permissions for user groups.',
            ],
            [
                'name' => 'Manage User Groups',
                'slug' => 'manage_user_groups',
                'category' => 'Access & Identity Control',
                'description' => 'Create, update, and manage custom user groups and role profiles.',
            ],
            [
                'name' => 'Manage Departments',
                'slug' => 'manage_departments',
                'category' => 'Departments',
                'description' => 'Create and configure organizational units, codes, and department heads.',
            ],
            // Users & Accounts
            [
                'name' => 'Manage Users & Accounts',
                'slug' => 'manage_users',
                'category' => 'User Management',
                'description' => 'Create and edit users, assign departments and user groups.',
            ],
            [
                'name' => 'View Users & Profiles',
                'slug' => 'view_users',
                'category' => 'User Management',
                'description' => 'View user directory, identity statuses, and wallet profiles.',
            ],
            // Fraud & Security
            [
                'name' => 'Manage Fraud Rules & Risk Limits',
                'slug' => 'manage_fraud_rules',
                'category' => 'Cybersecurity & Risk',
                'description' => 'Define rule conditions, thresholds, velocity triggers, and risk scoring actions.',
            ],
            [
                'name' => 'Investigate & Resolve Fraud Alerts',
                'slug' => 'resolve_fraud_alerts',
                'category' => 'Cybersecurity & Risk',
                'description' => 'Analyze suspicious transaction alerts, step-up 2FA, or mark resolved.',
            ],
            [
                'name' => 'Threat Shield & WAF / IP Defense',
                'slug' => 'manage_threats',
                'category' => 'Cybersecurity & Risk',
                'description' => 'Monitor network threat events, block malicious IPs, and configure firewall.',
            ],
            // Finance & Ledger
            [
                'name' => 'Approve or Reject Transactions',
                'slug' => 'approve_transactions',
                'category' => 'Finance & Ledger',
                'description' => 'Review held transactions, release funds, or reject illicit transfers.',
            ],
            [
                'name' => 'Manage General Ledger & Journal Entries',
                'slug' => 'manage_ledger',
                'category' => 'Finance & Ledger',
                'description' => 'Post manual double-entry journal items and inspect trial balances.',
            ],
            [
                'name' => 'Manage Wallets & Top-up Reserves',
                'slug' => 'manage_wallets',
                'category' => 'Finance & Ledger',
                'description' => 'Credit and adjust user wallet balances across AZN, EUR, USD.',
            ],
            // Monitoring
            [
                'name' => 'View Executive Dashboard',
                'slug' => 'view_dashboard',
                'category' => 'Monitoring & Reports',
                'description' => 'Access financial statistics, volume metrics, and operational overviews.',
            ],
            [
                'name' => 'View Audit Logs',
                'slug' => 'view_audit_logs',
                'category' => 'Monitoring & Reports',
                'description' => 'Inspect immutable audit trail of all administrative actions and security events.',
            ],
            [
                'name' => 'View Travel Analytics',
                'slug' => 'view_travel_analytics',
                'category' => 'Monitoring & Reports',
                'description' => 'Analyze tourism spending distributions, booking trends, and merchant volumes.',
            ],
        ];

        $permissions = [];
        foreach ($permissionsData as $p) {
            $permissions[$p['slug']] = Permission::updateOrCreate(['slug' => $p['slug']], $p);
        }

        // 3. User Groups (Roles/Groups assigned to departments)
        $groupsData = [
            [
                'name' => 'System Administrator',
                'slug' => 'system_administrator',
                'department_id' => $departments['IT_SEC']->id,
                'description' => 'Full administrative root privilege. Unrestricted system-wide access and configuration authority.',
                'is_system' => true,
                'permissions' => array_keys($permissions), // all permissions
            ],
            [
                'name' => 'Access & Security Manager',
                'slug' => 'access_security_manager',
                'department_id' => $departments['IT_SEC']->id,
                'description' => 'Dedicated security manager equipped with permission delegation authority to manage group privileges.',
                'is_system' => false,
                'permissions' => [
                    'manage_permissions',
                    'manage_user_groups',
                    'manage_departments',
                    'manage_users',
                    'view_users',
                    'manage_threats',
                    'view_dashboard',
                    'view_audit_logs',
                ],
            ],
            [
                'name' => 'Fraud & Risk Analyst Lead',
                'slug' => 'fraud_risk_lead',
                'department_id' => $departments['RISK']->id,
                'description' => 'Specialist responsible for defining fraud risk policies, investigating alerts, and velocity limits.',
                'is_system' => false,
                'permissions' => [
                    'manage_fraud_rules',
                    'resolve_fraud_alerts',
                    'view_users',
                    'view_dashboard',
                    'view_audit_logs',
                ],
            ],
            [
                'name' => 'Senior Financial Auditor',
                'slug' => 'financial_auditor',
                'department_id' => $departments['FINANCE']->id,
                'description' => 'Oversees currency reserves, double-entry journal adjustments, and large transaction approvals.',
                'is_system' => false,
                'permissions' => [
                    'approve_transactions',
                    'manage_ledger',
                    'manage_wallets',
                    'view_users',
                    'view_dashboard',
                    'view_audit_logs',
                    'view_travel_analytics',
                ],
            ],
            [
                'name' => 'Support & Operations Specialist',
                'slug' => 'support_specialist',
                'department_id' => $departments['OPS']->id,
                'description' => 'Frontline support handling user accounts, inquiries, and customer wallet diagnostics.',
                'is_system' => false,
                'permissions' => [
                    'view_users',
                    'view_dashboard',
                ],
            ],
        ];

        $groups = [];
        foreach ($groupsData as $g) {
            $perms = $g['permissions'];
            unset($g['permissions']);

            $group = UserGroup::updateOrCreate(['slug' => $g['slug']], $g);
            $permIds = Permission::whereIn('slug', $perms)->pluck('id');
            $group->permissions()->sync($permIds);
            $groups[$g['slug']] = $group;
        }

        // 4. Update the primary Administrator user
        $admin = User::where('email', 'admin@travelpay.com')->first();
        if ($admin) {
            $admin->update([
                'department_id' => $departments['IT_SEC']->id,
                'user_group_id' => $groups['system_administrator']->id,
            ]);
        }

        // 5. Create demo department staff users so the user can test different roles immediately
        $staffUsers = [
            [
                'name' => 'Rashad Aliyev (IT Security & Access Mgr)',
                'email' => 'rashad.security@travelpay.com',
                'phone' => '+994503332211',
                'password' => Hash::make('Password123!'),
                'role' => 'admin',
                'department_id' => $departments['IT_SEC']->id,
                'user_group_id' => $groups['access_security_manager']->id,
                'status' => 'active',
            ],
            [
                'name' => 'Orkhan Huseynov (Fraud Lead)',
                'email' => 'orkhan.risk@travelpay.com',
                'phone' => '+994504445566',
                'password' => Hash::make('Password123!'),
                'role' => 'admin',
                'department_id' => $departments['RISK']->id,
                'user_group_id' => $groups['fraud_risk_lead']->id,
                'status' => 'active',
            ],
            [
                'name' => 'Leyla Mammadova (Finance Manager)',
                'email' => 'leyla.finance@travelpay.com',
                'phone' => '+994505557788',
                'password' => Hash::make('Password123!'),
                'role' => 'admin',
                'department_id' => $departments['FINANCE']->id,
                'user_group_id' => $groups['financial_auditor']->id,
                'status' => 'active',
            ],
        ];

        foreach ($staffUsers as $staff) {
            User::updateOrCreate(['email' => $staff['email']], $staff);
        }

        // Also assign standard demo users to Customer Operations department
        User::whereIn('email', ['elvin@travelpay.com', 'aysel@travelpay.com'])->update([
            'department_id' => $departments['OPS']->id,
        ]);
    }
}
