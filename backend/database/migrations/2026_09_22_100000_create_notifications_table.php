<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('notifications', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('customer_id')->nullable()->index();
            $t->foreignId('package_id')->nullable()->constrained('packages')->nullOnDelete();
            $t->string('type')->default('tracking');
            $t->string('title');
            $t->text('message');
            $t->timestamp('read_at')->nullable();
            $t->timestamps();
            $t->index(['customer_id','read_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('notifications'); }
};
