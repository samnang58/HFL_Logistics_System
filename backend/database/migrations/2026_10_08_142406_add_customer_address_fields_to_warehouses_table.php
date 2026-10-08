<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warehouses', function (Blueprint $table) {
            $table->string('contact_name')->nullable()->after('address');
            $table->string('phone')->nullable()->after('contact_name');
            $table->text('receiving_requirement')->nullable()->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('warehouses', function (Blueprint $table) {
            $table->dropColumn([
                'contact_name',
                'phone',
                'receiving_requirement',
            ]);
        });
    }
};
