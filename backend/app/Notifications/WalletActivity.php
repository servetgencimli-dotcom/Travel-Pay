<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

/**
 * In-app notification shown in the bell menu (stored in the notifications table).
 */
class WalletActivity extends Notification
{
    public function __construct(
        public string $title,
        public string $body,
        public string $kind = 'info'
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'body' => $this->body,
            'kind' => $this->kind,
        ];
    }
}
