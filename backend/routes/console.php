<?php

use App\Models\VirtualCard;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('travelpay:reset-card-limits', function () {
    $count = VirtualCard::where('spent_this_month', '>', 0)->update(['spent_this_month' => 0]);
    $this->info("Reset monthly spend limits for {$count} virtual card(s).");
})->purpose('Reset monthly spent_this_month on virtual cards')->monthlyOn(1, '00:00');
