<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('customers', 'sales_owner_id')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->foreignId('sales_owner_id')
                    ->nullable()
                    ->after('sales_owner')
                    ->constrained('users')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropForeign(['sales_owner_id']);
            $table->dropColumn('sales_owner_id');
        });
    }
};
