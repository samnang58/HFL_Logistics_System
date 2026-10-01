<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('packages', function (Blueprint $table) {
            $table->string('received_by')->nullable()->after('received_at');
            $table->string('received_phone')->nullable()->after('received_by');
            $table->string('received_relation')->nullable()->after('received_phone');
            $table->text('delivery_remark')->nullable()->after('received_relation');
        });
    }

    public function down(): void
    {
        Schema::table('packages', function (Blueprint $table) {
            $table->dropColumn([
                'received_by',
                'received_phone',
                'received_relation',
                'delivery_remark',
            ]);
        });
    }
};
