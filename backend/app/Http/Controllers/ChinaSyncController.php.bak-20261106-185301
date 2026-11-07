<?php
namespace App\Http\Controllers;

use App\Models\PackageSyncLog;
use App\Services\ChinaWayBillService;
use Illuminate\Http\Request;

class ChinaSyncController extends ApiController
{
    public function status()
    {
        $last = PackageSyncLog::latest('synced_at')->first();
        return $this->ok([
            'mode' => env('CHINA_API_MODE', 'mock'),
            'mock_enabled' => true,
            'configured' => env('CHINA_API_MODE', 'mock') === 'mock'
                || (trim((string)env('CHINA_API_URL')) !== '' && trim((string)env('CHINA_API_TOKEN')) !== ''),
            'endpoint' => env('CHINA_API_ENDPOINT','/api/WayBill/QueryWayBillSpeed'),
            'last_sync' => $last,
        ], 'China API status');
    }

    public function preview(Request $request, ChinaWayBillService $china)
    {
        $result = $china->query(1, min(100,(int)$request->input('limit',20)), $request->input('inside_no'), $request->input('date_from'), $request->input('date_to'));
        return $this->ok($result, 'China API preview');
    }

    public function logs(Request $request)
    {
        return $this->ok(PackageSyncLog::latest('synced_at')->paginate((int)$request->input('per_page',20)), 'China sync logs');
    }
}
