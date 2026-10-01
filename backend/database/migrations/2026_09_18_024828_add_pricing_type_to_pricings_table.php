<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pricings', function (Blueprint $table) {
            $table->string('pricing_type', 10)
                ->default('GC')
                ->after('shipping_mode');

            $table->index('pricing_type');
        });
    }

    public function down(): void
    {
        Schema::table('pricings', function (Blueprint $table) {
            $table->dropIndex(['pricing_type']);
            $table->dropColumn('pricing_type');
        });
    }
};
