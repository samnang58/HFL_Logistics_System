<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(){
        Schema::table('packages', function(Blueprint $t){
            if(!Schema::hasColumn('packages','china_waybill_number')) $t->string('china_waybill_number')->nullable()->index();
            if(!Schema::hasColumn('packages','china_container_number')) $t->string('china_container_number')->nullable()->index();
        });
        Schema::table('package_sync_logs', function(Blueprint $t){
            if(!Schema::hasColumn('package_sync_logs','containers_created')) $t->integer('containers_created')->default(0);
            if(!Schema::hasColumn('package_sync_logs','packages_attached')) $t->integer('packages_attached')->default(0);
        });
    }
    public function down(){
        Schema::table('packages', function(Blueprint $t){
            foreach(['china_waybill_number','china_container_number'] as $c) if(Schema::hasColumn('packages',$c)) $t->dropColumn($c);
        });
        Schema::table('package_sync_logs', function(Blueprint $t){
            foreach(['containers_created','packages_attached'] as $c) if(Schema::hasColumn('package_sync_logs',$c)) $t->dropColumn($c);
        });
    }
};
