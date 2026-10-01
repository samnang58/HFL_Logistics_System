<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('expenses', 'delivery_id')) {
            Schema::table('expenses', function (Blueprint $table) {
                // Links a delivery cost (Tuk Tuk, VET, Grab, rental van...) to one delivery.
                $table->unsignedBigInteger('delivery_id')->nullable()->after('package_id')->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('expenses', 'delivery_id')) {
            Schema::table('expenses', function (Blueprint $table) {
                $table->dropColumn('delivery_id');
            });
        }
    }
};
