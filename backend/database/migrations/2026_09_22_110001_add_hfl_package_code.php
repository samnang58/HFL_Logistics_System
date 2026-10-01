<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('packages', 'hfl_package_code')) {
            Schema::table('packages', function (Blueprint $table) {
                $table->string('hfl_package_code')->nullable()->unique()->after('tracking_number');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('packages', 'hfl_package_code')) {
            Schema::table('packages', function (Blueprint $table) {
                $table->dropUnique(['hfl_package_code']);
                $table->dropColumn('hfl_package_code');
            });
        }
    }
};
