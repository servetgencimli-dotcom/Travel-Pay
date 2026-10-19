<?php

/*
|--------------------------------------------------------------------------
| TravelPay sandbox catalogue & security settings
|--------------------------------------------------------------------------
| Simulated partner inventory (hotels, airlines, tours) and Open Banking
| providers. Prices are per night / per passenger / per person.
*/

return [

    'catalog' => [
        'hotel' => [
            ['code' => 'HTL-FLAME', 'title' => 'Fairmont Flame Towers', 'provider' => 'Fairmont', 'destination' => 'Baku', 'price' => 420, 'currency' => 'AZN', 'rating' => 4.8, 'accepts_crypto' => true],
            ['code' => 'HTL-OLDCITY', 'title' => 'Old City Inn', 'provider' => 'Icherisheher Hotels', 'destination' => 'Baku', 'price' => 140, 'currency' => 'AZN', 'rating' => 4.5, 'accepts_crypto' => false],
            ['code' => 'HTL-SHAHDAG', 'title' => 'Shahdag Mountain Resort', 'provider' => 'Shahdag Tourism', 'destination' => 'Qusar', 'price' => 260, 'currency' => 'AZN', 'rating' => 4.7, 'accepts_crypto' => true],
            ['code' => 'HTL-GABALA', 'title' => 'Qafqaz Riverside Gabala', 'provider' => 'Qafqaz Hotels', 'destination' => 'Gabala', 'price' => 180, 'currency' => 'AZN', 'rating' => 4.4, 'accepts_crypto' => false],
            ['code' => 'HTL-SHEKI', 'title' => 'Sheki Palace Boutique', 'provider' => 'Sheki Saray', 'destination' => 'Sheki', 'price' => 110, 'currency' => 'AZN', 'rating' => 4.6, 'accepts_crypto' => true],
        ],
        'flight' => [
            ['code' => 'FLT-IST-GYD', 'title' => 'Istanbul → Baku', 'provider' => 'AZAL', 'destination' => 'Baku', 'price' => 190, 'currency' => 'EUR', 'rating' => 4.5, 'accepts_crypto' => true],
            ['code' => 'FLT-DXB-GYD', 'title' => 'Dubai → Baku', 'provider' => 'flydubai', 'destination' => 'Baku', 'price' => 260, 'currency' => 'USD', 'rating' => 4.3, 'accepts_crypto' => true],
            ['code' => 'FLT-LON-GYD', 'title' => 'London → Baku', 'provider' => 'AZAL', 'destination' => 'Baku', 'price' => 340, 'currency' => 'EUR', 'rating' => 4.6, 'accepts_crypto' => false],
            ['code' => 'FLT-GYD-NAJ', 'title' => 'Baku → Nakhchivan', 'provider' => 'AZAL', 'destination' => 'Nakhchivan', 'price' => 75, 'currency' => 'AZN', 'rating' => 4.4, 'accepts_crypto' => false],
        ],
        'tour' => [
            ['code' => 'TOUR-GOBUSTAN', 'title' => 'Gobustan & Mud Volcanoes', 'provider' => 'Baku Tours', 'destination' => 'Gobustan', 'price' => 65, 'currency' => 'AZN', 'rating' => 4.9, 'accepts_crypto' => true],
            ['code' => 'TOUR-OLDCITY', 'title' => 'Icherisheher Walking Tour', 'provider' => 'Old City Guides', 'destination' => 'Baku', 'price' => 30, 'currency' => 'AZN', 'rating' => 4.8, 'accepts_crypto' => false],
            ['code' => 'TOUR-ABSHERON', 'title' => 'Yanar Dag & Ateshgah', 'provider' => 'Absheron Trips', 'destination' => 'Absheron', 'price' => 50, 'currency' => 'AZN', 'rating' => 4.7, 'accepts_crypto' => true],
        ],
    ],

    'banks' => [
        ['code' => 'KAPITAL', 'name' => 'Kapital Bank'],
        ['code' => 'PASHA', 'name' => 'PASHA Bank'],
        ['code' => 'ABB', 'name' => 'ABB'],
        ['code' => 'RESPUBLIKA', 'name' => 'Bank Respublika'],
        ['code' => 'UNIBANK', 'name' => 'Unibank'],
        ['code' => 'WISE', 'name' => 'Wise (International)'],
    ],

    'security' => [
        // Requests per IP per minute before the DDoS shield auto-blocks the address.
        'ddos_requests_per_minute' => (int) env('TRAVELPAY_DDOS_RPM', 300),
        'ddos_block_minutes' => (int) env('TRAVELPAY_DDOS_BLOCK_MINUTES', 15),
        // Sandbox OTP "123456" accepted as a 2FA code. Never enable this in production.
        'demo_otp_enabled' => (bool) env('TRAVELPAY_DEMO_OTP', in_array(env('APP_ENV', 'production'), ['local', 'testing'], true)),
    ],
];
