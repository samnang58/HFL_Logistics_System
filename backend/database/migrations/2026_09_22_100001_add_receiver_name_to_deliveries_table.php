<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void { Schema::table('deliveries', function (Blueprint $t) { $t->string('receiver_name')->nullable()->after('proof_note'); }); }
    public function down(): void { Schema::table('deliveries', function (Blueprint $t) { $t->dropColumn('receiver_name'); }); }
};
