<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ExpenseCategory;
use App\Models\TravelBudget;
use App\Models\TravelExpense;
use App\Models\Trip;
use App\Services\Travel\TravelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TripController extends Controller
{
    public function __construct(
        protected TravelService $travel
    ) {}

    public function index(Request $request): JsonResponse
    {
        $trips = Trip::where('user_id', $request->user()->id)
            ->with(['budgets', 'expenses'])
            ->orderByRaw("CASE status WHEN 'active' THEN 0 WHEN 'planned' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END")
            ->orderBy('start_date')
            ->get()
            ->map(fn (Trip $t) => array_merge($this->present($t), ['summary' => $this->travel->summary($t)]));

        return $this->ok($trips);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'destination_country' => ['required', 'string', 'max:80'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'base_currency' => ['required', 'string', 'in:AZN,EUR,USD'],
            'budget' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
        ]);

        $trip = Trip::create([
            'user_id' => $request->user()->id,
            'title' => $data['title'],
            'destination_country' => $data['destination_country'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'base_currency' => $data['base_currency'],
            'status' => now()->between($data['start_date'], now()->parse($data['end_date'])->endOfDay()) ? 'active' : 'planned',
        ]);

        if (!empty($data['budget'])) {
            TravelBudget::create(['trip_id' => $trip->id, 'currency_code' => $data['base_currency'], 'total_budget' => $data['budget']]);
        }

        return $this->ok($this->present($trip), 'Trip created.', 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $trip = $this->trip($request, $id)->load(['budgets', 'expenses' => fn ($q) => $q->with('category')->orderByDesc('spent_at')]);

        return $this->ok(array_merge($this->present($trip), [
            'summary' => $this->travel->summary($trip),
            'budgets' => $trip->budgets,
            'expenses' => $trip->expenses->map(fn (TravelExpense $e) => [
                'id' => $e->id,
                'category' => $e->category?->name,
                'color' => $e->category?->color,
                'amount' => (float) $e->amount,
                'currency' => $e->original_currency,
                'reporting_amount' => (float) $e->reporting_amount,
                'reporting_currency' => $e->reporting_currency,
                'description' => $e->description,
                'from_wallet' => $e->transaction_id !== null,
                'spent_at' => $e->spent_at?->toISOString(),
            ]),
            'bookings' => $trip->id ? \App\Models\TravelBooking::where('trip_id', $trip->id)->orderBy('start_date')->get() : [],
        ]));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $trip = $this->trip($request, $id);
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:120'],
            'status' => ['sometimes', 'string', 'in:planned,active,completed,cancelled'],
            'end_date' => ['sometimes', 'date', 'after_or_equal:' . $trip->start_date->toDateString()],
        ]);

        $trip->update($data);

        return $this->ok($this->present($trip), 'Trip updated.');
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->trip($request, $id)->delete();

        return $this->ok(null, 'Trip deleted.');
    }

    public function setBudget(Request $request, int $id): JsonResponse
    {
        $trip = $this->trip($request, $id);
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0', 'max:1000000'],
        ]);

        TravelBudget::updateOrCreate(
            ['trip_id' => $trip->id, 'currency_code' => $trip->base_currency],
            ['total_budget' => $data['amount']]
        );

        return $this->ok($this->travel->summary($trip->fresh()), 'Budget saved.');
    }

    public function addExpense(Request $request, int $id): JsonResponse
    {
        $trip = $this->trip($request, $id);
        $data = $request->validate([
            'expense_category_id' => ['required', 'integer', 'exists:expense_categories,id'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:1000000'],
            'currency' => ['required', 'string', 'in:AZN,EUR,USD'],
            'description' => ['nullable', 'string', 'max:140'],
            'spent_at' => ['nullable', 'date'],
        ]);

        $expense = $this->travel->addExpense($trip, $request->user(), $data);

        return $this->ok($expense, 'Expense added (cash / external).', 201);
    }

    public function deleteExpense(Request $request, int $id, int $expenseId): JsonResponse
    {
        $trip = $this->trip($request, $id);
        TravelExpense::where('trip_id', $trip->id)->whereNull('transaction_id')->findOrFail($expenseId)->delete();

        return $this->ok(null, 'Expense removed.');
    }

    public function categories(): JsonResponse
    {
        return $this->ok(ExpenseCategory::orderBy('id')->get());
    }

    protected function trip(Request $request, int $id): Trip
    {
        return Trip::where('user_id', $request->user()->id)->findOrFail($id);
    }

    protected function present(Trip $t): array
    {
        return [
            'id' => $t->id,
            'title' => $t->title,
            'destination_country' => $t->destination_country,
            'start_date' => $t->start_date->toDateString(),
            'end_date' => $t->end_date->toDateString(),
            'base_currency' => $t->base_currency,
            'status' => $t->status,
        ];
    }
}
