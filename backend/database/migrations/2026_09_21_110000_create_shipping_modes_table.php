<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('shipping_modes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->enum('unit', ['CBM','KG'])->default('CBM');
            $table->enum('status', ['Active','Inactive'])->default('Active');
            $table->timestamps();
            $table->index(['status','code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_modes');
    }
};
