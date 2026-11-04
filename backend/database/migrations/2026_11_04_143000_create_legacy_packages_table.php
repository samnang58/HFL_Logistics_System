<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('legacy_packages')) {
            throw new RuntimeException(
                'legacy_packages already exists. Review before migrating.'
            );
        }

        Schema::create('legacy_packages', function (Blueprint $table) {
            $table->id();

            $table->string('legacy_package_id')->unique();
            $table->string('customer_id')->index();
            $table->string('customer_name')->nullable();
            $table->string('source_code')->nullable();

            // Supports all tracking values, including >255 characters.
            $table->longText('tracking_raw')->nullable();

            $table->date('shipping_date')->nullable();
            $table->dateTime('shipping_datetime')->nullable();

            $table->string('shipping_mode', 100);
            $table->string('source_status', 100);

            $table->decimal('weight_kg', 20, 6)->nullable();
            $table->decimal('volume_cbm', 20, 6)->nullable();

            $table->unsignedInteger('item_count')->default(0);

            // Preserve all historical item entries.
            $table->json('items')->nullable();

            // Preserve original ERPNext package information.
            $table->longText('source_payload');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        // Never silently delete imported historical records.
        throw new RuntimeException(
            'Manual review required before dropping legacy_packages.'
        );
    }
};
