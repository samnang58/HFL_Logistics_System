<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->string('expense_type')->default('Operating')->after('category');
            $table->string('vendor')->nullable()->after('description');
            $table->string('payment_method')->nullable()->after('currency');
            $table->string('payment_reference')->nullable()->after('payment_method');
            $table->dateTime('paid_at')->nullable()->after('expense_date');
            $table->unsignedBigInteger('shipment_id')->nullable()->after('paid_at');
            $table->unsignedBigInteger('container_id')->nullable()->after('shipment_id');
            $table->unsignedBigInteger('package_id')->nullable()->after('container_id');
            $table->unsignedBigInteger('created_by')->nullable()->after('reference');
            $table->text('notes')->nullable()->after('created_by');

            $table->index(['expense_type', 'expense_date']);
            $table->index(['status', 'expense_date']);
            $table->index(['shipment_id', 'container_id', 'package_id']);
            $table->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropIndex(['expense_type', 'expense_date']);
            $table->dropIndex(['status', 'expense_date']);
            $table->dropIndex(['shipment_id', 'container_id', 'package_id']);
            $table->dropIndex(['created_by']);
            $table->dropColumn([
                'expense_type', 'vendor', 'payment_method', 'payment_reference',
                'paid_at', 'shipment_id', 'container_id', 'package_id',
                'created_by', 'notes',
            ]);
        });
    }
};
