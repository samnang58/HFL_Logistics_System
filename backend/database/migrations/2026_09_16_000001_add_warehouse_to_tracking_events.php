<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (!Schema::hasColumn('tracking_events', 'warehouse')) {
            Schema::table('tracking_events', function (Blueprint $table) {
                $table->string('warehouse')->nullable()->after('location');
            });
        }
    }
    public function down(): void {
        if (Schema::hasColumn('tracking_events', 'warehouse')) {
            Schema::table('tracking_events', function (Blueprint $table) {
                $table->dropColumn('warehouse');
            });
        }
    }
};
