<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('packages', 'product_images')) {
            Schema::table('packages', function (Blueprint $table) {
                // List of image URLs received from the China API.
                $table->json('product_images')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('packages', 'product_images')) {
            Schema::table('packages', function (Blueprint $table) {
                $table->dropColumn('product_images');
            });
        }
    }
};
