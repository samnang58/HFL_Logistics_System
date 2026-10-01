<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('packages', 'custom_images')) {
            Schema::table('packages', function (Blueprint $table) {
                // Photos uploaded by staff (kept separate so China sync never overwrites them).
                $table->json('custom_images')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('packages', 'custom_images')) {
            Schema::table('packages', function (Blueprint $table) {
                $table->dropColumn('custom_images');
            });
        }
    }
};
