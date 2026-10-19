<?php

namespace App\Http\Controllers\Telegram;

use App\Http\Controllers\Controller;
use App\Services\Telegram\TelegramBotService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller
{
    public function __invoke(
        Request $request,
        TelegramBotService $telegram
    ): JsonResponse {
        $secret = config('services.telegram.webhook_secret');

        if (!is_string($secret) || $secret === '') {
            return response()->json([
                'success' => false,
                'message' => 'Telegram webhook is not configured.',
            ], 503);
        }

        $providedSecret = $request->header(
            'X-Telegram-Bot-Api-Secret-Token',
            ''
        );

        if (!is_string($providedSecret)
            || !hash_equals($secret, $providedSecret)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 401);
        }

        $update = $request->validate([
            'update_id' => ['required', 'integer'],
            'message' => ['sometimes', 'array'],
            'message.chat.id' => ['sometimes', 'integer'],
            'message.text' => [
                'sometimes', 'nullable', 'string', 'max:4096'
            ],
        ]);

        $message = $update['message'] ?? null;

        if (!is_array($message)
            || !isset($message['chat']['id'])
            || !is_string($message['text'] ?? null)) {
            return response()->json(['ok' => true]);
        }

        $chatId = $message['chat']['id'];
        $text = trim($message['text']);

        $parts = preg_split('/\s+/', $text, 2);
        $command = strtolower($parts[0] ?? '');
        $command = explode('@', $command)[0];

        $reply = match ($command) {
            '/start' =>
                "សូមស្វាគមន៍មកកាន់ HFL Smart Logistics! 📦\n\n"
                . "/track - តាមដានទំនិញ\n"
                . "/my_packages - កញ្ចប់ទំនិញរបស់ខ្ញុំ\n"
                . "/help - ជំនួយ\n"
                . "/contact - ទំនាក់ទំនង",

            '/help' =>
                "📦 HFL Smart Logistics\n\n"
                . "/track - តាមដានទំនិញ\n"
                . "/my_packages - មើលកញ្ចប់ទំនិញ\n"
                . "/contact - ទំនាក់ទំនងក្រុមការងារ",

            '/track' =>
                "🔎 សូមផ្ញើ Tracking Number របស់អ្នក។\n"
                . "មុខងារស្វែងរកទិន្នន័យពិតនឹងភ្ជាប់ជំហានបន្ទាប់។",

            '/my_packages' =>
                "🔐 សូមភ្ជាប់ Telegram ជាមួយគណនីអតិថិជន "
                . "HFL ដោយសុវត្ថិភាពជាមុន។",

            '/contact' =>
                "📞 សូមទាក់ទងក្រុមការងារ HFL Logistics "
                . "តាមបណ្តាញផ្លូវការរបស់ក្រុមហ៊ុន។",

            default =>
                "សូមវាយ /start ដើម្បីមើលមុខងារ Bot។",
        };

        try {
            $telegram->sendMessage($chatId, $reply);
        } catch (\Throwable $e) {
            Log::warning('Telegram reply failed', [
                'update_id' => $update['update_id'],
                'exception' => get_class($e),
            ]);
        }

        return response()->json(['ok' => true]);
    }
}
