<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

/**
 * FAKE China WayBill API (development only).
 *
 * It copies the shape of the real endpoint used by ChinaWayBillService:
 *   POST  {CHINA_API_URL}{CHINA_API_ENDPOINT}   (form fields: page, limit, Token, InsideNO ...)
 *   ->    {"code":0,"msg":"ok","count":N,"data":[ {...row...} ]}
 *
 * so the real "Sync China" button can be tested end-to-end, including product
 * images, before the production China API is connected. Images are generated
 * SVGs served by this same app (no internet needed).
 *
 * Disabled automatically when APP_ENV=production.
 */
class MockWayBillApiController extends Controller
{
    private const TOTAL_ROWS = 30;

    public function query(Request $request)
    {
        if (app()->environment('production')) {
            abort(404);
        }

        $expected = (string) env('CHINA_MOCK_TOKEN', 'mock-token');
        if ((string) $request->input('Token') !== $expected) {
            return response()->json(['code' => 401, 'msg' => 'Invalid token (fake API expects CHINA_MOCK_TOKEN).', 'count' => 0, 'data' => []]);
        }

        $rows = collect($this->rows($request));

        if ($inside = trim((string) $request->input('InsideNO'))) {
            $rows = $rows->filter(fn ($r) => strcasecmp($r['InsideNO'], $inside) === 0);
        }

        $page = max(1, (int) $request->input('page', 1));
        $limit = min(200, max(1, (int) $request->input('limit', 100)));

        return response()->json([
            'code' => 0,
            'msg' => 'ok (FAKE China API)',
            'count' => $rows->count(),
            'data' => $rows->slice(($page - 1) * $limit, $limit)->values()->all(),
        ]);
    }

    public function image(string $n)
    {
        if (app()->environment('production')) {
            abort(404);
        }

        $n = max(1, (int) $n);
        $palette = [
            ['#dbeafe', '#1d4ed8'], ['#dcfce7', '#15803d'], ['#fef3c7', '#b45309'],
            ['#fce7f3', '#be185d'], ['#ede9fe', '#6d28d9'], ['#ffedd5', '#c2410c'],
        ];
        [$bg, $fg] = $palette[($n - 1) % count($palette)];
        $label = 'FAKE PHOTO #' . $n;

        $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">
  <rect width="480" height="480" fill="{$bg}"/>
  <rect x="120" y="150" width="240" height="180" rx="12" fill="none" stroke="{$fg}" stroke-width="8"/>
  <path d="M120 150 L240 90 L360 150" fill="none" stroke="{$fg}" stroke-width="8" stroke-linejoin="round"/>
  <line x1="240" y1="90" x2="240" y2="330" stroke="{$fg}" stroke-width="8"/>
  <text x="240" y="400" font-family="Arial, sans-serif" font-size="30" font-weight="bold" text-anchor="middle" fill="{$fg}">{$label}</text>
  <text x="240" y="440" font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="{$fg}">Sample product image</text>
</svg>
SVG;

        return response($svg, 200, [
            'Content-Type' => 'image/svg+xml',
            'Cache-Control' => 'public, max-age=3600',
            'Access-Control-Allow-Origin' => '*',
        ]);
    }

    private function rows(Request $request): array
    {
        // Absolute image host = whoever is serving this fake API.
        $host = $request->getSchemeAndHttpHost() . '/api/v1/mock-china/image/';

        $containers = ['YCLFAKE01', 'YCLFAKE02', 'YCLFAKE03'];
        $goods = ['Sports Shoes', 'Phone Cases', 'Kitchen Tools', 'Ladies Dress', 'LED Lamp', 'Toys', 'Home Decor', 'Car Accessories'];
        $rows = [];

        for ($i = 1; $i <= self::TOTAL_ROWS; $i++) {
            $imgA = $i;
            $imgB = $i + 1;
            $imgC = $i + 2;

            $row = [
                'Number' => 'YCFAKE' . str_pad((string) $i, 5, '0', STR_PAD_LEFT),
                'InsideNO' => $containers[($i - 1) % count($containers)],
                'CustomerNumber' => 'HFL' . str_pad((string) (100 + (int) ceil($i / 4)), 5, '0', STR_PAD_LEFT),
                'CustomerName' => 'Fake Customer ' . (int) ceil($i / 4),
                'GoodsName' => $goods[($i - 1) % count($goods)],
                'CustomerVolume' => round(0.05 + fmod($i * 0.041, 0.55), 4),
                'ExpressQTY' => (($i - 1) % 4) + 1,
            ];

            // Vary the image field style so every parsing path gets tested.
            switch ($i % 5) {
                case 1: // single absolute URL
                    $row['GoodsImage'] = $host . $imgA . '.svg';
                    break;
                case 2: // comma separated list
                    $row['PicUrls'] = $host . $imgA . '.svg,' . $host . $imgB . '.svg,' . $host . $imgC . '.svg';
                    break;
                case 3: // relative path (completed with CHINA_API_IMAGE_BASE / CHINA_API_URL)
                    $row['ImgPath'] = 'mock-china/image/' . $imgA . '.svg';
                    break;
                case 4: // real JSON array
                    $row['Images'] = [$host . $imgA . '.svg', $host . $imgB . '.svg'];
                    break;
                default: // no image at all
                    break;
            }

            $rows[] = $row;
        }

        return $rows;
    }
}
