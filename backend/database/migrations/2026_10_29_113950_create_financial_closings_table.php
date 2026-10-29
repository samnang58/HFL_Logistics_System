<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_closings', function (Blueprint $table) {
            $table->id();

            $table->string('period_type', 20);
            $table->date('period_start');
            $table->date('period_end');

            $table->string('currency', 3)->default('USD');

            $table->decimal('total_income', 15, 4)->default(0);
            $table->decimal('total_expense', 15, 4)->default(0);
            $table->decimal('closing_balance', 15, 4)->default(0);

            $table->string('status', 20)->default('Closed');

            $table->unsignedBigInteger('closed_by');
            $table->dateTime('closed_at');

            $table->unsignedBigInteger('reopened_by')->nullable();
            $table->dateTime('reopened_at')->nullable();
            $table->text('reopen_reason')->nullable();

            $table->timestamps();

           $table->unique(
    ['period_type', 'period_start', 'period_end', 'currency'],
    'financial_closings_period_currency_unique'
);
            $table->index(['status', 'currency']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_closings');
    }
};