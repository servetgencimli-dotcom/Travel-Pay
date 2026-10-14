<?php

namespace App\Services\Travel;

use App\Models\ExpenseCategory;
use App\Models\Transaction;
use App\Models\TravelExpense;
use App\Models\Trip;
use App\Models\User;
use App\Services\Wallet\ExchangeRateService;
use Illuminate\Support\Carbon;

class TravelService
{
    /** Merchant / booking categories mapped onto expense categories. */
    protected const CATEGORY_MAP = [
        'hotel' => 'Hotels',
        'hotels' => 'Hotels',
        'restaurant' => 'Restaurants',
        'restaurants' => 'Restaurants',
        'cafe' => 'Restaurants',
        'transport' => 'Transportation',
        'transportation' => 'Transportation',
        'flight' => 'Transportation',
        'taxi' => 'Transportation',
        'museum' => 'Museums',
        'museums' => 'Museums',
        'tour' => 'Entertainment',
        'entertainment' => 'Entertainment',
        'shopping' => 'Shopping',
        'retail' => 'Shopping',
    ];

    public function __construct(
        protected ExchangeRateService $rates
    ) {}

    /**
     * The trip a purchase belongs to: an active trip covering today, else any planned trip covering today.
     */
    public function currentTrip(User $user, ?Carbon $date = null): ?Trip
    {
        $date = ($date ?? now())->toDateString();

        return Trip::where('user_id', $user->id)
            ->whereIn('status', ['active', 'planned'])
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
            ->first();
    }

    /**
     * Smart tourism: wallet spending during a trip is logged as a travel expense automatically.
     */
    public function trackExpense(User $user, Transaction $tx, string $category, ?string $description = null, ?Trip $trip = null): ?TravelExpense
    {
        $trip ??= $this->currentTrip($user);
        if (!$trip) {
            return null;
        }

        return $this->addExpense($trip, $user, [
            'expense_category_id' => $this->categoryId($category),
            'amount' => (string) $tx->amount,
            'currency' => $tx->currency_code,
            'description' => $description ?? $tx->description,
            'spent_at' => now(),
            'transaction_id' => $tx->id,
        ]);
    }

    public function addExpense(Trip $trip, User $user, array $data): TravelExpense
    {
        $rate = $this->rates->rate($data['currency'], $trip->base_currency);

        return TravelExpense::create([
            'trip_id' => $trip->id,
            'user_id' => $user->id,
            'expense_category_id' => $data['expense_category_id'],
            'transaction_id' => $data['transaction_id'] ?? null,
            'amount' => $data['amount'],
            'original_currency' => strtoupper($data['currency']),
            'reporting_amount' => bcmul((string) $data['amount'], $rate, 4),
            'reporting_currency' => $trip->base_currency,
            'exchange_rate' => $rate,
            'description' => $data['description'] ?? null,
            'spent_at' => $data['spent_at'] ?? now(),
        ]);
    }

    public function categoryId(string $category): int
    {
        $name = self::CATEGORY_MAP[strtolower($category)] ?? ucfirst(strtolower($category));

        return ExpenseCategory::where('name', $name)->value('id')
            ?? ExpenseCategory::firstOrCreate(['name' => 'Other'], ['icon' => 'more_horiz', 'color' => '#6B7280'])->id;
    }

    /**
     * Budget vs. actual, per-category split, burn rate and plain-language tips.
     */
    public function summary(Trip $trip): array
    {
        $trip->loadMissing('budgets', 'expenses.category');

        $base = $trip->base_currency;
        $spent = (float) $trip->expenses->sum('reporting_amount');
        $budget = (float) $trip->budgets->sum(fn ($b) => (float) $this->rates->convert($b->total_budget, $b->currency_code, $base));

        $days = max(1, (int) $trip->start_date->diffInDays($trip->end_date) + 1);
        $elapsed = min($days, max(1, (int) $trip->start_date->diffInDays(now()->startOfDay()) + 1));
        $daysLeft = max(0, $days - $elapsed);

        $byCategory = $trip->expenses
            ->groupBy(fn ($e) => $e->category?->name ?? 'Other')
            ->map(fn ($items, $name) => [
                'category' => $name,
                'color' => $items->first()->category?->color ?? '#6B7280',
                'amount' => round((float) $items->sum('reporting_amount'), 2),
                'count' => $items->count(),
            ])
            ->sortByDesc('amount')
            ->values();

        $dailyAverage = $spent / max(1, $elapsed);
        $projected = $dailyAverage * $days;
        $remaining = $budget - $spent;

        $tips = [];
        if ($budget > 0 && $projected > $budget) {
            $tips[] = sprintf('At the current pace you will spend %.2f %s — %.2f over budget. Aim for %.2f %s/day.', $projected, $base, $projected - $budget, $daysLeft > 0 ? max(0, $remaining) / $daysLeft : 0, $base);
        } elseif ($budget > 0) {
            $tips[] = sprintf('You are on track: projected spend %.2f of %.2f %s.', $projected, $budget, $base);
        }
        if ($top = $byCategory->first()) {
            if ($spent > 0 && $top['amount'] / $spent > 0.5) {
                $tips[] = "{$top['category']} is over half of your spending — look for TravelPay partners with cashback.";
            }
        }
        if ($budget == 0.0) {
            $tips[] = 'Set a budget for this trip to unlock pacing insights.';
        }

        return [
            'base_currency' => $base,
            'total_budget' => round($budget, 2),
            'total_spent' => round($spent, 2),
            'remaining' => round($remaining, 2),
            'usage_percent' => $budget > 0 ? round($spent / $budget * 100, 1) : null,
            'trip_days' => $days,
            'days_elapsed' => $elapsed,
            'days_left' => $daysLeft,
            'daily_average' => round($dailyAverage, 2),
            'projected_total' => round($projected, 2),
            'by_category' => $byCategory,
            'tips' => $tips,
        ];
    }
}
