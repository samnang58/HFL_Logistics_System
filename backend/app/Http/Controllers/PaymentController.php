<?php
namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Invoice;
use App\Models\Income;
use App\Models\Package;
use App\Models\TrackingEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PaymentController extends CrudController {
    protected string $model=Payment::class;
    protected array $rules=[
        'invoice_id'=>'required|integer',
        'customer_id'=>'nullable|string',
        'amount'=>'required|numeric|gt:0',
        'method'=>'required|string',
        'reference'=>'nullable|string',
        'paid_at'=>'nullable|date',
        'idempotency_key'=>'required|string|max:100'
    ];
    protected function searchColumns():array{return ['payment_no','invoice_id','customer_id','reference','status'];}

    public function index(Request $r)
    {
        $q = Payment::query()->where('is_test', false);

        if ($r->filled('search')) {
            $s = $r->string('search');
            $q->where(function ($x) use ($s) {
                foreach ($this->searchColumns() as $c) {
                    $x->orWhere($c, 'like', '%' . $s . '%');
                }
            });
        }

        return $this->ok($q->latest()->paginate((int) $r->input('per_page', 25)));
    }

    public function show($id)
    {
        return $this->ok(Payment::where('is_test', false)->findOrFail($id));
    }

    public function store(Request $r){
        $d=$r->validate($this->rules);
        return DB::transaction(function()use($d){
            if($existing=Payment::where('is_test', false)->where('idempotency_key',$d['idempotency_key'])->first()) return $this->ok($existing,'Payment already processed');
            $inv=Invoice::where('is_test', false)->lockForUpdate()->findOrFail($d['invoice_id']);
            if (in_array((string) $inv->status, ['Cancelled', 'Void'], true)) {
                return $this->fail('Payment cannot be recorded against a cancelled or void invoice.', [], 422);
            }
            if ((float) $inv->outstanding <= 0) {
                return $this->fail('Invoice is already fully paid.', [], 422);
            }
            if (!empty($d['customer_id']) && (string) $d['customer_id'] !== (string) $inv->customer_id) {
                return $this->fail('Customer does not match the invoice.', ['customer_id' => ['Customer mismatch.']], 422);
            }
            $d['customer_id'] = $inv->customer_id;
            $amount=(float)$d['amount'];
            $out=(float)$inv->outstanding;
            if($amount>$out+0.0001) return $this->fail('Payment exceeds outstanding balance',['amount'=>['Maximum payment is '.$out]],422);
            $d['payment_no']='TMP-PAY-'.(string) Str::uuid();
            $d['receipt_no']='TMP-RCP-'.(string) Str::uuid();
            $d['status']='Confirmed';
            $d['paid_at']=$d['paid_at']??now();
            $p=Payment::create($d);
            $p->payment_no='HFL-PAY-'.str_pad((string)$p->id,6,'0',STR_PAD_LEFT);
            $p->receipt_no='HFL-RCP-'.str_pad((string)$p->id,6,'0',STR_PAD_LEFT);
            $p->save();
            $inv->paid_amount=(float)$inv->paid_amount+$amount;
            $inv->outstanding=max(0,(float)$inv->grand_total-(float)$inv->paid_amount);
            $inv->status=$inv->outstanding==0?'Paid':'Partially Paid';
            $inv->save();

            $in=Income::create([
                'income_no'=>'TMP-INC-'.(string) Str::uuid(),
                'payment_id'=>$p->id,'customer_id'=>$inv->customer_id,'invoice_id'=>$inv->id,'amount'=>$amount,
                'category'=>'Invoice Payment','description'=>'Payment for '.$inv->invoice_no,'received_at'=>$d['paid_at']
            ]);
            $in->income_no='HFL-INC-'.str_pad((string)$in->id,6,'0',STR_PAD_LEFT);
            $in->save();

            $items=is_array($inv->items)?$inv->items:[];
            $packageIds=collect($items)->pluck('package_id')->filter()->unique()->values();
            $eligibleStatuses=['Invoiced','Partially Paid'];

            foreach($packageIds as $packageId){
                $pkg=Package::find($packageId);

                if(!$pkg || !in_array((string)$pkg->status,$eligibleStatuses,true)) {
                    continue;
                }

                $fullyPaid=(float)$inv->outstanding <= 0.0001;
                $nextStatus=$fullyPaid?'Ready for Delivery':'Partially Paid';

                if((string)$pkg->status === $nextStatus) {
                    continue;
                }

                $pkg->status=$nextStatus;
                $pkg->save();

                TrackingEvent::create([
                    'tracking_number'=>$pkg->tracking_number,
                    'package_id'=>$pkg->id,
                    'status'=>$nextStatus,
                    'location'=>$pkg->warehouse_location ?: $pkg->to_warehouse ?: 'Cambodia',
                    'warehouse'=>'Cambodia Warehouse',
                    'staff_name'=>auth()->user()?->name ?? 'Finance',
                    'note'=>$fullyPaid
                        ? 'Invoice fully paid; package ready for delivery'
                        : 'Partial payment received',
                    'event_at'=>now()
                ]);
            }

            return $this->ok(['payment'=>$p,'invoice'=>$inv,'income'=>$in],'Payment confirmed');
        });
    }
}
