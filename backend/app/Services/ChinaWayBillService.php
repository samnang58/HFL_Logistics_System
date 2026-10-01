<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class ChinaWayBillService
{
    /**
     * CHINA_API_MODE=mock  -> use the built-in FAKE China API (development only).
     * CHINA_API_MODE=real  -> call the real China API (default).
     * The fake is never used when APP_ENV=production.
     */
    public function isMock(): bool
    {
        return strtolower(trim((string) env('CHINA_API_MODE', 'real'))) === 'mock'
            && !app()->environment('production');
    }

    /**
     * Calls the fake API inside the same PHP process, so it also works with a
     * single-worker `php artisan serve` (an HTTP call to itself would hang).
     */
    private function queryMock(int $page, int $limit, ?string $insideNo): array
    {
        $appUrl = rtrim((string) config('app.url', 'http://127.0.0.1:8000'), '/');

        $request = \Illuminate\Http\Request::create(
            $appUrl . '/api/v1/mock-china/WayBill/QueryWayBillSpeed',
            'POST',
            [
                'page' => $page,
                'limit' => $limit,
                'InsideNO' => $insideNo ?? '',
                'Token' => (string) env('CHINA_MOCK_TOKEN', 'mock-token'),
            ]
        );

        $json = app(\App\Http\Controllers\MockWayBillApiController::class)
            ->query($request)
            ->getData(true);

        if (!is_array($json) || (string) ($json['code'] ?? '') !== '0') {
            throw new RuntimeException((string) ($json['msg'] ?? 'Fake China API failed.'));
        }

        return $json;
    }

    public function query(int $page = 1, int $limit = 100, ?string $insideNo = null, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        if ($this->isMock()) {
            return $this->queryMock($page, $limit, $insideNo);
        }

        $base = rtrim((string) env('CHINA_API_URL'), '/');
        $endpoint = env('CHINA_API_ENDPOINT', '/api/WayBill/QueryWayBillSpeed');
        $url = $base . $endpoint;
        $token = trim((string) env('CHINA_API_TOKEN'));

        if ($base === '' || $token === '') {
            throw new RuntimeException('China API is not configured. Set CHINA_API_URL and CHINA_API_TOKEN.');
        }

        $payload = [
            'page' => $page,
            'limit' => $limit,
            'Token' => $token,
            'IsComplete' => '', 'Status' => '', 'PortId' => '', 'SalerId' => '',
            'InsideNO' => $insideNo ?? '',
            'ChannelSupplierId' => '', 'PaymentStatus' => '', 'DestinationPortId' => '',
            'Keywords' => '模糊搜索',
            'ShippingMethodId' => '', 'IsGroup' => '', 'ShipmentId' => '', 'ShipmentPortId' => '',
            'ShippingChannelId' => '', 'Company' => '', 'OrderType' => '',
            'FormNO' => env('CHINA_API_FORM_NO', 'ty-sy'),
            'STOCKID' => env('CHINA_API_STOCK_ID', '1'),
            'ShelfNo' => '', 'Marks' => '',
        ];

        if ($dateFrom || $dateTo) {
            $from = $dateFrom ?: $dateTo;
            $to = $dateTo ?: $dateFrom;
            $payload['BegEndDate'] = $this->formatDateRange($from, $to);
        } elseif (($range = trim((string) env('CHINA_API_DATE_RANGE'))) !== '') {
            $payload['BegEndDate'] = $range;
        }

        $response = Http::asForm()
            ->acceptJson()
            ->timeout((int) env('CHINA_API_TIMEOUT', 60))
            ->post($url, $payload);

        if ($response->failed()) {
            throw new RuntimeException('China API HTTP request failed. HTTP status: '.$response->status());
        }

        $json = $response->json();
        if (!is_array($json)) {
            throw new RuntimeException('China API returned invalid JSON.');
        }
        if (isset($json['code']) && (string)$json['code'] !== '0') {
            throw new RuntimeException((string)($json['msg'] ?? 'China API authentication/query failed.'));
        }

        return $json;
    }

    public function queryAll(?string $insideNo = null, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        $limit = min(200, max(20, (int) env('CHINA_API_PAGE_SIZE', 100)));
        $page = 1;
        $all = [];
        $reported = null;
        $maxPages = max(1, (int) env('CHINA_API_MAX_PAGES', 500));

        do {
            $json = $this->query($page, $limit, $insideNo, $dateFrom, $dateTo);
            $rows = $json['data'] ?? $json['packages'] ?? [];
            if (!is_array($rows)) $rows = [];
            foreach ($rows as $row) if (is_array($row)) $all[] = $row;
            if (isset($json['count']) && is_numeric($json['count'])) $reported = (int)$json['count'];
            $page++;
            $hasMore = count($rows) >= $limit && ($reported === null || count($all) < $reported);
        } while ($hasMore && $page <= $maxPages);

        return ['rows'=>$all, 'count'=>$reported ?? count($all), 'pages'=>$page-1];
    }

    /**
     * Collect product/goods image URLs from one China API row.
     *
     * The exact image field name depends on the China system, so every key that
     * looks like an image field (img / image / pic / photo / picture) is scanned.
     * Values can be a URL, a list separated by , ; | or new lines, or an array.
     * Relative paths are completed with CHINA_API_IMAGE_BASE (or CHINA_API_URL).
     */
    public function extractImages(array $row): array
    {
        $base = $this->isMock()
            ? rtrim((string) config('app.url', 'http://127.0.0.1:8000'), '/') . '/api/v1'
            : rtrim((string) (env('CHINA_API_IMAGE_BASE') ?: env('CHINA_API_URL')), '/');
        $urls = [];

        $collect = function ($value) use (&$collect, &$urls) {
            if (is_array($value)) {
                foreach ($value as $v) {
                    $collect($v);
                }
                return;
            }
            if (!is_string($value)) {
                return;
            }
            foreach (preg_split('/[\s,;|]+/', trim($value)) as $part) {
                $part = trim($part, " \t\n\r\0\x0B\"'");
                if ($part !== '') {
                    $urls[] = $part;
                }
            }
        };

        foreach ($row as $key => $value) {
            $k = strtolower((string) $key);
            if (!preg_match('/(img|image|pic|photo)/', $k)) {
                continue;
            }
            if (preg_match('/^(is|has)|(count|number|qty|flag|status|size|width|height)/', $k)) {
                continue;
            }
            $collect($value);
        }

        $clean = [];
        foreach ($urls as $url) {
            if (preg_match('#^https?://#i', $url)) {
                // keep as is
            } elseif (str_starts_with($url, '//')) {
                $url = 'https:' . $url;
            } elseif ($base !== '' && preg_match('#^/?[\w\-./%]+\.(jpe?g|png|gif|webp|bmp|svg)(\?.*)?$#i', $url)) {
                $url = $base . '/' . ltrim($url, '/');
            } else {
                continue;
            }
            $clean[$url] = true;
        }

        return array_slice(array_keys($clean), 0, 12);
    }

    private function formatDateRange(string $from, string $to): string
    {
        return date('Y-n-j', strtotime($from)).' - '.date('Y-n-j', strtotime($to));
    }
}
