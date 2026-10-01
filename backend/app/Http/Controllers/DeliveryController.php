<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\Package;
use App\Models\TrackingEvent;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeliveryController extends CrudController
{
    protected string $model = Delivery::class;

    protected array $rules = [
        'package_id' => 'required|integer|exists:packages,id',
        'customer_id' => 'nullable|string|max:100',
        'driver_id' => 'nullable|integer|exists:users,id',
        'delivery_address' => 'required|string|max:1000',
        'phone' => 'nullable|string|max:50',
        'scheduled_at' => 'nullable|date',
        'status' => 'nullable|in:Ready for Delivery,Scheduled,Out for Delivery,Delivered,Failed,Cancelled',
        'notes' => 'nullable|string',
        'proof_type' => 'nullable|in:photo,signature,document,other',
        'proof_url' => 'nullable|string|max:2000',
        'proof_note' => 'nullable|string|max:2000',
        'receiver_name' => 'nullable|string|max:255',
        'failure_reason' => 'nullable|string|max:2000',
    ];

    protected function searchColumns(): array
    {
        return ['delivery_number','customer_id','delivery_address','phone','status'];
    }

    public function index(Request $r)
    {
        $q = Delivery::with(['package','driver:id,name,role']);
        if ($r->filled('search')) {
            $s = $r->string('search');
            $q->where(function ($x) use ($s) {
                $x->where('delivery_number','like','%'.$s.'%')
                    ->orWhere('customer_id','like','%'.$s.'%')
                    ->orWhere('phone','like','%'.$s.'%')
                    ->orWhere('delivery_address','like','%'.$s.'%');
            });
        }
        if ($r->filled('status')) $q->where('status', $r->string('status'));
        return $this->ok($q->latest()->paginate((int)$r->input('per_page',25)));
    }

    public function store(Request $r)
    {
        $d = $r->validate($this->rules);
        return DB::transaction(function () use ($d) {
            $p = Package::findOrFail($d['package_id']);

            if (!in_array($p->status, ['Ready for Delivery'], true)) {
                return $this->fail('Package is not ready for delivery.', ['package_status' => $p->status], 422);
            }

            if (Delivery::where('package_id',$p->id)->whereNotIn('status',['Delivered','Cancelled','Failed'])->exists()) {
                return $this->fail('Package already has an active delivery.', [], 422);
            }

            $d['delivery_number'] = 'HFL-DLV-'.now()->format('Ymd').'-'.strtoupper(substr((string) \Illuminate\Support\Str::uuid(), 0, 8));
            $d['customer_id'] = $d['customer_id'] ?? $p->customer_id;
            $d['status'] = $d['status'] ?? 'Ready for Delivery';

            if ($d['status'] === 'Delivered') {
                return $this->fail('Create the delivery first, then complete it with proof of delivery.', [], 422);
            }

            $x = Delivery::create($d);
            $p->update([
                'delivery_driver_id' => $d['driver_id'] ?? $p->delivery_driver_id,
                'status' => $d['status'],
            ]);

            $this->track($p, $d['status'], 'Delivery created'.($d['driver_id'] ? ' and driver assigned' : ''));
            $this->notifyDelivery($p, $d['status'], $x);
            return $this->ok($x->load(['package','driver:id,name,role']), 'Delivery created');
        });
    }

    public function update(Request $r, $id)
    {
        $x = Delivery::findOrFail($id);
        $rules = $this->rules;
        foreach ($rules as $field => $rule) {
            if (is_string($rule)) $rules[$field] = str_replace('required|','',$rule);
        }
        $rules['package_id'] = 'sometimes|integer|in:' . $x->package_id;
        $rules['delivery_address'] = 'sometimes|string|max:1000';
        $d = $r->validate($rules);

        return DB::transaction(function () use ($x, $d) {
            $oldStatus = $x->status;
            $newStatus = $d['status'] ?? $oldStatus;

            $allowed = [
                'Ready for Delivery' => ['Scheduled','Cancelled','Failed'],
                'Scheduled' => ['Out for Delivery','Cancelled','Failed'],
                'Out for Delivery' => ['Delivered','Failed','Cancelled'],
                'Delivered' => [],
                'Failed' => ['Scheduled','Cancelled'],
                'Cancelled' => [],
            ];
            if ($newStatus !== $oldStatus && !in_array($newStatus, $allowed[$oldStatus] ?? [], true)) {
                return $this->fail("Invalid delivery transition: {$oldStatus} → {$newStatus}.", [], 422);
            }

            if ($newStatus === 'Scheduled' && empty($d['scheduled_at'])) $d['scheduled_at'] = now();
            if ($newStatus === 'Out for Delivery' && $oldStatus !== 'Out for Delivery') $d['out_for_delivery_at'] = now();

            if ($newStatus === 'Delivered' && $oldStatus !== 'Delivered') {
                if (empty($d['proof_type']) || empty($d['proof_url'])) {
                    return $this->fail('Proof of delivery is required before marking Delivered.', [], 422);
                }
                $d['delivered_at'] = now();
            }
            if ($newStatus === 'Failed' && empty($d['failure_reason'])) {
                return $this->fail('Failure reason is required.', [], 422);
            }

            $x->update($d);
            $p = $x->package;
            if ($p && $newStatus !== $oldStatus) {
                $packageStatus = $newStatus === 'Delivered' ? 'Delivered' : $newStatus;
                $p->update([
                    'status' => $packageStatus,
                    'delivery_driver_id' => $x->driver_id,
                ]);
                $this->track($p, $packageStatus, $packageStatus === 'Delivered' && !empty($d['receiver_name']) ? 'Delivered to '.$d['receiver_name'] : 'Delivery status updated');
                $this->notifyDelivery($p, $packageStatus, $x);
            }

            return $this->ok($x->fresh()->load(['package','driver:id,name,role']), 'Delivery updated');
        });
    }

    /**
     * Confirm that the customer has physically received a delivered package.
     * Delivery.status remains Delivered; Package.delivery_status becomes Customer Received.
     */
    public function confirmCustomerReceived(Request $request, $packageId)
    {
        $data = $request->validate([
            'received_by' => ['required', 'string', 'max:255'],
            'received_phone' => ['nullable', 'string', 'max:50'],
            'received_relation' => ['nullable', 'string', 'max:100'],
            'delivery_remark' => ['nullable', 'string', 'max:2000'],
        ]);

        return DB::transaction(function () use ($packageId, $data) {
            $package = Package::findOrFail($packageId);

            if ($package->status !== 'Delivered') {
                return $this->fail(
                    'Package must be Delivered before confirming customer receipt.',
                    ['package_status' => $package->status],
                    422
                );
            }

            $delivered = Delivery::where('package_id', $package->id)
                ->where('status', 'Delivered')
                ->latest('delivered_at')
                ->latest('id')
                ->first();

            if (!$delivered) {
                return $this->fail(
                    'No completed delivery with proof of delivery was found for this package.',
                    [],
                    422
                );
            }

            // Idempotent: repeated clicks must not create duplicate receipt events.
            if ($package->delivery_status === 'Customer Received' && $package->customer_received_at) {
                return $this->ok($package->fresh(), 'Customer receipt was already confirmed.');
            }

            $package->delivery_status = 'Customer Received';
            $package->customer_received_at = now();
            $package->received_by = $data['received_by'];
            $package->received_phone = $data['received_phone'] ?? null;
            $package->received_relation = $data['received_relation'] ?? null;
            $package->delivery_remark = $data['delivery_remark'] ?? null;
            $package->save();

            TrackingEvent::create([
                'tracking_number' => $package->tracking_number,
                'package_id' => $package->id,
                'status' => 'Customer Received',
                'location' => $package->warehouse_location ?? $package->to_warehouse,
                'warehouse' => 'Cambodia / Last Mile',
                'staff_name' => $request->user()?->name ?? 'Delivery',
                'note' => 'Customer received the package by ' . $data['received_by'],
                'event_at' => now(),
            ]);

            return $this->ok($package->fresh(), 'Package received by customer successfully.');
        });
    }

    private function notifyDelivery(Package $p, string $status, Delivery $delivery): void
    {
        $customerId = $p->customer_id;
        $title = 'Delivery update';
        $messages = [
            'Ready for Delivery' => 'Your package is ready for last-mile delivery.',
            'Scheduled' => 'Your package delivery has been scheduled.',
            'Out for Delivery' => 'Your package is out for delivery.',
            'Delivered' => 'Your package has been delivered successfully.',
            'Failed' => 'Your package delivery could not be completed. Please contact HFL Logistics.',
            'Cancelled' => 'Your package delivery has been cancelled.',
        ];
        $message = $messages[$status] ?? "Delivery status changed to {$status}.";
        Notification::create([
            'customer_id' => $customerId,
            'package_id' => $p->id,
            'user_id' => $delivery->driver_id,
            'type' => 'delivery',
            'title' => $title,
            'message' => $message . ' Tracking: ' . ($p->tracking_number ?: 'N/A'),
        ]);
    }

    private function track(Package $p, string $status, string $note): void
    {
        TrackingEvent::create([
            'tracking_number' => $p->tracking_number,
            'package_id' => $p->id,
            'status' => $status,
            'location' => $p->warehouse_location ?? $p->to_warehouse,
            'staff_name' => 'Delivery',
            'note' => $note,
            'event_at' => now(),
        ]);
    }
}
