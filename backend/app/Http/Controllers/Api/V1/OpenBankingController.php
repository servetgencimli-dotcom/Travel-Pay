<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LinkedBankAccount;
use App\Services\Security\AuditLogService;
use App\Services\Security\SecurityAlertService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Open Banking (sandbox): link bank accounts via a time-limited consent and top up the wallet.
 * Only a masked IBAN and a hash are stored — never the full account number.
 */
class OpenBankingController extends Controller
{
    public function __construct(
        protected AuditLogService $audit,
        protected SecurityAlertService $alerts
    ) {}

    public function banks(): JsonResponse
    {
        return $this->ok(config('travelpay.banks'));
    }

    public function index(Request $request): JsonResponse
    {
        $accounts = LinkedBankAccount::where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($a) => $this->present($a));

        return $this->ok($accounts);
    }

    public function link(Request $request): JsonResponse
    {
        $banks = collect(config('travelpay.banks'));
        $data = $request->validate([
            'bank_code' => ['required', 'string', 'in:' . $banks->pluck('code')->implode(',')],
            'iban' => ['required', 'string', 'regex:/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/'],
            'account_holder' => ['required', 'string', 'max:120'],
            'currency' => ['required', 'string', 'in:AZN,EUR,USD'],
            'consent' => ['accepted'],
        ], [
            'iban.regex' => 'Enter a valid IBAN, e.g. AZ21NABZ00000000137010001944.',
        ]);

        $user = $request->user();
        $iban = strtoupper(str_replace(' ', '', $data['iban']));
        $bank = $banks->firstWhere('code', $data['bank_code']);
        $consentToken = Str::random(48);

        $account = LinkedBankAccount::updateOrCreate(
            ['user_id' => $user->id, 'iban_hash' => hash('sha256', $iban)],
            [
                'bank_name' => $bank['name'],
                'bank_code' => $bank['code'],
                'iban_masked' => substr($iban, 0, 4) . ' **** **** ' . substr($iban, -4),
                'account_holder' => $data['account_holder'],
                'currency_code' => $data['currency'],
                // Sandbox bank API reports a simulated available balance.
                'available_balance' => random_int(3000, 15000),
                'consent_token_hash' => hash('sha256', $consentToken),
                'consent_expires_at' => now()->addDays(90),
                'status' => 'active',
            ]
        );

        $this->alerts->recordSecurityEvent($user, 'bank_account_linked', 'info', $request->ip(), $request->userAgent(), metadata: ['bank' => $bank['name'], 'iban' => $account->iban_masked]);
        $this->audit->log($user, 'open_banking.linked', LinkedBankAccount::class, $account->id, null, ['bank' => $bank['name'], 'iban' => $account->iban_masked], $request->ip(), $request->userAgent());

        return $this->ok($this->present($account), "{$bank['name']} linked with 90-day consent.", 201);
    }

    public function revoke(Request $request, int $id): JsonResponse
    {
        $account = LinkedBankAccount::where('user_id', $request->user()->id)->findOrFail($id);
        $account->update(['status' => 'revoked', 'consent_token_hash' => null, 'consent_expires_at' => now()]);

        $this->audit->log($request->user(), 'open_banking.revoked', LinkedBankAccount::class, $account->id, null, null, $request->ip(), $request->userAgent());

        return $this->ok(null, 'Bank consent revoked.');
    }

    protected function present(LinkedBankAccount $a): array
    {
        return [
            'id' => $a->id,
            'bank_name' => $a->bank_name,
            'bank_code' => $a->bank_code,
            'iban_masked' => $a->iban_masked,
            'account_holder' => $a->account_holder,
            'currency_code' => $a->currency_code,
            'available_balance' => (float) $a->available_balance,
            'consent_valid' => $a->hasValidConsent(),
            'consent_expires_at' => $a->consent_expires_at?->toISOString(),
        ];
    }
}
