<?php

namespace App\Console\Commands;

use App\Models\Container;
use App\Models\Customer;
use App\Models\Package;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanChinaMockData extends Command
{
    protected $signature = 'china:mock-clean {--force : Do not ask for confirmation}';

    protected $description = 'Delete the packages / containers / customers created by the FAKE China API (YCFAKE*, YCLFAKE*).';

    public function handle(): int
    {
        if (app()->environment('production')) {
            $this->error('Refusing to run in production.');
            return self::FAILURE;
        }

        $packages = Package::where('china_waybill_number', 'like', 'YCFAKE%')->get();
        $containers = Container::where('container_number', 'like', 'YCLFAKE%')->get();
        $customers = Customer::where('full_name', 'like', 'Fake Customer %')
            ->where('customer_id', 'like', 'HFL001%')
            ->get();

        $this->line("Packages: {$packages->count()}, containers: {$containers->count()}, customers: {$customers->count()}");

        if ($packages->isEmpty() && $containers->isEmpty() && $customers->isEmpty()) {
            $this->info('Nothing to clean.');
            return self::SUCCESS;
        }

        if (!$this->option('force') && !$this->confirm('Delete these fake records?')) {
            return self::SUCCESS;
        }

        DB::transaction(function () use ($packages, $containers, $customers) {
            $packageIds = $packages->pluck('id')->all();

            if ($packageIds) {
                DB::table('container_packages')->whereIn('package_id', $packageIds)->delete();
                DB::table('tracking_events')->whereIn('package_id', $packageIds)->delete();
            }

            foreach ($containers as $container) {
                DB::table('container_packages')->where('container_id', $container->id)->delete();
                DB::table('container_tracking_events')->where('container_id', $container->id)->delete();
                $container->delete();
            }

            Package::whereIn('id', $packageIds)->delete();

            // Only remove fake customers that no longer own any package.
            foreach ($customers as $customer) {
                if (!Package::where('customer_id', $customer->customer_id)->exists()) {
                    $customer->delete();
                }
            }
        });

        $this->info('Fake China data removed.');
        return self::SUCCESS;
    }
}
