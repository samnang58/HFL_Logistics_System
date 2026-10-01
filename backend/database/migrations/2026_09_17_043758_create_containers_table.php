<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('containers', function (Blueprint $table) {
            $table->id();

            // Container identity
            $table->string('container_number')->unique();
            $table->string('container_type')->nullable();
            $table->string('seal_number')->nullable();

            // Logistics
            $table->string('shipping_mode')->nullable();
            $table->string('origin')->nullable();
            $table->string('destination')->nullable();

            // Current movement
            $table->string('current_location')->nullable();
            $table->string('status')->default('Pending');

            // Dates
            $table->date('departure_date')->nullable();
            $table->date('estimated_arrival')->nullable();
            $table->date('actual_arrival')->nullable();

            // Additional information
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('status');
            $table->index('current_location');
            $table->index('shipping_mode');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('containers');
    }
};
