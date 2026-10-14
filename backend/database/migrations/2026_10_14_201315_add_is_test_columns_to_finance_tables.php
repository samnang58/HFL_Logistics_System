
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['quotations', 'invoices', 'payments', 'incomes'] as $tableName) {
            if (
                Schema::hasTable($tableName)
                && !Schema::hasColumn($tableName, 'is_test')
            ) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->boolean('is_test')->default(false)->index();
                });
            }
        }
    }

    public function down(): void
    {
        foreach (['quotations', 'invoices', 'payments', 'incomes'] as $tableName) {
            if (
                Schema::hasTable($tableName)
                && Schema::hasColumn($tableName, 'is_test')
            ) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropIndex(
                        $table->getTable() . '_is_test_index'
                    );
                    $table->dropColumn('is_test');
                });
            }
        }
    }
};

