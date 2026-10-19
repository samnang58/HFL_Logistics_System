<?php

namespace App\Http\Controllers\Telegram;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Models\Container;
use App\Models\TrackingEvent;
use App\Services\Telegram\TelegramBotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller
{
    public function __invoke(
        Request $request,
        TelegramBotService $telegram
    ): JsonResponse {
        $secret = config('services.telegram.webhook_secret');
        $providedSecret = $request->header(
            'X-Telegram-Bot-Api-Secret-Token',
            ''
        );

        if (
            !is_string($secret) ||
            $secret === '' ||
            !is_string($providedSecret) ||
            !hash_equals($secret, $providedSecret)
        ) {
            return response()->json(['ok' => false], 401);
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

        if (
            !is_array($message) ||
            !isset($message['chat']['id']) ||
            !is_string($message['text'] ?? null)
        ) {
            return response()->json(['ok' => true]);
        }

        $chatId = $message['chat']['id'];
        $text = trim($message['text']);
        $parts = preg_split('/\s+/', $text, 2);
        $command = strtolower(explode('@', $parts[0] ?? '')[0]);
        $cacheKey = 'telegram:track:' . $chatId;

        try {
            if ($command === '/start') {
                Cache::forget($cacheKey);

                $reply =
                    "សូមស្វាគមន៍មកកាន់ HFL Smart Logistics! 📦\n\n"
                    . "🔎 /track - តាមដានទំនិញ\n"
                    . "📦 /my_packages - កញ្ចប់ទំនិញរបស់ខ្ញុំ\n"
                    . "❓ /help - ជំនួយ\n"
                    . "☎️ /contact - ទំនាក់ទំនង";

                $telegram->sendMessage($chatId, $reply);
            } elseif ($command === '/help') {
                $telegram->sendMessage(
                    $chatId,
                    "📦 HFL Smart Logistics\n\n"
                    . "/track - តាមដានទំនិញ\n"
                    . "អ្នកអាចវាយ /track តាមដោយ Tracking Number "
                    . "ឬវាយ /track រួចផ្ញើលេខកញ្ចប់ក្នុងសារបន្ទាប់។\n\n"
                    . "/my_packages - កញ្ចប់ទំនិញរបស់ខ្ញុំ\n"
                    . "/contact - ទំនាក់ទំនងក្រុមការងារ"
                );
            } elseif ($command === '/track') {
                $trackingNumber = trim($parts[1] ?? '');

                if ($trackingNumber === '') {
                    Cache::put(
                        $cacheKey,
                        true,
                        now()->addMinutes(10)
                    );

                    $telegram->sendMessage(
                        $chatId,
                        "🔎 សូមផ្ញើ Tracking Number របស់អ្នក។\n"
                        . "ឧទាហរណ៍៖ HFL00001 ឬលេខកូដកញ្ចប់របស់អ្នក។\n\n"
                        . "សំណើនេះមានសុពលភាព 10 នាទី។"
                    );
                } else {
                    Cache::forget($cacheKey);
                    $this->sendTrackingResult(
                        $chatId,
                        $trackingNumber,
                        $telegram
                    );
                }
            } elseif ($command === '/my_packages') {
                $telegram->sendMessage(
                    $chatId,
                    "🔐 សូមភ្ជាប់ Telegram ជាមួយគណនីអតិថិជន "
                    . "HFL ដោយសុវត្ថិភាពជាមុន។\n"
                    . "មុខងារនេះមិនទាន់បង្ហាញកញ្ចប់តាមគណនីបានទេ។"
                );
            } elseif ($command === '/contact') {
                $telegram->sendMessage(
                    $chatId,
                    "☎️ សូមទាក់ទងក្រុមការងារ HFL Logistics "
                    . "តាមបណ្តាញផ្លូវការរបស់ក្រុមហ៊ុន។"
                );
            } elseif (!str_starts_with($text, '/')
                && Cache::get($cacheKey)) {
                Cache::forget($cacheKey);

                $this->sendTrackingResult(
                    $chatId,
                    $text,
                    $telegram
                );
            } else {
                $telegram->sendMessage(
                    $chatId,
                    "សូមវាយ /start ដើម្បីមើលមុខងារ Bot "
                    . "ឬ /track ដើម្បីតាមដានទំនិញ។"
                );
            }
        } catch (\Throwable $e) {
            Log::warning('Telegram webhook processing failed', [
                'update_id' => $update['update_id'],
                'exception' => get_class($e),
            ]);

            try {
                $telegram->sendMessage(
                    $chatId,
                    "សូមអភ័យទោស! ប្រព័ន្ធមានបញ្ហាបណ្តោះអាសន្ន។ "
                    . "សូមសាកល្បងម្តងទៀតនៅពេលក្រោយ។"
                );
            } catch (\Throwable $sendError) {
                Log::warning('Telegram error reply failed', [
                    'update_id' => $update['update_id'],
                    'exception' => get_class($sendError),
                ]);
            }
        }

        return response()->json(['ok' => true]);
    }

    private function sendTrackingResult(
        int|string $chatId,
        string $trackingNumber,
        TelegramBotService $telegram
    ): void {
        $trackingNumber = trim($trackingNumber);

        if ($trackingNumber === '' || strlen($trackingNumber) > 150) {
            $telegram->sendMessage(
                $chatId,
                "❌ Tracking Number មិនត្រឹមត្រូវទេ។ "
                . "សូមពិនិត្យហើយសាកល្បងម្តងទៀត។"
            );
            return;
        }

        $package = Package::with([
            'containers.shipment',
            'containers.trackingEvents',
        ])
            ->where(function ($query) use ($trackingNumber) {
                $query->where('tracking_number', $trackingNumber)
                    ->orWhere('china_waybill_number', $trackingNumber)
                    ->orWhere('hfl_package_code', $trackingNumber)
                    ->orWhere('china_container_number', $trackingNumber)
                    ->orWhere('package_id', $trackingNumber)
                    ->orWhere('code', $trackingNumber);
            })
            ->first();

        if (!$package) {
            $telegram->sendMessage(
                $chatId,
                "❌ រកមិនឃើញកញ្ចប់នេះទេ។\n\n"
                . "លេខដែលបានស្វែងរក៖ {$trackingNumber}\n"
                . "សូមពិនិត្យ Tracking Number ហើយសាកល្បងម្តងទៀត។"
            );
            return;
        }

        // Match the existing Tracking API's active-container selection.
        $container = $package->containers
            ->first(fn ($item) => is_null($item->pivot?->unloaded_at))
            ?? $package->containers->first();

        // Support older/imported packages without a pivot record.
        if (!$container && $package->china_container_number) {
            $container = Container::with([
                'shipment',
                'trackingEvents',
            ])
                ->where(
                    'container_number',
                    $package->china_container_number
                )
                ->first();
        }

        $packageEvents = TrackingEvent::query()
            ->where(function ($query) use ($package) {
                $query->where('package_id', $package->id);

                if ($package->tracking_number) {
                    $query->orWhere(
                        'tracking_number',
                        $package->tracking_number
                    );
                }
            })
            ->orderBy('event_at')
            ->orderBy('id')
            ->get();

        $containerEvents = $container?->trackingEvents
            ? $container->trackingEvents
                ->sortBy(fn ($event) => [
                    $event->event_date?->timestamp ?? 0,
                    $event->id,
                ])
                ->values()
            : collect();

        $latestContainerEvent = $containerEvents->last();

        $transportStatuses = [
            'Pending',
            'Loading',
            'Departed China',
            'In Transit',
            'Cambodia Port',
            'Customs',
            'Cambodia Warehouse',
            'Received',
            'Delivered',
        ];

        $latestPackageTransportEvent = $packageEvents
            ->filter(fn ($event) => in_array(
                (string) $event->status,
                $transportStatuses,
                true
            ))
            ->last();

        $packageMovementIsLatest = false;

        if ($latestPackageTransportEvent) {
            if (!$latestContainerEvent?->event_date) {
                $packageMovementIsLatest = true;
            } elseif ($latestPackageTransportEvent->event_at) {
                $packageMovementIsLatest =
                    $latestPackageTransportEvent->event_at
                        ->gt($latestContainerEvent->event_date);
            }
        }

        $containerStatus = $latestContainerEvent?->status
            ?: $container?->status;

        $containerLocation = $latestContainerEvent?->location
            ?: $container?->current_location;

        $status = $packageMovementIsLatest
            ? $latestPackageTransportEvent->status
            : ($containerStatus ?: $package->status ?: 'មិនទាន់មានស្ថានភាព');

        $location = $packageMovementIsLatest
            ? ($latestPackageTransportEvent->location
                ?: $containerLocation
                ?: $package->warehouse_location)
            : ($containerLocation
                ?: $package->warehouse_location
                ?: 'មិនទាន់មានព័ត៌មាន');

        $product = $package->product_name ?: 'មិនមានឈ្មោះផលិតផល';

        $reply =
            "📦 HFL LOGISTICS — TRACKING\n\n"
            . "🔢 Tracking Number: "
            . ($package->tracking_number ?: $package->package_id)
            . "\n"
            . "📦 HFL Package Code: "
            . ($package->hfl_package_code ?: $package->code ?: 'N/A')
            . "\n"
            . "🛍 ផលិតផល: {$product}\n"
            . "📍 ទីតាំង: {$location}\n"
            . "🚚 ស្ថានភាព: {$status}\n";

        if ($container?->container_number) {
            $reply .= "🚢 Container: {$container->container_number}\n";
        }

        if ($container?->shipment?->shipment_number) {
            $reply .= "📄 Shipment: {$container->shipment->shipment_number}\n";
        }

        if ($container?->estimated_arrival) {
            $reply .= "📅 ETA: "
                . $container->estimated_arrival->format('d/m/Y')
                . "\n";
        }

        // Merge container movement history with later package events.
        $timeline = $containerEvents->map(function ($event) use ($container) {
            return [
                'status' => $event->status,
                'location' => $event->location,
                'note' => $event->remarks,
                'event_at' => $event->event_date?->toISOString(),
                'source' => 'container',
                'id' => $event->id,
            ];
        });

        $laterPackageEvents = $packageEvents->filter(
            function ($event) use ($latestContainerEvent) {
                if (!$latestContainerEvent?->event_date || !$event->event_at) {
                    return true;
                }

                return $event->event_at->gt(
                    $latestContainerEvent->event_date
                );
            }
        );

        $timeline = $timeline->concat(
            $laterPackageEvents->map(function ($event) {
                return [
                    'status' => $event->status,
                    'location' => $event->location,
                    'note' => $event->note,
                    'event_at' => $event->event_at?->toISOString(),
                    'source' => 'package',
                    'id' => $event->id,
                ];
            })
        );

        $recentEvents = $timeline
            ->sortBy(fn ($event) => [
                $event['event_at'] ?? '',
                $event['id'],
            ])
            ->reverse()
            ->take(5);

        if ($recentEvents->isNotEmpty()) {
            $reply .= "\n🕒 ប្រវត្តិដឹកជញ្ជូន៖\n";

            foreach ($recentEvents as $event) {
                $date = $event['event_at']
                    ? \Illuminate\Support\Carbon::parse(
                        $event['event_at']
                    )->format('d/m/Y H:i')
                    : 'មិនមានកាលបរិច្ឆេទ';

                $reply .= "\n• " . ($event['status'] ?: 'មិនមានស្ថានភាព');

                if ($event['location']) {
                    $reply .= " — {$event['location']}";
                }

                $reply .= "\n  {$date}";

                if ($event['note']) {
                    $reply .= "\n  {$event['note']}";
                }

                $reply .= "\n";
            }
        } else {
            $reply .= "\nℹ️ មិនទាន់មានប្រវត្តិ Tracking បន្ថែមទេ។";
        }

        $telegram->sendMessage($chatId, $reply);

        // Send a package image if a valid public image URL exists.
        $images = array_merge(
            is_array($package->product_images)
                ? $package->product_images : [],
            is_array($package->custom_images)
                ? $package->custom_images : []
        );

        $urls = [];
        $collectUrls = function ($value) use (&$collectUrls, &$urls) {
            if (is_string($value)) {
                if (
                    filter_var($value, FILTER_VALIDATE_URL) &&
                    in_array(
                        strtolower((string) parse_url($value, PHP_URL_SCHEME)),
                        ['http', 'https'],
                        true
                    )
                ) {
                    $urls[] = $value;
                }
                return;
            }

            if (is_array($value)) {
                foreach ($value as $item) {
                    $collectUrls($item);
                }
            }
        };

        $collectUrls($images);
        $photoUrl = $urls[0] ?? null;

        if ($photoUrl) {
            try {
                $telegram->sendPhoto(
                    $chatId,
                    $photoUrl,
                    '📦 រូបភាពកញ្ចប់: ' . $trackingNumber
                );
            } catch (\Throwable $e) {
                Log::warning('Telegram package photo failed', [
                    'package_id' => $package->package_id,
                    'exception' => get_class($e),
                ]);
            }
        }
    }
}
