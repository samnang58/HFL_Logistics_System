<?php

namespace App\Services\Telegram;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class TelegramBotService
{
    private function client(): PendingRequest
    {
        $token = config('services.telegram.token');

        if (!is_string($token) || trim($token) === '') {
            throw new RuntimeException(
                'Telegram Bot token is not configured.'
            );
        }

        return Http::acceptJson()
            ->asJson()
            ->connectTimeout(5)
            ->timeout(15);
    }

    private function endpoint(string $method): string
    {
        return rtrim(config('services.telegram.api_url'), '/')
            . '/bot'
            . config('services.telegram.token')
            . '/'
            . $method;
    }

    public function sendMessage(
        int|string $chatId,
        string $text,
        ?array $replyMarkup = null
    ): array {
        $payload = [
            'chat_id' => $chatId,
            'text' => $text,
        ];

        if ($replyMarkup !== null) {
            $payload['reply_markup'] = $replyMarkup;
        }

        $response = $this->client()->post(
            $this->endpoint('sendMessage'),
            $payload
        );

        $response->throw();

        $data = $response->json();

        if (!is_array($data) || !($data['ok'] ?? false)) {
            throw new RuntimeException(
                'Telegram did not accept the message.'
            );
        }

        return $data;
    }

    public function sendPhoto(
        int|string $chatId,
        string $photoUrl,
        ?string $caption = null
    ): array {
        if (!filter_var($photoUrl, FILTER_VALIDATE_URL)
            || !in_array(
                strtolower((string) parse_url($photoUrl, PHP_URL_SCHEME)),
                ['https', 'http'],
                true
            )
        ) {
            throw new RuntimeException(
                'Photo URL must be a valid HTTP or HTTPS URL.'
            );
        }

        $payload = [
            'chat_id' => $chatId,
            'photo' => $photoUrl,
        ];

        if ($caption !== null && $caption !== '') {
            $payload['caption'] = $caption;
        }

        $response = $this->client()->post(
            $this->endpoint('sendPhoto'),
            $payload
        );

        $response->throw();

        $data = $response->json();

        if (!is_array($data) || !($data['ok'] ?? false)) {
            throw new RuntimeException(
                'Telegram did not accept the photo.'
            );
        }

        return $data;
    }
}
