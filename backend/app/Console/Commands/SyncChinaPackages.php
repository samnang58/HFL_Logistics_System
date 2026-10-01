<?php
namespace App\Console\Commands;
use App\Http\Controllers\PackageController;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
class SyncChinaPackages extends Command
{
    protected $signature='china:sync {--container= : Optional InsideNO/container filter}';
    protected $description='Synchronize China waybills into HFL packages and containers';
    public function handle(PackageController $controller): int
    {
        $request=Request::create('/api/v1/packages/sync-china','POST',array_filter(['inside_no'=>$this->option('container')]));
        $response=$controller->syncChina($request);
        $payload=json_decode($response->getContent(),true) ?: [];
        $this->line($payload['message'] ?? 'China sync completed.');
        if(isset($payload['data'])) $this->line(json_encode($payload['data'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));
        return $response->getStatusCode() < 300 ? self::SUCCESS : self::FAILURE;
    }
}
