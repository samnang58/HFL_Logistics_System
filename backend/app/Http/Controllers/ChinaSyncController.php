<?php

namespace App\Http\Controllers;

use App\Models\PackageSyncLog;
use App\Services\ChinaWayBillService;
use Illuminate\Http\Request;

class ChinaSyncController extends ApiController
{
    private function configured(): bool
    {
        return strtolower(trim((string) env('CHINA_API_MODE', 'disabled'))) === 'real'
            && trim((string) env('CHINA_API_URL', '')) !== ''
            && trim((string) env('CHINA_API_TOKEN', '')) !== '';
    }

    public function status()
    {
        $mode = strtolower(trim((string) env('CHINA_API_MODE', 'disabled')));

        return $this->ok([
            'mode' => $mode === 'real' ? 'real' : 'disabled',
            'mock_enabled' => false,
            'configured' => $this->configured(),
            'endpoint' => env(
                'CHINA_API_ENDPOINT',
                '/api/WayBill/QueryWayBillSpeed'
            ),
            'last_sync' => PackageSyncLog::latest('synced_at')->first(),
        ], 'China API status');
    }

    public function preview(
        Request $request,
        ChinaWayBillService $china
    ) {
        if (!$this->configured()) {
            return response()->json([
                'success' => false,
                'mode' => 'disabled',
                'configured' => false,
                'message' => 'Real China API is not configured.',
            ], 503);
        }

        $limit = max(
            1,
            min(100, (int) $request->input('limit', 20))
        );

        $result = $china->query(
            1,
            $limit,
            $request->input('inside_no'),
            $request->input('date_from'),
            $request->input('date_to')
        );

        return $this->ok($result, 'China API preview');
    }

    public function logs(Request $request)
    {
        $perPage = max(
            1,
            min(100, (int) $request->input('per_page', 20))
        );

        return $this->ok(
            PackageSyncLog::latest('synced_at')->paginate($perPage),
            'China sync logs'
        );
    }
}
