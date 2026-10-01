<?php

namespace App\Http\Controllers;

use App\Models\Shipment;
use App\Models\Package;
use App\Models\Container;
use App\Models\ShipmentTrackingEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShipmentController extends ApiController
{
    public const FLOW = [
        'Preparing',
        'Loading',
        'Departed China',
        'In Transit',
        'Cambodia Port',
        'Customs',
        'Cambodia Warehouse',
        'Completed',
    ];

    public function index(Request $request)
    {
        $query = Shipment::query()->with(['containers','trackingEvents']);

        if ($search = trim((string) $request->input('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('shipment_number','like',"%{$search}%")
                  ->orWhere('origin','like',"%{$search}%")
                  ->orWhere('destination','like',"%{$search}%")
                  ->orWhere('container_number','like',"%{$search}%")
                  ->orWhere('vehicle_number','like',"%{$search}%");
            });
        }
        if ($status = $request->input('status')) $query->where('status',$status);

        $shipments = $query->orderByDesc('id')->get();
        return $this->ok($shipments->map(fn($s) => $this->summary($s)), 'Shipments retrieved successfully');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'origin'=>'required|string','destination'=>'required|string','shipping_mode'=>'required|string',
            'container_number'=>'nullable|string','vehicle_number'=>'nullable|string','departure_date'=>'nullable|date',
            'eta'=>'nullable|date','actual_arrival'=>'nullable|date','status'=>'nullable|string','package_ids'=>'nullable|array',
        ]);

        return DB::transaction(function () use ($data) {
            $n = Shipment::count()+1;
            $data['shipment_number'] = 'HFL-SHP-'.now()->year.'-'.str_pad((string)$n,6,'0',STR_PAD_LEFT);
            $data['status'] = $data['status'] ?? 'Preparing';
            $this->calculateTotals($data);
            $shipment = Shipment::create($data);
            $this->syncContainersFromNumber($shipment, $data['container_number'] ?? null);
            $this->addEvent($shipment, $shipment->status, $this->defaultLocation($shipment, $shipment->status), 'Shipment created');
            return $this->ok($this->detail($shipment->id), 'Shipment created successfully');
        });
    }

    public function show($id)
    {
        return $this->ok($this->detail($id), 'Shipment retrieved successfully');
    }

    public function update(Request $request, $id)
    {
        $shipment = Shipment::findOrFail($id);
        $data = $request->validate([
            'origin'=>'sometimes|string','destination'=>'sometimes|string','shipping_mode'=>'sometimes|string',
            'container_number'=>'sometimes|nullable|string','vehicle_number'=>'sometimes|nullable|string',
            'departure_date'=>'sometimes|nullable|date','eta'=>'sometimes|nullable|date','actual_arrival'=>'sometimes|nullable|date',
            'status'=>'sometimes|string','package_ids'=>'sometimes|array',
        ]);

        return DB::transaction(function () use ($shipment,$data) {
            $oldStatus = $shipment->status;
            if (array_key_exists('status', $data) && $data['status'] !== $oldStatus && $shipment->containers()->exists()) {
                return response()->json([
                    'message' => 'Shipment status is controlled by its container lifecycle. Transition the linked container instead.',
                ], 422);
            }
            $merged = array_merge($shipment->toArray(), $data);
            $this->calculateTotals($merged);
            unset($merged['id'],$merged['created_at'],$merged['updated_at'],$merged['containers'],$merged['tracking_events']);
            $shipment->update($merged);
            $this->syncContainersFromNumber($shipment, $merged['container_number'] ?? null);

            if (!empty($data['status']) && $data['status'] !== $oldStatus) {
                $this->addEvent($shipment, $data['status'], $this->defaultLocation($shipment,$data['status']), 'Shipment status updated');
                foreach ($this->packageIdsForShipment($shipment) as $packageId) {
                    if ($p=Package::find($packageId)) $p->update(['status'=>$data['status']]);
                }
            }
            return $this->ok($this->detail($shipment->id), 'Shipment updated successfully');
        });
    }

    public function destroy($id)
    {
        Shipment::findOrFail($id)->delete();
        return $this->ok(null,'Shipment deleted successfully');
    }

    public function tracking($id)
    {
        $shipment = Shipment::findOrFail($id);
        $events = ShipmentTrackingEvent::where('shipment_id',$shipment->id)->with('createdBy:id,name')->orderBy('event_date')->orderBy('id')->get();
        return $this->ok($events,'Shipment tracking retrieved successfully');
    }

    public function addTrackingEvent(Request $request, $id)
    {
        $shipment = Shipment::findOrFail($id);
        $data = $request->validate([
            'status'=>'required|string','location'=>'nullable|string','event_date'=>'nullable|date','remarks'=>'nullable|string',
        ]);
        return DB::transaction(function() use ($shipment,$data) {
            if ($shipment->containers()->exists()) {
                return response()->json([
                    'message' => 'Shipment tracking status is controlled by the linked container lifecycle. Use the container transition endpoint.',
                ], 422);
            }
            $event = $this->addEvent($shipment,$data['status'],$data['location'] ?? $this->defaultLocation($shipment,$data['status']),$data['remarks'] ?? null,$data['event_date'] ?? null);
            $shipment->update(['status'=>$data['status']]);
            foreach ($this->packageIdsForShipment($shipment) as $packageId) if ($p=Package::find($packageId)) $p->update(['status'=>$data['status']]);
            return $this->ok($event->load('createdBy:id,name'),'Shipment tracking event created');
        });
    }

    private function detail($id): array
    {
        $s = Shipment::with(['containers.packages.customer','containers.trackingEvents','trackingEvents.createdBy:id,name'])->findOrFail($id);
        $packages = collect($this->packageIdsForShipment($s))->map(fn($id)=>Package::with('customer')->find($id))->filter()->values();
        $s->setAttribute('package_count',$packages->count());
        $s->setAttribute('total_cbm',round($packages->sum(fn($p)=>(float)$p->total_cbm),6));
        $s->setAttribute('total_weight',round($packages->sum(fn($p)=>(float)$p->total_weight),3));
        return $s->toArray();
    }

    private function summary(Shipment $s): array
    {
        $ids=$this->packageIdsForShipment($s); $s->setAttribute('package_count',count($ids));
        $s->setAttribute('total_cbm',round(Package::whereIn('id',$ids)->sum('total_cbm'),6));
        $s->setAttribute('total_weight',round(Package::whereIn('id',$ids)->sum('total_weight'),3));
        $s->setAttribute('container_count',$s->containers->count());
        return $s->toArray();
    }

    private function packageIdsForShipment(Shipment $s): array
    {
        $json = is_array($s->package_ids) ? $s->package_ids : (json_decode($s->package_ids ?: '[]',true) ?: []);
        $ids = collect($json)->map(fn($v)=>(int)$v)->filter()->values();
        $containerIds=$s->containers->flatMap(fn($c)=>$c->packages->pluck('id'));
        return $ids->merge($containerIds)->unique()->values()->all();
    }

    private function calculateTotals(array &$d): void
    {
        $ids = collect($d['package_ids'] ?? [])->map(fn($v)=>(int)$v)->filter();
        $ps = Package::whereIn('id',$ids)->get();
        $d['package_count']=$ps->count(); $d['total_cbm']=$ps->sum('total_cbm'); $d['total_weight']=$ps->sum('total_weight');
    }

    private function syncContainersFromNumber(Shipment $shipment, ?string $number): void
    {
        if (!$number) return;
        $container=Container::where('container_number',$number)->first();
        if ($container && (int)$container->shipment_id !== (int)$shipment->id) $container->update(['shipment_id'=>$shipment->id]);
    }

    private function addEvent(Shipment $shipment,string $status,?string $location,?string $remarks=null,?string $date=null): ShipmentTrackingEvent
    {
        return ShipmentTrackingEvent::create(['shipment_id'=>$shipment->id,'status'=>$status,'location'=>$location,'event_date'=>$date ?? now(),'remarks'=>$remarks,'created_by'=>auth()->id()]);
    }

    private function defaultLocation(Shipment $s,string $status): string
    {
        return match($status) {
            'Departed China','In Transit' => $s->origin ?: 'China',
            'Cambodia Port','Customs' => 'Cambodia Port',
            'Cambodia Warehouse','Completed' => $s->destination ?: 'Cambodia Warehouse',
            default => $s->origin ?: 'China',
        };
    }
}
