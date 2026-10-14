<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\KycVerification;
use App\Services\Security\AuditLogService;
use App\Services\Security\SecurityAlertService;
use App\Services\Wallet\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * eKYC (sandbox): document + liveness check producing a verification decision.
 */
class KycController extends Controller
{
    public function __construct(
        protected AuditLogService $audit,
        protected SecurityAlertService $alerts
    ) {}

    public function status(Request $request): JsonResponse
    {
        $kyc = $request->user()->latestKyc;

        return $this->ok([
            'verified' => $request->user()->isKycVerified(),
            'unverified_limit_azn' => WalletService::UNVERIFIED_TX_LIMIT_AZN,
            'latest' => $kyc,
        ]);
    }

    public function submit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'document_type' => ['required', 'string', 'in:passport,id_card,driver_license'],
            'document_number' => ['required', 'string', 'min:5', 'max:20', 'regex:/^[A-Za-z0-9]+$/'],
            'nationality' => ['required', 'string', 'size:2'],
            'date_of_birth' => ['required', 'date', 'before:-16 years'],
            'selfie_confirmed' => ['required', 'boolean'],
        ], [
            'date_of_birth.before' => 'You must be at least 16 years old.',
        ]);

        $user = $request->user();
        $number = strtoupper($data['document_number']);
        $hash = hash('sha256', $data['document_type'] . '|' . $number);

        // Identity fraud check: the same document cannot back two different accounts.
        $duplicate = KycVerification::where('document_number_hash', $hash)
            ->where('user_id', '!=', $user->id)
            ->where('status', 'verified')
            ->exists();

        $documentScore = $duplicate ? 20 : random_int(88, 99);
        $livenessScore = $data['selfie_confirmed'] ? random_int(86, 99) : random_int(30, 55);
        $verified = !$duplicate && $documentScore >= 80 && $livenessScore >= 80;

        $kyc = KycVerification::create([
            'user_id' => $user->id,
            'document_type' => $data['document_type'],
            'document_number_masked' => substr($number, 0, 2) . str_repeat('*', max(2, strlen($number) - 4)) . substr($number, -2),
            'document_number_hash' => $hash,
            'nationality' => strtoupper($data['nationality']),
            'date_of_birth' => $data['date_of_birth'],
            'document_score' => $documentScore,
            'liveness_score' => $livenessScore,
            'status' => $verified ? 'verified' : 'rejected',
            'rejection_reason' => $duplicate
                ? 'Document is already linked to another TravelPay account.'
                : ($verified ? null : 'Liveness check failed — please retake the selfie.'),
            'verified_at' => $verified ? now() : null,
        ]);

        $this->alerts->recordSecurityEvent(
            $user,
            $duplicate ? 'kyc_duplicate_identity' : ($verified ? 'kyc_verified' : 'kyc_rejected'),
            $duplicate ? 'high' : ($verified ? 'info' : 'low'),
            $request->ip(),
            $request->userAgent(),
            metadata: ['document_type' => $data['document_type'], 'document' => $kyc->document_number_masked]
        );
        $this->audit->log($user, 'kyc.submitted', KycVerification::class, $kyc->id, null, ['status' => $kyc->status, 'document' => $kyc->document_number_masked], $request->ip(), $request->userAgent());

        return $this->ok($kyc, $verified ? 'Identity verified. Higher limits unlocked.' : $kyc->rejection_reason, $verified ? 201 : 422);
    }
}
