<?php
namespace App\Http\Controllers;
use App\Models\Customer;
use App\Models\Package;
use App\Models\Shipment;
use App\Models\Invoice;
use App\Models\Income;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\Delivery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class ReportController extends ApiController {
 private function range($q, string $column, Request $r){
  if($r->filled('from')) $q->whereDate($column,'>=',$r->input('from'));
  if($r->filled('to')) $q->whereDate($column,'<=',$r->input('to'));
  return $q;
 }
 /**
  * Money per customer: what the customer invoiced / paid / still owes, the delivery and other
  * costs linked to that customer's packages, and the net (paid - paid costs).
  * With ?customer_id=HFL00001 the invoice / payment / expense lines are returned too (for Excel).
  */
 public function customerFinance(Request $r){
  $only = $r->filled('customer_id') ? (string)$r->input('customer_id') : null;

  $invoices = $this->range(Invoice::query()->where('is_test', false)->whereNotIn('status',['Cancelled','Void','Draft']),'created_at',$r);
  $payments = $this->range(Payment::query()->where('is_test', false)->where('status','Confirmed'),'paid_at',$r);
  $expenses = $this->range(Expense::query()->where('status','!=','Cancelled')->where(function($q){$q->whereNotNull('package_id')->orWhereNotNull('delivery_id');}),'expense_date',$r);
  if($only){ $invoices->where('customer_id',$only); $payments->where('customer_id',$only); }

  $invoices=$invoices->get(['id','invoice_no','customer_id','customer_name','status','grand_total','paid_amount','outstanding','created_at']);
  $payments=$payments->get(['id','payment_no','invoice_id','customer_id','amount','method','reference','paid_at']);
  $expenses=$expenses->get();

  // Which customer does each cost belong to? package -> customer, or delivery -> customer.
  $packageCustomer = Package::whereIn('id',$expenses->pluck('package_id')->filter()->unique())->pluck('customer_id','id');
  $deliveries = Delivery::whereIn('id',$expenses->pluck('delivery_id')->filter()->unique())->get(['id','delivery_number','customer_id','package_id'])->keyBy('id');
  $deliveryPackageCustomer = Package::whereIn('id',$deliveries->pluck('package_id')->filter()->unique())->pluck('customer_id','id');
  $invoiceNo = Invoice::where('is_test', false)->whereIn('id',$payments->pluck('invoice_id')->filter()->unique())->pluck('invoice_no','id');

  $costLines=[]; $unassigned=0.0;
  foreach($expenses as $e){
   $d=$deliveries->get($e->delivery_id);
   $cid = $packageCustomer[$e->package_id] ?? ($d ? ($d->customer_id ?: ($deliveryPackageCustomer[$d->package_id] ?? null)) : null);
   if(!$cid){ if($e->status==='Paid') $unassigned+=(float)$e->amount; continue; }
   $costLines[]=['customer_id'=>$cid,'expense_no'=>$e->expense_no,'category'=>$e->category,'vendor'=>$e->vendor,'amount'=>(float)$e->amount,'status'=>$e->status,'expense_date'=>optional($e->expense_date)->toDateString(),'delivery_number'=>$d->delivery_number ?? null,'reference'=>$e->reference];
  }
  $costLines=collect($costLines);
  if($only) $costLines=$costLines->where('customer_id',$only)->values();

  $ids=collect($invoices->pluck('customer_id'))->merge($payments->pluck('customer_id'))->merge($costLines->pluck('customer_id'))->filter()->unique()->values();
  $names=Customer::whereIn('customer_id',$ids)->pluck('full_name','customer_id');

  $rows=$ids->map(function($cid) use($invoices,$payments,$costLines,$names){
   $invoiced=(float)$invoices->where('customer_id',$cid)->sum('grand_total');
   $paid=(float)$payments->where('customer_id',$cid)->sum('amount');
   $outstanding=(float)$invoices->where('customer_id',$cid)->sum('outstanding');
   $mine=$costLines->where('customer_id',$cid);
   $costPaid=(float)$mine->where('status','Paid')->sum('amount');
   $costPending=(float)$mine->where('status','Pending')->sum('amount');
   return ['customer_id'=>$cid,'customer_name'=>$names[$cid] ?? $cid,'invoices'=>$invoices->where('customer_id',$cid)->count(),
    'invoiced'=>round($invoiced,2),'paid'=>round($paid,2),'outstanding'=>round($outstanding,2),
    'cost_paid'=>round($costPaid,2),'cost_pending'=>round($costPending,2),'net'=>round($paid-$costPaid,2)];
  })->sortByDesc('paid')->values();

  $out=['rows'=>$rows,'totals'=>[
    'invoiced'=>round($rows->sum('invoiced'),2),'paid'=>round($rows->sum('paid'),2),'outstanding'=>round($rows->sum('outstanding'),2),
    'cost_paid'=>round($rows->sum('cost_paid'),2),'cost_pending'=>round($rows->sum('cost_pending'),2),'net'=>round($rows->sum('net'),2),
    'unassigned_cost_paid'=>round($unassigned,2)]];

  if($only){
   $out['customer']=['customer_id'=>$only,'customer_name'=>$names[$only] ?? $only];
   $out['invoices']=$invoices->map(fn($i)=>['invoice_no'=>$i->invoice_no,'status'=>$i->status,'grand_total'=>(float)$i->grand_total,'paid_amount'=>(float)$i->paid_amount,'outstanding'=>(float)$i->outstanding,'date'=>optional($i->created_at)->toDateString()])->values();
   $out['payments']=$payments->map(fn($p)=>['payment_no'=>$p->payment_no,'invoice_no'=>$invoiceNo[$p->invoice_id] ?? null,'amount'=>(float)$p->amount,'method'=>$p->method,'reference'=>$p->reference,'paid_at'=>optional($p->paid_at)->toDateTimeString()])->values();
   $out['expenses']=$costLines;
  }
  return $this->ok($out);
 }

 public function shipments(Request $r){
  $q=$this->range(Shipment::query(),'created_at',$r);
  return $this->ok($q->select('status',DB::raw('count(*) as total'),DB::raw('coalesce(sum(total_cbm),0) as cbm'),DB::raw('coalesce(sum(total_weight),0) as weight'))->groupBy('status')->orderBy('status')->get());
 }
 public function customers(Request $r){
  $q=$this->range(Customer::query(),'created_at',$r);
  return $this->ok($q->select('status',DB::raw('count(*) as total'))->groupBy('status')->orderBy('status')->get());
 }
 public function sales(Request $r){
  $q=$this->range(Invoice::query()->where('is_test', false),'created_at',$r);
  return $this->ok($q->select('status',DB::raw('count(*) as total'),DB::raw('coalesce(sum(grand_total),0) as amount'),DB::raw('coalesce(sum(paid_amount),0) as paid'),DB::raw('coalesce(sum(outstanding),0) as outstanding'))->groupBy('status')->orderBy('status')->get());
 }
 public function finance(Request $r){
  $incomeQ=$this->range(Income::query()->where('is_test', false),'received_at',$r);
  $expenseQ=$this->range(Expense::query(),'expense_date',$r);
  $paymentQ=$this->range(Payment::query()->where('is_test', false),'paid_at',$r);
  $invoiceQ=$this->range(Invoice::query()->where('is_test', false),'created_at',$r);
  $income=(float)(clone $incomeQ)->sum('amount'); $expense=(float)(clone $expenseQ)->where('status','Paid')->sum('amount');
  return $this->ok([
   'income'=>$income,'expense'=>$expense,'net_profit'=>$income-$expense,
   'cash_collected'=>(float)$paymentQ->where('status','Confirmed')->sum('amount'),
   'receivable'=>(float)$invoiceQ->sum('outstanding'),
   'payable'=>(float)$this->range(Expense::query(),'expense_date',$r)->where('status','Pending')->sum('amount'),
   'income_by_category'=>$this->range(Income::query()->where('is_test', false),'received_at',$r)->select('category',DB::raw('sum(amount) as amount'))->groupBy('category')->orderByDesc('amount')->get(),
   'expense_by_category'=>$this->range(Expense::query(),'expense_date',$r)->where('status','Paid')->select('category',DB::raw('sum(amount) as amount'))->groupBy('category')->orderByDesc('amount')->get(),
  ]);
 }
 public function warehouse(Request $r){
  $q=$this->range(Package::query(),'created_at',$r);
  return $this->ok($q->select('status',DB::raw('count(*) as total'),DB::raw('coalesce(sum(total_cbm),0) as cbm'),DB::raw('coalesce(sum(total_weight),0) as weight'))->groupBy('status')->orderBy('status')->get());
 }
 public function deliveries(Request $r){
  $q=$this->range(Delivery::query(),'created_at',$r);
  return $this->ok($q->select('status',DB::raw('count(*) as total'))->groupBy('status')->orderBy('status')->get());
 }
 public function dashboard(Request $r){
  $f=$this->finance($r); $s=$this->shipments($r); $w=$this->warehouse($r); $d=$this->deliveries($r);
  return $this->ok(['finance'=>$f->getData(true)['data'],'shipments'=>$s->getData(true)['data'],'warehouse'=>$w->getData(true)['data'],'deliveries'=>$d->getData(true)['data']]);
 }
}
