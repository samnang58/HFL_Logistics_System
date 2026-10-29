<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Cash Accounts
        Schema::create('cash_accounts', function (Blueprint $table) {
            $table->id();

            $table->string('name', 150);
            $table->string('account_type', 30);
            $table->string('currency', 3)->default('USD');

            $table->decimal('opening_balance', 15, 4)->default(0);

            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index(['account_type', 'currency']);
        });

        // 2. Cash Transactions
        Schema::create('cash_transactions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('cash_account_id')
                ->constrained('cash_accounts')
                ->restrictOnDelete();

            $table->string('transaction_type', 30);
            $table->decimal('amount', 15, 4);

            $table->string('currency', 3)->default('USD');
            $table->dateTime('transaction_at');

            $table->string('description', 1000)->nullable();

            $table->string('reference_type', 50)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();

            $table->string('transfer_group', 100)->nullable();
            $table->string('idempotency_key', 100)->nullable()->unique();

            $table->unsignedBigInteger('created_by')->nullable();

            $table->timestamps();

            $table->index(['cash_account_id', 'transaction_at']);
            $table->unique(
                ['reference_type', 'reference_id'],
                'cash_transactions_reference_unique'
            );
            $table->index('transfer_group');
        });

        // 3. Cash Advances
        Schema::create('cash_advances', function (Blueprint $table) {
            $table->id();

            $table->foreignId('cash_account_id')
                ->constrained('cash_accounts')
                ->restrictOnDelete();

           $table->foreignId('staff_id')
                ->constrained('users')
                ->restrictOnDelete();

            $table->decimal('amount', 15, 4);
            $table->string('currency', 3)->default('USD');

            $table->date('advanced_at');
            $table->string('purpose', 1000);

            $table->string('status', 30)->default('Open');

            $table->unsignedBigInteger('created_by')->nullable();

            $table->timestamps();

            $table->index(['staff_id', 'status']);
            $table->index('advanced_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_advances');
        Schema::dropIfExists('cash_transactions');
        Schema::dropIfExists('cash_accounts');
    }
};