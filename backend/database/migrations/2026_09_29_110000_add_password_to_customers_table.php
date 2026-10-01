<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('customers', 'password')) {
            Schema::table('customers', function (Blueprint $table) {
                // Hashed password the customer uses (with username) to sign in to the customer app.
                $table->string('password')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('customers', 'password')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->dropColumn('password');
            });
        }
    }
};
