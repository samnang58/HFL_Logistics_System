<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('container_tracking_events', function (Blueprint $table) {
            $table->id();

            $table->foreignId('container_id')
                ->constrained('containers')
                ->cascadeOnDelete();

            $table->string('location');
            $table->string('status');
            $table->timestamp('event_date');

            $table->text('remarks')->nullable();

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index([
                'container_id',
                'event_date',
            ]);

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('container_tracking_events');
    }
};
