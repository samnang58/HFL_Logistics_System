<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('containers', function (Blueprint $table) {
            $table->foreignId('shipment_id')
                ->nullable()
                ->after('id')
                ->constrained('shipments')
                ->nullOnDelete();

            $table->index('shipment_id');
        });
    }

    public function down(): void
    {
        Schema::table('containers', function (Blueprint $table) {
            $table->dropForeign([
                'shipment_id',
            ]);

            $table->dropIndex([
                'shipment_id',
            ]);

            $table->dropColumn('shipment_id');
        });
    }
};
