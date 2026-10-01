<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(){
        Schema::create('package_sync_logs', function(Blueprint $t){
            $t->id();
            $t->string('source')->default('china_api');
            $t->string('status')->default('success');
            $t->integer('received')->default(0);
            $t->integer('created_count')->default(0);
            $t->integer('updated_count')->default(0);
            $t->integer('duplicate_count')->default(0);
            $t->integer('failed_count')->default(0);
            $t->text('message')->nullable();
            $t->json('errors')->nullable();
            $t->timestamp('synced_at')->nullable();
            $t->timestamps();
            $t->index(['source','status']);
        });
    }
    public function down(){ Schema::dropIfExists('package_sync_logs'); }
};
