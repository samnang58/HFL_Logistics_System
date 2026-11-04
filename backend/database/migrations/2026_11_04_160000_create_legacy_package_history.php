<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('legacy_package_history', function (Blueprint $t) {
            $t->id();

            $t->string('source_history_id', 255)->unique();
            $t->string('legacy_package_id', 255)->index();

            // Null for the 20 unmatched historical records.
            $t->unsignedBigInteger('legacy_package_row_id')
                ->nullable()->index();

            $t->dateTime('event_at')->index();
            $t->string('status', 255);

            $t->boolean('is_return')->default(false);
            $t->dateTime('return_at')->nullable();

            // Original Created On format is not yet identified.
            $t->text('created_on_raw')->nullable();

            $t->string('created_by')->nullable();

            // Preserve all source CSV fields.
            $t->longText('source_payload');

            $t->timestamps();

            $t->foreign('legacy_package_row_id')
                ->references('id')
                ->on('legacy_packages')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        throw new RuntimeException(
            'Manual review required before deleting historical records.'
        );
    }
};
