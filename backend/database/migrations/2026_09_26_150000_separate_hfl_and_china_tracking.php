<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The business rule is:
        // tracking_number = HFL tracking created at China warehouse receipt.
        // china_waybill_number = original China delivery/courier tracking.
        // Existing mock/legacy records used tracking_number for the China number,
        // so preserve that value in china_waybill_number before clearing it.
        if (Schema::hasTable('packages')) {
            DB::table('packages')
                ->whereNull('china_waybill_number')
                ->whereNotNull('tracking_number')
                ->update(['china_waybill_number' => DB::raw('tracking_number')]);

            // HFL tracking uses the YC prefix. Any legacy tracking value that
            // does not use that prefix is treated as the original China delivery
            // number and cleared from the HFL tracking field.
            DB::table('packages')
                ->whereNotNull('tracking_number')
                ->where('tracking_number', 'not like', 'YC%')
                ->update(['tracking_number' => null]);
        }
    }

    public function down(): void
    {
        // Intentionally non-destructive: restoring old identifier semantics could
        // overwrite legitimate HFL tracking numbers.
    }
};
