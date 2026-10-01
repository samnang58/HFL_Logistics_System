<?php

namespace App\Console\Commands;

use App\Models\Package;
use Illuminate\Console\Command;

class MockProductImages extends Command
{
    protected $signature = 'china:mock-images';

    protected $description = 'Give the existing MOCK packages (waybill 777777777xxx) fake product photos WITHOUT changing their status or billing.';

    public function handle(): int
    {
        if (app()->environment('production')) {
            $this->error('Refusing to run in production.');
            return self::FAILURE;
        }

        $host = rtrim((string) config('app.url', 'http://127.0.0.1:8000'), '/') . '/api/v1/mock-china/image/';
        $count = 0;

        Package::where('china_waybill_number', 'like', '777777777%')->each(function (Package $package) use ($host, &$count) {
            $i = (int) substr((string) $package->china_waybill_number, -3);
            if ($i < 1) {
                return;
            }

            $package->product_images = $i % 2 === 0
                ? [$host . $i . '.svg', $host . ($i + 1) . '.svg']
                : [$host . $i . '.svg'];
            $package->save();
            $count++;
        });

        $this->info("Fake photos added to {$count} mock package(s). Image host: {$host}");
        return self::SUCCESS;
    }
}
