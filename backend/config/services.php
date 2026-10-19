<?php

return [
    'telegram' => [
        'token' => env('TELEGRAM_BOT_TOKEN'),
        'webhook_secret' => env('TELEGRAM_WEBHOOK_SECRET'),
        'api_url' => 'https://api.telegram.org',
    ],
];
