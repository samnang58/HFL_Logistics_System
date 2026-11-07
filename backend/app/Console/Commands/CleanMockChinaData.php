<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanMockChinaData extends Command
{
    protected $signature = 'mock:clean-china {--execute : Delete the verified mock rows}';

    protected $description = 'Preview or delete only the known mock China API records from hfl_logistics_clean';

    public function handle(): int
    {
        if (DB::connection()->getDatabaseName() !== 'hfl_logistics_clean') {
            $this->error('Stopped: Laravel is not connected to hfl_logistics_clean.');
            return self::FAILURE;
        }

        $shipmentNumbers = array_map(
            fn (int $n) => sprintf('HFL-SHP-%05d', $n),
            range(1, 5)
        );

        $expected = [
            'packages' => 50,
            'containers' => 5,
            'customers' => 10,
            'shipments' => 5,
            'tracking_events' => 100,
            'container_tracking_events' => 15,
            'package_sync_logs' => 2,
        ];

        $mockCounts = [
            'packages' => DB::table('packages')->where('code', 'like', 'MOCK-%')->count(),
            'containers' => DB::table('containers')->where('notes', 'MOCK API TEST CONTAINER')->count(),
            'customers' => DB::table('customers')->where('full_name', 'like', 'Mock Customer %')->count(),
            'shipments' => DB::table('shipments')->whereIn('shipment_number', $shipmentNumbers)->count(),
            'tracking_events' => DB::table('tracking_events')->where('staff_name', 'Mock China API')->count(),
            'container_tracking_events' => DB::table('container_tracking_events')->where('remarks', 'Mock China API event')->count(),
            'package_sync_logs' => DB::table('package_sync_logs')->where('source', 'mock_china_api')->count(),
        ];

        $rows = [];
        $safe = true;
        foreach ($expected as $table => $count) {
            $total = DB::table($table)->count();
            $matched = $mockCounts[$table];
            $rows[] = [$table, $total, $matched, $count];
            if ($total !== $count || $matched !== $count) {
                $safe = false;
            }
        }
        $this->table(['Table', 'Total', 'Marked mock', 'Expected'], $rows);

        $packageIds = DB::table('packages')->where('code', 'like', 'MOCK-%')->pluck('id')->all();
        $containerIds = DB::table('containers')->where('notes', 'MOCK API TEST CONTAINER')->pluck('id')->all();
        $shipmentIds = DB::table('shipments')->whereIn('shipment_number', $shipmentNumbers)->pluck('id')->all();

        $blockedDependencies = [
            'deliveries' => DB::table('deliveries')->whereIn('package_id', $packageIds)->count(),
            'notifications' => DB::table('notifications')->whereIn('package_id', $packageIds)->count(),
            'shipment_tracking_events' => DB::table('shipment_tracking_events')->whereIn('shipment_id', $shipmentIds)->count(),
        ];
        foreach ($blockedDependencies as $table => $count) {
            if ($count > 0) {
                $safe = false;
                $this->warn("Stopped: {$table} contains {$count} linked records requiring manual review.");
            }
        }
        $pivotCount = DB::table('container_packages')->count();
        $pivotMatches = DB::table('container_packages')->whereIn('package_id', $packageIds)->whereIn('container_id', $containerIds)->count();
        if ($pivotCount !== 50 || $pivotMatches !== 50) {
            $safe = false;
            $this->warn("Stopped: unexpected container_packages links ({$pivotMatches}/{$pivotCount}).");
        }

        if (!$safe) {
            $this->error('Safety check failed. No data has been deleted.');
            return self::FAILURE;
        }

        if (!$this->option('execute')) {
            $this->info('DRY RUN PASSED. No records were deleted.');
            $this->line('After verifying your backup restore, run: php artisan mock:clean-china --execute');
            return self::SUCCESS;
        }

        if ($this->ask('Type DELETE MOCK DATA to confirm') !== 'DELETE MOCK DATA') {
            $this->warn('Cancelled. No records were deleted.');
            return self::FAILURE;
        }

        DB::transaction(function () use ($packageIds, $containerIds, $shipmentIds): void {
            DB::table('container_packages')->whereIn('package_id', $packageIds)->delete();
            DB::table('container_tracking_events')->whereIn('container_id', $containerIds)->delete();
            DB::table('tracking_events')->whereIn('package_id', $packageIds)->delete();
            DB::table('package_sync_logs')->where('source', 'mock_china_api')->delete();
            DB::table('packages')->whereIn('id', $packageIds)->delete();
            DB::table('containers')->whereIn('id', $containerIds)->delete();
            DB::table('shipments')->whereIn('id', $shipmentIds)->delete();
            DB::table('customers')->where('full_name', 'like', 'Mock Customer %')->delete();
        });

        $this->info('Mock data deleted. Users and database schema were not modified.');
        return self::SUCCESS;
    }
}
