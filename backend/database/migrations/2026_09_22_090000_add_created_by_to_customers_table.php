<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('customers', 'created_by')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->foreignId('created_by')->nullable()->after('sales_owner_id')->constrained('users')->nullOnDelete();
                $table->index('created_by');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('customers', 'created_by')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->dropForeign(['created_by']);
                $table->dropIndex(['created_by']);
                $table->dropColumn('created_by');
            });
        }
    }
};
