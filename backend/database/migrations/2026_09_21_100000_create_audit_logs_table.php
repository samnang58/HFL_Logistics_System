<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up(){
  Schema::create('audit_logs', function(Blueprint $t){
   $t->id();
   $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
   $t->string('user_name')->nullable();
   $t->string('action',50);
   $t->string('method',10);
   $t->string('route')->nullable();
   $t->string('entity_type')->nullable();
   $t->string('entity_id')->nullable();
   $t->string('status',30)->default('success');
   $t->unsignedSmallInteger('response_code')->nullable();
   $t->string('ip_address',45)->nullable();
   $t->text('user_agent')->nullable();
   $t->json('metadata')->nullable();
   $t->timestamps();
   $t->index(['entity_type','entity_id']);
   $t->index(['action','created_at']);
   $t->index(['user_id','created_at']);
  });
 }
 public function down(){Schema::dropIfExists('audit_logs');}
};
