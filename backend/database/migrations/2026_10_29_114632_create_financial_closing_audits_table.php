<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_closing_audits', function (Blueprint $table) {
            $table->id();

            $table->foreignId('financial_closing_id')
                ->constrained('financial_closings')
                ->restrictOnDelete();

            $table->string('action', 30);

            $table->unsignedBigInteger('performed_by');
            $table->dateTime('performed_at');

            $table->text('reason')->nullable();

            $table->string('previous_status', 20)->nullable();
            $table->string('new_status', 20);

            $table->json('details')->nullable();

            $table->timestamps();

            $table->index(['financial_closing_id', 'performed_at']);
            $table->index(['action', 'performed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_closing_audits');
    }
};