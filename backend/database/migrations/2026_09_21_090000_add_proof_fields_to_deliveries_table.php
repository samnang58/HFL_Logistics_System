<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->string('proof_type')->nullable()->after('notes');
            $table->text('proof_url')->nullable()->after('proof_type');
            $table->text('proof_note')->nullable()->after('proof_url');
            $table->text('failure_reason')->nullable()->after('proof_note');
        });
    }
    public function down(): void {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn(['proof_type','proof_url','proof_note','failure_reason']);
        });
    }
};
