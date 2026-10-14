<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\Wallet\ExchangeRateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Data analytics on the user's own spending behaviour and payment patterns.
 */
class InsightsController extends Controller
{
    protected const OUTGOING = ['transfer', 'payment', 'booking', 'card_payment', 'crypto_payment', 'crypto_buy'];

    public function __invoke(Request $request, ExchangeRateService $rates): JsonResponse
    {
        $user = $request->user();
        $days = min(365, max(7, $request->integer('days', 30)));
        $since = now()->subDays($days - 1)->startOfDay();

        $outgoing = Transaction::where('user_id', $user->id)
            ->where('status', 'completed')
            ->whereIn('type', self::OUTGOING)
            ->where('created_at', '>=', $since)
            ->get()
            ->map(function (Transaction $tx) use ($rates) {
                $tx->azn = (float) $rates->toAzn($tx->amount, $tx->currency_code);
                $tx->bucket = match ($tx->type) {
                    'payment' => $tx->metadata['merchant_category'] ?? 'QR Payments',
                    'card_payment' => $tx->metadata['category'] ?? 'Card Payments',
                    'booking', 'crypto_payment' => 'Travel Bookings',
                    'transfer' => 'P2P Transfers',
                    'crypto_buy' => 'Virtual Assets',
                    default => 'Other',
                };

                return $tx;
            });

        $incoming = Transaction::where('status', 'completed')
            ->where('created_at', '>=', $since)
            ->where(fn ($q) => $q->where(fn ($q) => $q->where('user_id', $user->id)->whereIn('type', ['top_up', 'refund', 'crypto_sell']))
                ->orWhere(fn ($q) => $q->where('recipient_user_id', $user->id)->whereIn('type', ['transfer', 'payment'])))
            ->get()
            ->sum(fn ($tx) => (float) $rates->toAzn($tx->amount, $tx->currency_code));

        $total = $outgoing->sum('azn');

        $byCategory = $outgoing->groupBy('bucket')
            ->map(fn ($items, $name) => [
                'category' => $name,
                'amount_azn' => round($items->sum('azn'), 2),
                'count' => $items->count(),
                'share' => $total > 0 ? round($items->sum('azn') / $total * 100, 1) : 0,
            ])
            ->sortByDesc('amount_azn')
            ->values();

        $daily = [];
        for ($d = $since->copy(); $d->lte(now()); $d->addDay()) {
            $daily[$d->toDateString()] = 0;
        }
        foreach ($outgoing as $tx) {
            $key = $tx->created_at->toDateString();
            if (isset($daily[$key])) {
                $daily[$key] += $tx->azn;
            }
        }

        $weekday = collect(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])->mapWithKeys(fn ($d) => [$d => 0]);
        foreach ($outgoing as $tx) {
            $weekday[$tx->created_at->format('D')] += $tx->azn;
        }

        $byCurrency = $outgoing->groupBy('currency_code')->map(fn ($items, $code) => [
            'currency_code' => $code,
            'amount' => round($items->sum(fn ($t) => (float) $t->amount), 2),
            'amount_azn' => round($items->sum('azn'), 2),
        ])->values();

        $topMerchants = $outgoing->filter(fn ($tx) => !empty($tx->metadata['merchant_name']))
            ->groupBy(fn ($tx) => $tx->metadata['merchant_name'])
            ->map(fn ($items, $name) => ['merchant' => $name, 'amount_azn' => round($items->sum('azn'), 2), 'visits' => $items->count()])
            ->sortByDesc('amount_azn')
            ->take(5)
            ->values();

        $cashback = $outgoing->sum(fn ($tx) => (float) ($tx->metadata['cashback'] ?? 0));
        $avg = $outgoing->count() ? $total / $outgoing->count() : 0;
        $busiestDay = $weekday->sortDesc()->keys()->first();

        $tips = [];
        if ($top = $byCategory->first()) {
            $tips[] = "Your biggest spending category is {$top['category']} ({$top['share']}% of spend).";
        }
        if ($total > 0 && $busiestDay) {
            $tips[] = "You spend the most on {$busiestDay}s — plan bigger purchases with partner cashback in mind.";
        }
        if ($byCurrency->count() > 1) {
            $tips[] = 'You pay in ' . $byCurrency->count() . ' currencies. Exchanging in-app ahead of time avoids card FX markups.';
        }
        if ($cashback > 0) {
            $tips[] = sprintf('You earned %.2f in cashback from TravelPay partners.', $cashback);
        }
        if ($incoming < $total && $total > 0) {
            $tips[] = sprintf('Outflows exceeded inflows by %.2f AZN over this period.', $total - $incoming);
        }

        return $this->ok([
            'period_days' => $days,
            'total_spent_azn' => round($total, 2),
            'total_received_azn' => round($incoming, 2),
            'net_flow_azn' => round($incoming - $total, 2),
            'transaction_count' => $outgoing->count(),
            'average_transaction_azn' => round($avg, 2),
            'largest_transaction_azn' => round((float) $outgoing->max('azn'), 2),
            'cashback_earned' => round($cashback, 2),
            'by_category' => $byCategory,
            'by_currency' => $byCurrency,
            'daily' => collect($daily)->map(fn ($v, $d) => ['date' => $d, 'amount_azn' => round($v, 2)])->values(),
            'by_weekday' => $weekday->map(fn ($v, $d) => ['day' => $d, 'amount_azn' => round($v, 2)])->values(),
            'top_merchants' => $topMerchants,
            'tips' => $tips,
        ]);
    }
}
