<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

/**
 * Business-rule failure inside a wallet / payment flow. Rendered as a clean JSON error
 * so the UI can show the message and react to the error code (e.g. step-up 2FA).
 */
class WalletException extends Exception
{
    public function __construct(
        string $message,
        protected int $httpStatus = 422,
        protected string $errorCode = 'wallet_error',
        protected array $context = []
    ) {
        parent::__construct($message);
    }

    public function errorCode(): string
    {
        return $this->errorCode;
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'error_code' => $this->errorCode,
            'message' => $this->getMessage(),
            'context' => $this->context ?: null,
        ], $this->httpStatus);
    }
}
