<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('packages') || !Schema::hasTable('containers') || !Schema::hasTable('container_packages')) {
            return;
        }

        // Repair imported/mock records where the China container number exists on
        // packages.china_container_number but the many-to-many pivot row is missing.
        if (Schema::hasColumn('packages', 'china_container_number')) {
            DB::table('packages')
                ->whereNotNull('china_container_number')
                ->where('china_container_number', '!=', '')
                ->orderBy('id')
                ->chunkById(500, function ($packages) {
                    foreach ($packages as $package) {
                        $container = DB::table('containers')
                            ->where('container_number', $package->china_container_number)
                            ->first();

                        if (!$container) {
                            continue;
                        }

                        $exists = DB::table('container_packages')
                            ->where('container_id', $container->id)
                            ->where('package_id', $package->id)
                            ->exists();

                        if (!$exists) {
                            DB::table('container_packages')->insert([
                                'container_id' => $container->id,
                                'package_id' => $package->id,
                                'loaded_at' => $package->received_at ?? now(),
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }
                    }
                });
        }

        // Packages already beyond China receiving must have an HFL tracking number.
        // The original China delivery number remains in china_waybill_number.
        if (Schema::hasColumn('packages', 'tracking_number')) {
            DB::table('packages')
                ->where(function ($q) {
                    $q->whereNull('tracking_number')->orWhere('tracking_number', '');
                })
                ->whereIn('status', [
                    'Received at China Warehouse',
                    'Waiting Shipment',
                    'Loading',
                    'Departed China',
                    'In Transit',
                    'Arrived Cambodia',
                    'Received Cambodia',
                    'Ready for Delivery',
                    'Out for Delivery',
                    'Delivered',
                ])
                ->orderBy('id')
                ->chunkById(500, function ($packages) {
                    foreach ($packages as $package) {
                        $number = 100200299 + (int) $package->id;
                        do {
                            $tracking = 'YC' . str_pad((string) $number, 9, '0', STR_PAD_LEFT);
                            $number++;
                        } while (DB::table('packages')->where('tracking_number', $tracking)->exists());

                        DB::table('packages')
                            ->where('id', $package->id)
                            ->update([
                                'tracking_number' => $tracking,
                                'updated_at' => now(),
                            ]);

                        if (Schema::hasTable('tracking_events') && Schema::hasColumn('tracking_events', 'tracking_number')) {
                            DB::table('tracking_events')
                                ->where('package_id', $package->id)
                                ->update(['tracking_number' => $tracking]);
                        }
                    }
                });
        }
    }

    public function down(): void
    {
        // Intentionally non-destructive: this repair migration must not remove
        // valid container/package relationships or HFL tracking identifiers.
    }
};
