<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\BlockedIp;
use App\Models\CryptoHolding;
use App\Models\Department;
use App\Models\FraudAlert;
use App\Models\FraudRule;
use App\Models\KycVerification;
use App\Models\LedgerAccount;
use App\Models\LedgerEntry;
use App\Models\Merchant;
use App\Models\Permission;
use App\Models\SecurityEvent;
use App\Models\Transaction;
use App\Models\TravelBooking;
use App\Models\TravelExpense;
use App\Models\Trip;
use App\Models\User;
use App\Models\UserGroup;
use App\Models\Wallet;
use App\Models\WalletBalance;
use App\Services\Fraud\FraudDetectionService;
use App\Services\Security\AuditLogService;
use App\Services\Security\ThreatMonitorService;
use App\Services\Wallet\LedgerService;
use App\Services\Wallet\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

    public function dashboard(): JsonResponse
    {
        $totalUsers = User::count();
        $activeWallets = Wallet::where('status', 'active')->count();
        $totalTransactions = Transaction::count();
        $pendingAlerts = FraudAlert::where('status', 'new')->count();

        // Calculate volumes by currency
        $volumes = Transaction::where('status', 'completed')
            ->select('currency_code', DB::raw('SUM(amount) as total_volume'), DB::raw('COUNT(*) as tx_count'))
            ->groupBy('currency_code')
            ->get();

        // Total balances across system
        $systemBalances = WalletBalance::select('currency_code', DB::raw('SUM(balance) as total_balance'))
            ->groupBy('currency_code')
            ->get();

        // Recent high-risk transactions or alerts
        $recentAlerts = FraudAlert::with('user:id,name,email')
            ->orderByDesc('id')
            ->take(5)
            ->get();

        // Recent security events
        $recentSecurityEvents = SecurityEvent::with('user:id,name,email')
            ->orderByDesc('id')
            ->take(5)
            ->get();

        $daily = Transaction::where('created_at', '>=', now()->subDays(13)->startOfDay())
            ->get(['created_at', 'status'])
            ->groupBy(fn ($tx) => $tx->created_at->toDateString());
        $dailyVolume = collect(range(13, 0))->map(function ($i) use ($daily) {
            $date = now()->subDays($i)->toDateString();
            $items = $daily->get($date, collect());

            return [
                'date' => $date,
                'count' => $items->count(),
                'completed' => $items->where('status', 'completed')->count(),
                'flagged' => $items->whereIn('status', ['held_for_review', 'failed'])->count(),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => [
                'overview' => [
                    'total_users' => $totalUsers,
                    'active_wallets' => $activeWallets,
                    'total_transactions' => $totalTransactions,
                    'pending_fraud_alerts' => $pendingAlerts,
                    'held_transactions' => Transaction::where('status', 'held_for_review')->count(),
                    'kyc_verified_users' => KycVerification::where('status', 'verified')->distinct('user_id')->count('user_id'),
                    'active_ip_blocks' => BlockedIp::where(fn ($q) => $q->whereNull('blocked_until')->orWhere('blocked_until', '>', now()))->count(),
                    'bookings' => TravelBooking::where('status', 'confirmed')->count(),
                ],
                'daily_volume' => $dailyVolume,
                'volumes_by_currency' => $volumes,
                'system_balances' => $systemBalances,
                'recent_alerts' => $recentAlerts,
                'recent_security_events' => $recentSecurityEvents,
            ],
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $query = User::with(['wallet.balances', 'devices', 'department', 'userGroup.permissions']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($role = $request->input('role')) {
            $query->where('role', $role);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($deptId = $request->input('department_id')) {
            $query->where('department_id', $deptId);
        }

        if ($groupId = $request->input('user_group_id')) {
            $query->where('user_group_id', $groupId);
        }

        $users = $query->orderByDesc('id')->paginate($this->perPage($request, 15));

        return response()->json([
            'status' => 'success',
            'data' => UserResource::collection($users->items()),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function updateUserStatus(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => ['required', 'string', 'in:active,suspended,frozen'],
        ]);

        $user = User::findOrFail($id);
        if ($user->id === $request->user()->id) {
            return response()->json(['status' => 'error', 'message' => 'You cannot change your own account status.'], 422);
        }

        $oldStatus = $user->status;
        $user->update(['status' => $request->input('status')]);

        // Suspended / frozen accounts lose every active API session immediately.
        if (!$user->isActive()) {
            $user->tokens()->delete();
        }

        $this->auditLogService->log(
            user: $request->user(),
            action: 'admin.user_status_updated',
            entityType: User::class,
            entityId: $user->id,
            oldValues: ['status' => $oldStatus],
            newValues: ['status' => $user->status],
            ip: $request->ip(),
            userAgent: $request->userAgent()
        );

        return response()->json([
            'status' => 'success',
            'message' => "User status updated to {$user->status}.",
            'data' => $user,
        ]);
    }

    public function wallets(Request $request): JsonResponse
    {
        $query = Wallet::with(['user:id,name,email,role,status', 'balances']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $wallets = $query->orderByDesc('id')->paginate($this->perPage($request, 15));

        return response()->json([
            'status' => 'success',
            'data' => $wallets->items(),
            'meta' => [
                'current_page' => $wallets->currentPage(),
                'last_page' => $wallets->lastPage(),
                'total' => $wallets->total(),
            ],
        ]);
    }

    public function transactions(Request $request): JsonResponse
    {
        $query = Transaction::with(['user:id,name,email', 'recipientUser:id,name,email']);

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($currency = $request->input('currency')) {
            $query->where('currency_code', strtoupper($currency));
        }

        $transactions = $query->orderByDesc('id')->paginate($this->perPage($request, 20));

        return response()->json([
            'status' => 'success',
            'data' => $transactions->items(),
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    public function fraudAlerts(Request $request): JsonResponse
    {
        $query = FraudAlert::with(['user:id,name,email', 'transaction', 'resolver:id,name']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($severity = $request->input('severity')) {
            $query->where('severity', $severity);
        }

        $alerts = $query->orderByDesc('id')->paginate($this->perPage($request, 15));

        return response()->json([
            'status' => 'success',
            'data' => $alerts->items(),
            'meta' => [
                'current_page' => $alerts->currentPage(),
                'last_page' => $alerts->lastPage(),
                'total' => $alerts->total(),
            ],
        ]);
    }

    public function updateFraudAlertStatus(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => ['required', 'string', 'in:new,investigating,resolved,dismissed'],
        ]);

        $alert = FraudAlert::findOrFail($id);
        $oldStatus = $alert->status;
        $closed = in_array($request->input('status'), ['resolved', 'dismissed'], true);
        $alert->update([
            'status' => $request->input('status'),
            'resolved_by' => $closed ? $request->user()->id : null,
            'resolved_at' => $closed ? now() : null,
        ]);
        $this->auditLogService->log($request->user(), 'admin.fraud_alert_updated', FraudAlert::class, $alert->id, ['status' => $oldStatus], ['status' => $alert->status], $request->ip(), $request->userAgent());

        return response()->json([
            'status' => 'success',
            'message' => 'Fraud alert updated successfully.',
            'data' => $alert,
        ]);
    }

    public function securityEvents(Request $request): JsonResponse
    {
        $query = SecurityEvent::with(['user:id,name,email', 'device']);

        if ($eventType = $request->input('event_type')) {
            $query->where('event_type', $eventType);
        }

        if ($severity = $request->input('severity')) {
            $query->where('severity', $severity);
        }

        $events = $query->orderByDesc('id')->paginate($this->perPage($request, 20));

        return response()->json([
            'status' => 'success',
            'data' => $events->items(),
            'meta' => [
                'current_page' => $events->currentPage(),
                'last_page' => $events->lastPage(),
                'total' => $events->total(),
            ],
        ]);
    }

    public function fraudRules(): JsonResponse
    {
        $rules = FraudRule::orderBy('id')->get();

        return response()->json([
            'status' => 'success',
            'data' => $rules,
        ]);
    }

    public function updateFraudRule(Request $request, int $id): JsonResponse
    {
        $rule = FraudRule::findOrFail($id);
        $data = $request->validate([
            'threshold_value' => ['sometimes', 'string'],
            'risk_weight' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
            'action' => ['sometimes', 'string', 'in:flag,step_up_2fa,hold,block'],
        ]);

        $old = $rule->only(array_keys($data));
        $rule->update($data);
        $this->auditLogService->log($request->user(), 'admin.fraud_rule_updated', FraudRule::class, $rule->id, $old, $data, $request->ip(), $request->userAgent());

        return response()->json([
            'status' => 'success',
            'message' => 'Fraud rule updated successfully.',
            'data' => $rule,
        ]);
    }

    public function travelAnalytics(): JsonResponse
    {
        $totalTrips = Trip::count();
        $tripsByStatus = Trip::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get();

        $topDestinations = Trip::select('destination_country', DB::raw('count(*) as trip_count'))
            ->groupBy('destination_country')
            ->orderByDesc('trip_count')
            ->take(5)
            ->get();

        $expensesByCategory = TravelExpense::join('expense_categories', 'travel_expenses.expense_category_id', '=', 'expense_categories.id')
            ->select('expense_categories.name', DB::raw('SUM(travel_expenses.reporting_amount) as total_amount'))
            ->groupBy('expense_categories.name')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_trips' => $totalTrips,
                'trips_by_status' => $tripsByStatus,
                'top_destinations' => $topDestinations,
                'expenses_by_category' => $expensesByCategory,
            ],
        ]);
    }

    public function approveTransaction(Request $request, int $id, WalletService $wallet): JsonResponse
    {
        $tx = $wallet->approveHeld(Transaction::findOrFail($id), $request->user(), $request);
        FraudAlert::where('transaction_id', $tx->id)->whereIn('status', ['new', 'investigating'])
            ->update(['status' => 'resolved', 'resolved_by' => $request->user()->id, 'resolved_at' => now()]);

        return $this->ok($tx, 'Transaction approved and settled.');
    }

    public function rejectTransaction(Request $request, int $id, WalletService $wallet): JsonResponse
    {
        $tx = $wallet->rejectHeld(Transaction::findOrFail($id), $request->user(), $request);
        FraudAlert::where('transaction_id', $tx->id)->whereIn('status', ['new', 'investigating'])
            ->update(['status' => 'resolved', 'resolved_by' => $request->user()->id, 'resolved_at' => now()]);

        return $this->ok($tx, 'Transaction rejected. Reserved funds were released.');
    }

    public function ledger(Request $request, LedgerService $ledger): JsonResponse
    {
        return $this->ok([
            'accounts' => LedgerAccount::orderBy('currency_code')->orderBy('account_number')->get(),
            'trial_balance' => $ledger->trialBalance(),
            'recent_entries' => LedgerEntry::with(['ledgerAccount:id,account_number', 'transaction:id,reference_number,type'])
                ->orderByDesc('id')
                ->take(min(max($request->integer('limit', 40), 1), 200))
                ->get(),
        ]);
    }

    public function threats(ThreatMonitorService $monitor): JsonResponse
    {
        return $this->ok(array_merge($monitor->overview(), [
            'blocked_ips' => BlockedIp::with('creator:id,name')->orderByDesc('id')->get()->map(fn ($b) => array_merge($b->toArray(), ['active' => $b->isActive()])),
        ]));
    }

    public function blockIp(Request $request, ThreatMonitorService $monitor): JsonResponse
    {
        $data = $request->validate([
            'ip_address' => ['required', 'ip'],
            'reason' => ['required', 'string', 'max:200'],
            'minutes' => ['nullable', 'integer', 'min:1', 'max:525600'],
        ]);

        if ($data['ip_address'] === $request->ip()) {
            return response()->json(['status' => 'error', 'message' => 'You cannot block your own IP address.'], 422);
        }

        $block = $monitor->block($data['ip_address'], $data['reason'], $data['minutes'] ?? null, $request->user()->id);
        $this->auditLogService->log($request->user(), 'admin.ip_blocked', BlockedIp::class, $block->id, null, $data, $request->ip(), $request->userAgent());

        return $this->ok($block, "IP {$block->ip_address} blocked.", 201);
    }

    public function unblockIp(Request $request, int $id, ThreatMonitorService $monitor): JsonResponse
    {
        $block = BlockedIp::findOrFail($id);
        $monitor->unblock($block);
        $this->auditLogService->log($request->user(), 'admin.ip_unblocked', BlockedIp::class, $id, ['ip_address' => $block->ip_address], null, $request->ip(), $request->userAgent());

        return $this->ok(null, "IP {$block->ip_address} unblocked.");
    }

    public function sandbox(Request $request, ThreatMonitorService $monitor, FraudDetectionService $fraud): JsonResponse
    {
        $data = $request->validate([
            'scenario' => ['required', 'string', 'in:normal,tourist_peak,card_testing,account_takeover'],
            'count' => ['required', 'integer', 'min:10', 'max:5000'],
        ]);

        return $this->ok($monitor->simulate($fraud, $data['scenario'], $data['count']));
    }

    public function kyc(): JsonResponse
    {
        return $this->ok(KycVerification::with('user:id,name,email')->orderByDesc('id')->take(100)->get());
    }

    public function bookings(): JsonResponse
    {
        return $this->ok([
            'bookings' => TravelBooking::with('user:id,name,email')->orderByDesc('id')->take(100)->get(),
            'crypto_custody' => CryptoHolding::select('asset_code', DB::raw('SUM(amount) as total_units'))->groupBy('asset_code')->get(),
        ]);
    }

    public function merchants(): JsonResponse
    {
        return $this->ok(Merchant::withCount('paymentRequests')->orderBy('merchant_name')->get()->map(function (Merchant $m) {
            $received = Transaction::where('type', 'payment')->where('status', 'completed')->where('metadata->merchant_id', $m->id)->get();

            return array_merge($m->toArray(), [
                'payments_count' => $received->count(),
                'payments_volume' => round((float) $received->sum('amount'), 2),
            ]);
        }));
    }

    /** Page size from the request, clamped so a huge per_page cannot dump whole tables. */
    protected function perPage(Request $request, int $default): int
    {
        return min(max($request->integer('per_page', $default), 1), 100);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $query = AuditLog::with('user:id,name,email');

        if ($action = $request->input('action')) {
            $query->where('action', 'like', "%{$action}%");
        }

        $logs = $query->orderByDesc('id')->paginate($this->perPage($request, 25));

        return response()->json([
            'status' => 'success',
            'data' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    public function createUser(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:50'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'string', 'in:user,admin'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'user_group_id' => ['nullable', 'exists:user_groups,id'],
            'status' => ['sometimes', 'string', 'in:active,suspended,frozen'],
            'initial_azn' => ['nullable', 'numeric', 'min:0'],
            'initial_eur' => ['nullable', 'numeric', 'min:0'],
            'initial_usd' => ['nullable', 'numeric', 'min:0'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'department_id' => $data['department_id'] ?? null,
            'user_group_id' => $data['user_group_id'] ?? null,
            'status' => $data['status'] ?? 'active',
            'email_verified_at' => now(),
        ]);

        // Provision Digital Wallet
        $wallet = Wallet::create([
            'user_id' => $user->id,
            'wallet_number' => 'TP' . str_pad((string) $user->id, 12, '0', STR_PAD_LEFT),
            'status' => 'active',
        ]);

        $balances = [
            'AZN' => (float) ($data['initial_azn'] ?? 0),
            'EUR' => (float) ($data['initial_eur'] ?? 0),
            'USD' => (float) ($data['initial_usd'] ?? 0),
        ];

        foreach ($balances as $currency => $amount) {
            WalletBalance::create([
                'wallet_id' => $wallet->id,
                'currency_code' => $currency,
                'balance' => $amount,
                'locked_balance' => 0.0000,
            ]);
        }

        $user->load(['wallet.balances', 'department', 'userGroup.permissions']);

        $this->auditLogService->log(
            $request->user(),
            'admin.user_created',
            User::class,
            $user->id,
            null,
            ['name' => $user->name, 'email' => $user->email, 'role' => $user->role, 'department_id' => $user->department_id, 'user_group_id' => $user->user_group_id],
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'status' => 'success',
            'message' => "Yeni istifadəçi ({$user->name}) uğurla yaradıldı və departament/qrup təyin edildi.",
            'data' => new UserResource($user),
        ], 201);
    }

    public function updateUser(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'phone' => ['nullable', 'string', 'max:50'],
            'role' => ['sometimes', 'string', 'in:user,admin,merchant'],
            'department_id' => ['nullable'],
            'user_group_id' => ['nullable'],
            'status' => ['sometimes', 'string', 'in:active,suspended,frozen'],
        ]);

        $deptId = null;
        if (!empty($data['department_id'])) {
            $dept = Department::find($data['department_id']);
            if (!$dept) {
                return response()->json(['status' => 'error', 'message' => 'Seçilmiş departament tapılmadı.'], 422);
            }
            $deptId = $dept->id;
        }

        $groupId = null;
        if (!empty($data['user_group_id'])) {
            $group = UserGroup::find($data['user_group_id']);
            if (!$group) {
                return response()->json(['status' => 'error', 'message' => 'Seçilmiş istifadəçi qrupu tapılmadı.'], 422);
            }
            $groupId = $group->id;
        }

        $oldValues = [
            'department_id' => $user->department_id,
            'user_group_id' => $user->user_group_id,
            'role' => $user->role,
            'status' => $user->status,
            'name' => $user->name,
        ];

        $updatePayload = [];
        if (array_key_exists('name', $data)) $updatePayload['name'] = $data['name'];
        if (array_key_exists('email', $data)) $updatePayload['email'] = $data['email'];
        if (array_key_exists('phone', $data)) $updatePayload['phone'] = $data['phone'];
        if (array_key_exists('role', $data)) $updatePayload['role'] = $data['role'];
        if (array_key_exists('status', $data)) $updatePayload['status'] = $data['status'];
        if (array_key_exists('department_id', $data)) $updatePayload['department_id'] = $deptId;
        if (array_key_exists('user_group_id', $data)) $updatePayload['user_group_id'] = $groupId;

        $user->update($updatePayload);

        if (!$user->isActive()) {
            $user->tokens()->delete();
        }

        $user->load(['wallet.balances', 'department', 'userGroup.permissions']);

        $this->auditLogService->log(
            $request->user(),
            'admin.user_updated',
            User::class,
            $user->id,
            $oldValues,
            $updatePayload,
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'status' => 'success',
            'message' => "İstifadəçi ({$user->name}) məlumatları və departament/qrup təyinatı uğurla yeniləndi.",
            'data' => new UserResource($user),
        ]);
    }

    public function departments(): JsonResponse
    {
        $departments = Department::withCount(['users', 'userGroups'])
            ->orderBy('id')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $departments,
        ]);
    }

    public function createDepartment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', 'unique:departments,code'],
            'description' => ['nullable', 'string'],
            'manager_name' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'in:active,inactive'],
        ]);

        $dept = Department::create($data);

        $this->auditLogService->log(
            $request->user(),
            'admin.department_created',
            Department::class,
            $dept->id,
            null,
            $dept->toArray(),
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'status' => 'success',
            'message' => "Yeni departament ({$dept->name}) uğurla yaradıldı.",
            'data' => $dept,
        ], 201);
    }

    public function updateDepartment(Request $request, int $id): JsonResponse
    {
        $dept = Department::findOrFail($id);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => ['sometimes', 'string', 'max:50', 'unique:departments,code,' . $dept->id],
            'description' => ['nullable', 'string'],
            'manager_name' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'in:active,inactive'],
        ]);

        $old = $dept->only(array_keys($data));
        $dept->update($data);

        $this->auditLogService->log(
            $request->user(),
            'admin.department_updated',
            Department::class,
            $dept->id,
            $old,
            $data,
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Departament məlumatları yeniləndi.',
            'data' => $dept,
        ]);
    }

    public function deleteDepartment(Request $request, int $id): JsonResponse
    {
        $dept = Department::withCount('users')->findOrFail($id);

        if ($dept->users_count > 0) {
            return response()->json([
                'status' => 'error',
                'message' => "Bu departamentə bağlı {$dept->users_count} istifadəçi var. Silmədən öncə istifadəçiləri başqa departamentə köçürün.",
            ], 422);
        }

        $old = $dept->toArray();
        $dept->delete();

        $this->auditLogService->log(
            $request->user(),
            'admin.department_deleted',
            Department::class,
            $id,
            $old,
            null,
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Departament uğurla silindi.',
        ]);
    }

    public function departmentMembers(int $id): JsonResponse
    {
        $dept = Department::findOrFail($id);
        $members = User::where('department_id', $dept->id)
            ->with(['userGroup:id,name,slug'])
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'status', 'department_id', 'user_group_id', 'created_at']);

        $candidates = User::where(function ($q) use ($dept) {
                $q->whereNull('department_id')
                  ->orWhere('department_id', '!=', $dept->id);
            })
            ->with(['department:id,name,code', 'userGroup:id,name'])
            ->orderBy('name')
            ->take(100)
            ->get(['id', 'name', 'email', 'role', 'department_id', 'user_group_id']);

        return response()->json([
            'status' => 'success',
            'data' => [
                'department' => $dept,
                'members' => $members,
                'candidates' => $candidates,
            ],
        ]);
    }

    public function assignDepartmentMember(Request $request, int $id): JsonResponse
    {
        $dept = Department::findOrFail($id);
        $data = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
        ]);

        $user = User::findOrFail($data['user_id']);
        $oldDeptId = $user->department_id;
        $user->update(['department_id' => $dept->id]);

        $this->auditLogService->log(
            $request->user(),
            'admin.department_member_assigned',
            User::class,
            $user->id,
            ['department_id' => $oldDeptId],
            ['department_id' => $dept->id],
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'status' => 'success',
            'message' => "{$user->name} uğurla {$dept->name} departamentinə təyin edildi.",
            'data' => new UserResource($user->fresh(['wallet.balances', 'department', 'userGroup.permissions'])),
        ]);
    }

    public function removeDepartmentMember(Request $request, int $id, int $userId): JsonResponse
    {
        $dept = Department::findOrFail($id);
        $user = User::where('id', $userId)->where('department_id', $dept->id)->firstOrFail();

        $user->update(['department_id' => null]);

        $this->auditLogService->log(
            $request->user(),
            'admin.department_member_removed',
            User::class,
            $user->id,
            ['department_id' => $dept->id],
            ['department_id' => null],
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'status' => 'success',
            'message' => "{$user->name} {$dept->name} departamentindən çıxarıldı (təyinat ləğv edildi).",
            'data' => new UserResource($user->fresh(['wallet.balances', 'department', 'userGroup.permissions'])),
        ]);
    }

    public function userGroups(): JsonResponse
    {
        $groups = UserGroup::with(['department:id,name,code', 'permissions'])
            ->withCount('users')
            ->orderBy('id')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $groups,
        ]);
    }

    public function createUserGroup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'description' => ['nullable', 'string'],
            'permission_ids' => ['nullable', 'array'],
            'permission_ids.*' => ['exists:permissions,id'],
        ]);

        $slug = Str::slug($data['name'], '_');
        $originalSlug = $slug;
        $counter = 1;
        while (UserGroup::where('slug', $slug)->exists()) {
            $slug = "{$originalSlug}_{$counter}";
            $counter++;
        }

        $group = UserGroup::create([
            'name' => $data['name'],
            'slug' => $slug,
            'department_id' => $data['department_id'] ?? null,
            'description' => $data['description'] ?? null,
            'is_system' => false,
        ]);

        if (!empty($data['permission_ids'])) {
            $group->permissions()->sync($data['permission_ids']);
        }

        $group->load(['department', 'permissions']);

        $this->auditLogService->log(
            $request->user(),
            'admin.user_group_created',
            UserGroup::class,
            $group->id,
            null,
            $group->toArray(),
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'status' => 'success',
            'message' => "Yeni istifadəçi qrupu ({$group->name}) uğurla yaradıldı.",
            'data' => $group,
        ], 201);
    }

    public function updateUserGroup(Request $request, int $id): JsonResponse
    {
        $group = UserGroup::findOrFail($id);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'description' => ['nullable', 'string'],
        ]);

        $old = $group->only(array_keys($data));
        $group->update($data);

        $this->auditLogService->log(
            $request->user(),
            'admin.user_group_updated',
            UserGroup::class,
            $group->id,
            $old,
            $data,
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Qrup məlumatları yeniləndi.',
            'data' => $group->load(['department', 'permissions']),
        ]);
    }

    public function deleteUserGroup(Request $request, int $id): JsonResponse
    {
        $group = UserGroup::withCount('users')->findOrFail($id);

        if ($group->is_system) {
            return response()->json([
                'status' => 'error',
                'message' => 'Sistem qrupunu silmək olmaz.',
            ], 422);
        }

        if ($group->users_count > 0) {
            return response()->json([
                'status' => 'error',
                'message' => "Bu qrupa bağlı {$group->users_count} istifadəçi var. Qrupu silmədən öncə istifadəçiləri başqa qrupa təyin edin.",
            ], 422);
        }

        $old = $group->toArray();
        $group->permissions()->detach();
        $group->delete();

        $this->auditLogService->log(
            $request->user(),
            'admin.user_group_deleted',
            UserGroup::class,
            $id,
            $old,
            null,
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'İstifadəçi qrupu silindi.',
        ]);
    }

    public function permissions(): JsonResponse
    {
        $permissions = Permission::orderBy('category')->orderBy('id')->get();

        return response()->json([
            'status' => 'success',
            'data' => $permissions,
        ]);
    }

    public function updateGroupPermissions(Request $request, int $groupId): JsonResponse
    {
        // STRICT AUTHORIZATION ENFORCEMENT:
        // Only System Administrator OR users who possess the 'manage_permissions' permission can grant/change permissions!
        if (!$request->user()->canManagePermissions()) {
            return response()->json([
                'status' => 'error',
                'message' => 'İcazə verilmədi! Yalnız Sistem Administratoru və ya "İcazələri İdarə Etmə" (manage_permissions) səlahiyyəti olan istifadəçilər icazələri dəyişə bilər.',
            ], 403);
        }

        $request->validate([
            'permission_ids' => ['present', 'array'],
            'permission_ids.*' => ['exists:permissions,id'],
        ]);

        $group = UserGroup::findOrFail($groupId);

        $oldPermissions = $group->permissions()->pluck('slug')->toArray();
        $group->permissions()->sync($request->input('permission_ids'));
        $newPermissions = $group->permissions()->pluck('slug')->toArray();

        $this->auditLogService->log(
            $request->user(),
            'admin.group_permissions_updated',
            UserGroup::class,
            $group->id,
            ['permissions' => $oldPermissions],
            ['permissions' => $newPermissions],
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'status' => 'success',
            'message' => "'{$group->name}' qrupunun icazələri uğurla yeniləndi.",
            'data' => $group->load(['department', 'permissions']),
        ]);
    }

    public function createFraudRule(Request $request): JsonResponse
    {
        $data = $request->validate([
            'rule_name' => ['required', 'string', 'max:255'],
            'rule_code' => ['required', 'string', 'max:50', 'unique:fraud_rules,rule_code'],
            'description' => ['required', 'string'],
            'rule_type' => ['required', 'string', 'max:50'],
            'condition_operator' => ['required', 'string', 'max:10'],
            'threshold_value' => ['required', 'string'],
            'risk_weight' => ['required', 'integer', 'min:0', 'max:100'],
            'action' => ['required', 'string', 'in:flag,step_up_2fa,hold,block'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $rule = FraudRule::create($data);

        $this->auditLogService->log(
            $request->user(),
            'admin.fraud_rule_created',
            FraudRule::class,
            $rule->id,
            null,
            $rule->toArray(),
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'status' => 'success',
            'message' => "Yeni Fraud Qaydası / Riski ({$rule->rule_name}) uğurla əlavə edildi.",
            'data' => $rule,
        ], 201);
    }

    public function createFraudAlert(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'severity' => ['required', 'string', 'in:low,medium,high,critical'],
            'risk_score' => ['required', 'integer', 'min:0', 'max:100'],
            'details' => ['nullable', 'array'],
        ]);

        $alert = FraudAlert::create([
            'user_id' => $data['user_id'],
            'title' => $data['title'],
            'description' => $data['description'],
            'severity' => $data['severity'],
            'risk_score' => $data['risk_score'],
            'status' => 'new',
            'details' => $data['details'] ?? ['source' => 'Manual Risk Assessment / Admin Console'],
            'triggered_rules' => ['MANUAL_INVESTIGATION_FLAG'],
        ]);

        $this->auditLogService->log(
            $request->user(),
            'admin.fraud_alert_created',
            FraudAlert::class,
            $alert->id,
            null,
            $alert->toArray(),
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Yeni Fraud Siqnalı / İnsidenti qeydə alındı.',
            'data' => $alert->load('user:id,name,email'),
        ], 201);
    }

    public function createLedgerEntry(Request $request): JsonResponse
    {
        $data = $request->validate([
            'account_id' => ['required', 'exists:ledger_accounts,id'],
            'entry_type' => ['required', 'string', 'in:debit,credit'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency_code' => ['required', 'string', 'size:3'],
            'description' => ['required', 'string', 'max:255'],
            'reference' => ['nullable', 'string', 'max:100'],
        ]);

        $account = LedgerAccount::findOrFail($data['account_id']);

        $entry = LedgerEntry::create([
            'ledger_account_id' => $account->id,
            'entry_type' => $data['entry_type'],
            'amount' => $data['amount'],
            'currency_code' => strtoupper($data['currency_code']),
            'description' => $data['description'],
            'reference' => $data['reference'] ?? ('MANUAL-' . strtoupper(Str::random(8))),
            'posted_at' => now(),
        ]);

        // Adjust ledger account balance
        if ($data['entry_type'] === 'debit') {
            $account->increment('balance', $data['amount']);
        } else {
            $account->decrement('balance', $data['amount']);
        }

        $this->auditLogService->log(
            $request->user(),
            'admin.ledger_entry_created',
            LedgerEntry::class,
            $entry->id,
            null,
            $entry->toArray(),
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Manual jurnal qeydi uğurla baş kitaba daxil edildi.',
            'data' => $entry->load('account'),
        ], 201);
    }

    public function creditWallet(Request $request, int $walletId): JsonResponse
    {
        $wallet = Wallet::with('user')->findOrFail($walletId);

        $data = $request->validate([
            'currency_code' => ['required', 'string', 'size:3'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $currency = strtoupper($data['currency_code']);
        $amount = (float) $data['amount'];

        $balance = WalletBalance::firstOrCreate(
            ['wallet_id' => $wallet->id, 'currency_code' => $currency],
            ['balance' => 0.0000, 'locked_balance' => 0.0000]
        );

        $oldBalance = (float) $balance->balance;
        $balance->increment('balance', $amount);

        // Record a transaction record for audit trace
        Transaction::create([
            'user_id' => $wallet->user_id,
            'wallet_id' => $wallet->id,
            'type' => 'top_up',
            'status' => 'completed',
            'amount' => $amount,
            'currency_code' => $currency,
            'reference_number' => 'ADMIN-CREDIT-' . strtoupper(Str::random(10)),
            'description' => 'Admin Manual Credit: ' . $data['reason'],
        ]);

        $this->auditLogService->log(
            $request->user(),
            'admin.wallet_credited',
            Wallet::class,
            $wallet->id,
            ['balance' => $oldBalance, 'currency' => $currency],
            ['balance' => $balance->balance, 'amount' => $amount, 'reason' => $data['reason']],
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'status' => 'success',
            'message' => "Pul kisəsinə {$amount} {$currency} məbləğində vəsait əlavə edildi.",
            'data' => $wallet->load('balances'),
        ]);
    }
}
