<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\BlockedIp;
use App\Models\CryptoHolding;
use App\Models\FraudAlert;
use App\Models\FraudRule;
use App\Models\KycVerification;
use App\Models\LedgerAccount;
use App\Models\LedgerEntry;
use App\Models\Merchant;
use App\Models\SecurityEvent;
use App\Models\Transaction;
use App\Models\TravelBooking;
use App\Models\TravelExpense;
use App\Models\Trip;
use App\Models\User;
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
        $query = User::with(['wallet.balances', 'devices']);

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

        $users = $query->orderByDesc('id')->paginate($this->perPage($request, 15));

        return response()->json([
            'status' => 'success',
            'data' => $users->items(),
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
}
