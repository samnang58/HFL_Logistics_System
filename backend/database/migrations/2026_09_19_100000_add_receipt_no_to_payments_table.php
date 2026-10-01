<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('receipt_no')->nullable()->unique()->after('payment_no');
        });
    }
    public function down(): void {
        Schema::table('payments', function (Blueprint $table) { $table->dropUnique(['receipt_no']); $table->dropColumn('receipt_no'); });
    }
};
