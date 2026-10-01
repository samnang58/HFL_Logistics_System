<?php
use Illuminate\Database\Migrations\Migration; use Illuminate\Database\Schema\Blueprint; use Illuminate\Support\Facades\Schema;
return new class extends Migration { public function up(){
 Schema::create('customers',fn(Blueprint $t)=>$this->common($t,['customer_id','username','full_name','company_name','phone','telegram','email','address','province','customer_group','sales_owner','registration_date','status','notes']));
 Schema::create('packages',fn(Blueprint $t)=>$this->common($t,['package_id','code','tracking_number','customer_id','customer_name','supplier','product_name','product_category','quantity','shipping_mode','from_warehouse','to_warehouse','status','shipping_date','eta','boxes','total_cbm','total_weight','box_count','pricing_id','pricing_rate_type','shipping_rate','shipping_cost','delivery_fee','handling_fee','warehouse_fee','other_fee','discount','grand_total','warehouse_location','delivery_driver_id','received_at']));
 Schema::create('shipments',fn(Blueprint $t)=>$this->common($t,['shipment_number','origin','destination','shipping_mode','container_number','vehicle_number','departure_date','eta','actual_arrival','status','package_ids','package_count','total_cbm','total_weight']));
 Schema::create('pricings',fn(Blueprint $t)=>$this->common($t,['pricing_id','rate_name','shipping_mode','origin','destination','rate_type','rate','currency','minimum_cbm','effective_date','expiry_date','status']));
 Schema::create('warehouses',fn(Blueprint $t)=>$this->common($t,['code','name','country','address','status']));
 Schema::create('tracking_events',fn(Blueprint $t)=>$this->common($t,['tracking_number','package_id','status','location','warehouse','staff_name','note','photo','event_at']));
 Schema::create('quotations',fn(Blueprint $t)=>$this->common($t,['quotation_no','customer_id','customer_name','status','items','subtotal','discount','tax','grand_total','valid_until']));
 Schema::create('invoices',fn(Blueprint $t)=>$this->common($t,['invoice_no','quotation_id','customer_id','customer_name','status','items','subtotal','discount','tax','grand_total','paid_amount','outstanding','due_date']));
 Schema::create('payments',fn(Blueprint $t)=>$this->common($t,['payment_no','invoice_id','customer_id','amount','method','reference','status','paid_at','idempotency_key']));
 Schema::create('incomes',fn(Blueprint $t)=>$this->common($t,['income_no','payment_id','customer_id','invoice_id','amount','category','description','received_at']));
 Schema::create('expenses',fn(Blueprint $t)=>$this->common($t,['expense_no','category','description','amount','currency','expense_date','status','reference']));
 Schema::create('leads',fn(Blueprint $t)=>$this->common($t,['lead_no','name','company_name','phone','email','source','status','owner','notes']));
 }
 private function common(Blueprint $t,array $cols){$t->id(); foreach($cols as $c){$type=in_array($c,['boxes','items','package_ids'])?'json':(in_array($c,['quantity','box_count'])?'integer':(in_array($c,['total_cbm','total_weight','shipping_rate','shipping_cost','delivery_fee','handling_fee','warehouse_fee','other_fee','discount','grand_total','subtotal','tax','paid_amount','outstanding','rate','minimum_cbm','amount'])?'decimal':'string')); if($type==='json')$t->json($c)->nullable();elseif($type==='integer')$t->integer($c)->default(0);elseif($type==='decimal')$t->decimal($c,15,4)->default(0);else $t->string($c)->nullable();} $t->timestamps(); $indexColumns = array_values(
    array_intersect(
        ['customer_id', 'tracking_number', 'status'],
        $cols
    )
);

if (count($indexColumns) > 0) {
    $t->index($indexColumns);
}}
 public function down(){foreach(['leads','expenses','incomes','payments','invoices','quotations','tracking_events','warehouses','pricings','shipments','packages','customers'] as $x)Schema::dropIfExists($x);}};

