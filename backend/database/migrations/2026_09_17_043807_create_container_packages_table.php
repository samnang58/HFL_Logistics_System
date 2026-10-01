<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('container_packages', function (Blueprint $table) {
            $table->id();

            $table->foreignId('container_id')
                ->constrained('containers')
                ->cascadeOnDelete();

            $table->foreignId('package_id')
                ->constrained('packages')
                ->cascadeOnDelete();

            $table->timestamp('loaded_at')->nullable();
            $table->timestamp('unloaded_at')->nullable();

            $table->timestamps();

            $table->unique([
                'container_id',
                'package_id',
            ]);

            $table->index('package_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('container_packages');
    }
};
