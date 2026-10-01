<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function replaceCustomerReferences(string $from, string $to): void
    {
        foreach ([
            'packages' => 'customer_id',
            'quotations' => 'customer_id',
            'invoices' => 'customer_id',
            'payments' => 'customer_id',
            'incomes' => 'customer_id',
            'notifications' => 'customer_id',
            'deliveries' => 'customer_id',
        ] as $table => $column) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, $column)) {
                DB::table($table)->where($column, $from)->update([$column => $to]);
            }
        }
    }

    public function up(): void
    {
        // Legacy mock customers: HFL-MOCK-CUS-001 -> HFL00001, etc.
        for ($i = 1; $i <= 10; $i++) {
            $legacy = 'HFL-MOCK-CUS-' . str_pad((string) $i, 3, '0', STR_PAD_LEFT);
            $standard = 'HFL' . str_pad((string) $i, 5, '0', STR_PAD_LEFT);

            $legacyCustomer = DB::table('customers')->where('customer_id', $legacy)->first();
            $standardCustomer = DB::table('customers')->where('customer_id', $standard)->first();

            if ($legacyCustomer && !$standardCustomer) {
                DB::table('customers')->where('id', $legacyCustomer->id)->update(['customer_id' => $standard, 'username' => $standard]);
            } elseif ($legacyCustomer && $standardCustomer && $legacyCustomer->id !== $standardCustomer->id) {
                $this->replaceCustomerReferences($legacy, $standard);
                DB::table('customers')->where('id', $legacyCustomer->id)->delete();
            }

            if (Schema::hasColumn('customers', 'username')) {
                DB::table('customers')->where('customer_id', $standard)->update(['username' => $standard]);
            }
            $this->replaceCustomerReferences($legacy, $standard);
        }

        // Legacy mock China waybills: CNMOCK0001 -> 777777777001.
        for ($i = 1; $i <= 50; $i++) {
            $legacyTracking = 'CNMOCK' . str_pad((string) $i, 4, '0', STR_PAD_LEFT);
            $standardTracking = '777777777' . str_pad((string) $i, 3, '0', STR_PAD_LEFT);
            $package = DB::table('packages')->where('tracking_number', $legacyTracking)->first();

            if ($package) {
                $update = [
                    'tracking_number' => $standardTracking,
                    'china_waybill_number' => $standardTracking,
                ];

                if (Schema::hasColumn('packages', 'package_id')) {
                    $update['package_id'] = 'PKG-' . str_pad((string) $package->id, 6, '0', STR_PAD_LEFT);
                }

                DB::table('packages')->where('id', $package->id)->update($update);
                if (Schema::hasTable('tracking_events') && Schema::hasColumn('tracking_events', 'tracking_number')) {
                    DB::table('tracking_events')->where('tracking_number', $legacyTracking)->update(['tracking_number' => $standardTracking]);
                }
            }
        }

        // Legacy mock containers: HFLMOCK240001 -> YCL269191.
        for ($i = 1; $i <= 5; $i++) {
            $legacyContainer = 'HFLMOCK240' . str_pad((string) $i, 3, '0', STR_PAD_LEFT);
            $standardContainer = 'YCL' . str_pad((string) (269190 + $i), 6, '0', STR_PAD_LEFT);
            if (Schema::hasTable('containers')) {
                DB::table('containers')->where('container_number', $legacyContainer)->update(['container_number' => $standardContainer]);
            }
            if (Schema::hasTable('packages')) {
                $updates = ['china_container_number' => $standardContainer];
                if (Schema::hasColumn('packages', 'china_container_number')) {
                    DB::table('packages')->where('china_container_number', $legacyContainer)->update($updates);
                }
            }
        }

        // Legacy mock shipments: HFL-MOCK-SHP-001 -> HFL-SHP-00001.
        for ($i = 1; $i <= 5; $i++) {
            $legacyShipment = 'HFL-MOCK-SHP-' . str_pad((string) $i, 3, '0', STR_PAD_LEFT);
            $standardShipment = 'HFL-SHP-' . str_pad((string) $i, 5, '0', STR_PAD_LEFT);
            if (Schema::hasTable('shipments')) {
                DB::table('shipments')->where('shipment_number', $legacyShipment)->update(['shipment_number' => $standardShipment]);
                $legacyContainer = 'HFLMOCK240' . str_pad((string) $i, 3, '0', STR_PAD_LEFT);
                $standardContainer = 'YCL' . str_pad((string) (269190 + $i), 6, '0', STR_PAD_LEFT);
                if (Schema::hasColumn('shipments', 'container_number')) {
                    DB::table('shipments')->where('shipment_number', $standardShipment)->where('container_number', $legacyContainer)->update(['container_number' => $standardContainer]);
                }
            }
        }
    }

    public function down(): void
    {
        // Business identifiers are intentionally not reverted.
    }
};
