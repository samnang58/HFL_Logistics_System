<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $customers = DB::table('customers')
            ->orderBy('id')
            ->get(['id', 'customer_id']);

        if ($customers->isEmpty()) {
            return;
        }

        // Use temporary IDs first so the final IDs can never collide with
        // an already existing HFL00001-style value.
        foreach ($customers as $customer) {
            DB::table('customers')
                ->where('id', $customer->id)
                ->update(['customer_id' => '__HFL_MIGRATING_' . $customer->id]);
        }

        $references = [
            'packages' => 'customer_id',
            'quotations' => 'customer_id',
            'invoices' => 'customer_id',
            'payments' => 'customer_id',
            'incomes' => 'customer_id',
            'notifications' => 'customer_id',
            'deliveries' => 'customer_id',
        ];

        foreach ($customers as $index => $customer) {
            $oldTemporary = '__HFL_MIGRATING_' . $customer->id;
            $newId = 'HFL' . str_pad((string) ($index + 1), 5, '0', STR_PAD_LEFT);

            DB::table('customers')
                ->where('id', $customer->id)
                ->update(['customer_id' => $newId]);

            foreach ($references as $table => $column) {
                if (!Schema::hasTable($table) || !Schema::hasColumn($table, $column)) {
                    continue;
                }

                DB::table($table)
                    ->where($column, $oldTemporary)
                    ->update([$column => $newId]);
            }
        }

        if (!Schema::hasIndex('customers', 'customers_customer_id_unique')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->unique('customer_id', 'customers_customer_id_unique');
            });
        }
    }

    public function down(): void
    {
        // Do not automatically revert customer IDs because other business
        // records may have been created with the new public IDs.
    }
};
