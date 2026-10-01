<?php

namespace App\Http\Controllers;

use App\Models\Container;
use App\Models\Package;
use App\Models\TrackingEvent;
use App\Models\ShipmentTrackingEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ContainerController extends ApiController
{
    /**
     * List containers
     */
    public function index(Request $request)
    {
        $query = Container::query()
            ->with([
                'trackingEvents',
                'packages',
                'packages.customer',
            ]);

        if ($search = trim((string) $request->input('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where(
                    'containers.container_number',
                    'like',
                    '%' . $search . '%'
                )
                ->orWhere(
                    'containers.seal_number',
                    'like',
                    '%' . $search . '%'
                )
                ->orWhere(
                    'containers.shipment_id',
                    $search
                )
                ->orWhere(
                    'containers.current_location',
                    'like',
                    '%' . $search . '%'
                )
                ->orWhereHas('packages', function ($packageQuery) use ($search) {
                    $packageQuery->where('packages.tracking_number', 'like', '%' . $search . '%')
                        ->orWhere('packages.china_waybill_number', 'like', '%' . $search . '%')
                        ->orWhere('packages.hfl_package_code', 'like', '%' . $search . '%')
                        ->orWhere('packages.package_id', 'like', '%' . $search . '%');
                });
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($location = $request->input('location')) {
            $query->where(
                'current_location',
                'like',
                '%' . $location . '%'
            );
        }

        $containers = $query
            ->orderByDesc('id')
            ->get();

        // Container totals are derived from the packages actually linked to the
        // container. Do not rely on denormalized/old container columns.
        $containers->each(function ($container) {
            $packages = $container->packages;
            $container->setAttribute('package_count', $packages->count());
            $container->setAttribute('tracking_count', $packages->filter(fn ($p) => !empty($p->tracking_number) || !empty($p->china_waybill_number))->count());
            $container->setAttribute('product_types', $packages->pluck('product_name')->filter()->unique()->count());
            $container->setAttribute('total_quantity', (int) $packages->sum(fn ($p) => (int) ($p->quantity ?? 0)));
            $container->setAttribute('total_cbm', round($packages->sum(fn ($p) => (float) ($p->total_cbm ?? 0)), 6));
            $container->setAttribute('total_weight', round($packages->sum(fn ($p) => (float) ($p->total_weight ?? 0)), 3));
        });

        return $this->ok(
            $containers,
            'Containers retrieved successfully'
        );
    }

    /**
     * Create container
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'container_number' => [
                'required',
                'string',
                'max:255',
                'unique:containers,container_number',
            ],

            'container_type' => [
                'nullable',
                'string',
                'max:100',
            ],

            'seal_number' => [
                'nullable',
                'string',
                'max:100',
            ],

            'shipment_id' => [
                'nullable',
                'integer',
                'exists:shipments,id',
            ],

            'shipping_mode' => [
                'nullable',
                'string',
                'max:100',
            ],

            'origin' => [
                'nullable',
                'string',
                'max:255',
            ],

            'destination' => [
                'nullable',
                'string',
                'max:255',
            ],

            'current_location' => [
                'nullable',
                'string',
                'max:255',
            ],

            'status' => [
                'nullable',
                'string',
                'max:100',
            ],

            'departure_date' => [
                'nullable',
                'date',
            ],

            'estimated_arrival' => [
                'nullable',
                'date',
            ],

            'actual_arrival' => [
                'nullable',
                'date',
            ],

            'notes' => [
                'nullable',
                'string',
            ],
        ]);

        $data['status'] =
            $data['status'] ?? 'Pending';

        $container = Container::create($data);

        return $this->ok(
            $container->load([
                'trackingEvents',
                'packages',
            ]),
            'Container created successfully'
        );
    }

    /**
     * Show container details
     */
    public function show($id)
    {
        $container = Container::with([
            'shipment',
            'trackingEvents.createdBy:id,name,email,role',
            'packages.customer',
            'packages.containers',
        ])->findOrFail($id);

        $packages = $container->packages;
        $container->setAttribute('package_count', $packages->count());
        $container->setAttribute('total_cbm', round($packages->sum(fn ($p) => (float) ($p->total_cbm ?? 0)), 6));
        $container->setAttribute('total_weight', round($packages->sum(fn ($p) => (float) ($p->total_weight ?? 0)), 3));
        $container->setAttribute('loaded_package_count', $packages->filter(fn ($p) => !empty($p->pivot?->loaded_at))->count());
        $container->setAttribute('unloaded_package_count', $packages->filter(fn ($p) => !empty($p->pivot?->unloaded_at))->count());
        $container->setAttribute('product_types', $packages->pluck('product_name')->filter()->unique()->count());
        $container->setAttribute('total_quantity', (int) $packages->sum(fn ($p) => (int) ($p->quantity ?? 0)));

        return $this->ok(
            $container,
            'Container retrieved successfully'
        );
    }

    /**
     * Update container
     */
    public function update(
        Request $request,
        $id
    ) {
        $container = Container::findOrFail($id);

        // Status changes must go through /transition so Container, Package,
        // Shipment and tracking events remain synchronized.
        if ($request->has('status')) {
            return response()->json([
                'message' => 'Container status cannot be changed through the generic update endpoint. Use POST /containers/{id}/transition.',
            ], 422);
        }

        $data = $request->validate([
            'container_number' => [
                'sometimes',
                'string',
                'max:255',
                'unique:containers,container_number,' .
                    $container->id,
            ],

            'container_type' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
            ],

            'seal_number' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
            ],

            'shipment_id' => [
                'sometimes',
                'nullable',
                'integer',
                'exists:shipments,id',
            ],

            'shipping_mode' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
            ],

            'origin' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'destination' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'current_location' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'status' => [
                'sometimes',
                'string',
                'max:100',
            ],

            'departure_date' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'estimated_arrival' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'actual_arrival' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'notes' => [
                'sometimes',
                'nullable',
                'string',
            ],
        ]);

        $container->update($data);

        return $this->ok(
            $container->fresh()->load([
                'trackingEvents',
                'packages',
            ]),
            'Container updated successfully'
        );
    }

    /**
     * Delete container
     */
    public function destroy($id)
    {
        $container =
            Container::findOrFail($id);

        $container->delete();

        return $this->ok(
            null,
            'Container deleted successfully'
        );
    }

    /**
     * Move the container through the operational China -> Cambodia lifecycle.
     * This is intentionally stricter than a generic update so the movement is
     * auditable and the child packages + parent shipment stay synchronized.
     */
    public function transition(Request $request, $id)
    {
        $container = Container::with(['packages', 'shipment'])->findOrFail($id);

        $data = $request->validate([
            'status' => ['required', 'in:Pending,Loading,Departed China,In Transit,Cambodia Port,Customs,Cambodia Warehouse,Received,Delivered'],
            'location' => ['required', 'string', 'max:255'],
            'event_date' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string'],
        ]);

        $flow = [
            'Pending' => 0,
            'Loading' => 1,
            'Departed China' => 2,
            'In Transit' => 3,
            'Cambodia Port' => 4,
            'Customs' => 5,
            'Cambodia Warehouse' => 6,
            'Received' => 7,
            'Delivered' => 8,
        ];

        return DB::transaction(function () use ($container, $data, $flow, $request) {
            $current = $container->status ?: 'Pending';
            if (!array_key_exists($current, $flow)) {
                $current = 'Pending';
            }
            // Container Movement is the operational source of truth. Allow
            // an authorized correction to an already-recorded movement (for
            // example a test record incorrectly marked Delivered) so the
            // actual physical state can be corrected. The correction is kept
            // as a new auditable tracking event; package lifecycle fields are
            // still protected from backwards overwrites below.

            $eventDate = $data['event_date'] ?? now();
            $container->update([
                'status' => $data['status'],
                'current_location' => $data['location'],
                'departure_date' => $data['status'] === 'Departed China'
                    ? ($container->departure_date ?: now()->toDateString())
                    : $container->departure_date,
                'actual_arrival' => $data['status'] === 'Cambodia Warehouse'
                    ? ($container->actual_arrival ?: now()->toDateString())
                    : $container->actual_arrival,
            ]);

            $container->trackingEvents()->create([
                'location' => $data['location'],
                'status' => $data['status'],
                'event_date' => $eventDate,
                'remarks' => $data['remarks'] ?? null,
                'created_by' => $request->user()?->id,
            ]);

            // Container movement controls transport/arrival stages only.
            // It must never move a package backwards after warehouse measurement,
            // billing, payment, delivery, or customer receipt.
            // Last-mile Delivered is controlled by DeliveryController + POD.
            $packageStatus = match ($data['status']) {
                'Loading' => 'Loading',
                'Departed China' => 'Departed China',
                'In Transit' => 'In Transit',
                'Cambodia Port', 'Customs' => 'Arrived Cambodia',
                'Cambodia Warehouse' => 'Cambodia Warehouse',
                'Received' => 'Cambodia Warehouse',
                'Delivered' => null,
                default => null,
            };

            $transportStatuses = [
                'Received at China Warehouse' => 0,
                'Loading' => 1,
                'Departed China' => 2,
                'In Transit' => 3,
                'Cambodia Port' => 4,
                'Customs' => 5,
                'Arrived Cambodia' => 6,
                'Cambodia Warehouse' => 7,
            ];

            if ($packageStatus) {
                foreach ($container->packages as $package) {
                    $currentPackageStatus = (string) ($package->status ?? '');
                    $currentRank = $transportStatuses[$currentPackageStatus] ?? null;
                    $targetRank = $transportStatuses[$packageStatus] ?? null;

                    // Once the package has left the transport lifecycle, the
                    // container is no longer allowed to overwrite its status.
                    if ($currentRank === null || $targetRank === null || $targetRank < $currentRank) {
                        continue;
                    }

                    $sameState = $currentPackageStatus === $packageStatus
                        && (string) ($package->warehouse_location ?? '') === (string) $data['location'];

                    $package->update([
                        'status' => $packageStatus,
                        'warehouse_location' => $data['location'],
                    ]);

                    // Do not create duplicate timeline entries when the same
                    // container state is saved repeatedly.
                    if (!$sameState) {
                        TrackingEvent::create([
                            'tracking_number' => $package->tracking_number,
                            'package_id' => $package->id,
                            'status' => $packageStatus,
                            'location' => $data['location'],
                            'warehouse' => $data['location'],
                            'staff_name' => $request->user()?->name ?? 'Operations',
                            'note' => $data['remarks'] ?? 'Container status transitioned',
                            'event_at' => $eventDate,
                        ]);
                    }
                }
            }

            // The container is the single source of truth for transport
            // location. Even when the package lifecycle has already reached
            // Cambodia Warehouse, a Container movement to Received/Delivered
            // must update the package's visible warehouse location so Tracking
            // never shows the old China warehouse location. Package status is
            // intentionally not changed here because billing/delivery have
            // their own lifecycle.
            if (in_array($data['status'], ['Cambodia Warehouse', 'Received', 'Delivered'], true)) {
                foreach ($container->packages as $package) {
                    if ((string) ($package->warehouse_location ?? '') !== (string) $data['location']) {
                        $package->update([
                            'warehouse_location' => $data['location'],
                        ]);
                    }
                }
            }

            if ($container->shipment) {
                $shipmentStatus = match ($data['status']) {
                    'Loading' => 'Loading',
                    'Departed China' => 'Departed China',
                    'In Transit' => 'In Transit',
                    'Cambodia Port' => 'Cambodia Port',
                    'Customs' => 'Customs',
                    'Cambodia Warehouse' => 'Cambodia Warehouse',
                    'Received' => 'Cambodia Warehouse',
                    'Delivered' => 'Completed',
                    default => $data['status'],
                };

                $container->shipment->update([
                    'status' => $shipmentStatus,
                    'actual_arrival' => in_array($shipmentStatus, ['Cambodia Warehouse', 'Completed'], true)
                        ? ($container->shipment->actual_arrival ?: now()->toDateString())
                        : $container->shipment->actual_arrival,
                ]);

                ShipmentTrackingEvent::create([
                    'shipment_id' => $container->shipment->id,
                    'location' => $data['location'],
                    'status' => $shipmentStatus,
                    'event_date' => $eventDate,
                    'remarks' => $data['remarks'] ?? 'Container lifecycle transition',
                    'created_by' => $request->user()?->id,
                ]);
            }

            return $this->ok(
                $container->fresh()->load(['shipment', 'packages', 'trackingEvents.createdBy:id,name,email,role']),
                'Container transition completed successfully'
            );
        });
    }

    /**
     * Attach packages to container
     */
    public function attachPackages(
        Request $request,
        $id
    ) {
        $container =
            Container::findOrFail($id);

        $data = $request->validate([
            'package_ids' => [
                'required',
                'array',
                'min:1',
            ],

            'package_ids.*' => [
                'integer',
                'exists:packages,id',
            ],
        ]);

        DB::transaction(function () use (
            $container,
            $data
        ) {
            foreach (
                $data['package_ids']
                as $packageId
            ) {
                $package =
                    Package::findOrFail(
                        $packageId
                    );

                $loadableStatuses = [
                    'Received at China Warehouse',
                    'Waiting Shipment',
                    'Loading',
                    'Departed China',
                    'In Transit',
                ];

                if (!in_array($package->status, $loadableStatuses, true)) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'package_ids' => ["Package {$package->package_id} cannot be loaded because it is already at workflow stage {$package->status}."],
                    ]);
                }

                $existingContainer = $package->containers()
                    ->whereKey($container->id)
                    ->exists();
                $otherContainer = $package->containers()
                    ->where('containers.id', '!=', $container->id)
                    ->wherePivotNull('unloaded_at')
                    ->exists();

                if ($otherContainer) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'package_ids' => ["Package {$package->package_id} is already loaded in another active container."],
                    ]);
                }

                $container->packages()->syncWithoutDetaching([
                    $package->id => [
                        'loaded_at' => now(),
                    ],
                ]);

                if (in_array($package->status, ['Received at China Warehouse', 'Waiting Shipment'], true)) {
                    $package->update(['status' => 'Loading']);
                    TrackingEvent::create([
                        'tracking_number' => $package->tracking_number,
                        'package_id' => $package->id,
                        'status' => 'Loading',
                        'location' => $container->current_location ?: $container->origin ?: 'China Warehouse',
                        'warehouse' => $container->current_location ?: $container->origin,
                        'staff_name' => auth()->user()?->name ?? 'Warehouse',
                        'note' => 'Package loaded into container',
                        'event_at' => now(),
                    ]);
                }
            }
        });

        return $this->ok(
            $container->fresh()->load([
                'packages',
            ]),
            'Packages attached to container successfully'
        );
    }

    /**
     * Remove package from container
     */
    public function detachPackage(
        $id,
        $packageId
    ) {
        $container =
            Container::findOrFail($id);

        $container
            ->packages()
            ->detach($packageId);

        return $this->ok(
            null,
            'Package removed from container successfully'
        );
    }

    /**
     * Update container location/status
     * and create timeline event
     */
    public function updateLocation(Request $request, $id)
    {
        // Backward-compatible endpoint: all operational movement is delegated
        // to the same controlled lifecycle used by the transition endpoint.
        return $this->transition($request, $id);
    }

    /**
     * Get packages inside container
     */
    public function packages($id)
    {
        $container =
            Container::findOrFail($id);

        $packages = $container->packages()
            ->with('customer')
            ->orderByDesc('container_packages.id')
            ->get();

        return $this->ok([
            'items' => $packages,
            'summary' => [
                'package_count' => $packages->count(),
                'tracking_count' => $packages->whereNotNull('tracking_number')->count(),
                'product_types' => $packages->pluck('product_name')->filter()->unique()->count(),
                'total_quantity' => (int) $packages->sum(fn ($p) => (int) ($p->quantity ?? 0)),
                'total_cbm' => round($packages->sum(fn ($p) => (float) ($p->total_cbm ?? 0)), 6),
                'total_weight' => round($packages->sum(fn ($p) => (float) ($p->total_weight ?? 0)), 3),
            ],
        ], 'Container packages retrieved successfully');
    }

    /**
     * Get container timeline
     */
    public function timeline($id)
    {
        $container =
            Container::findOrFail($id);

        return $this->ok(
            $container->trackingEvents()
                ->with(
                    'createdBy:id,name,email,role'
                )
                ->get(),
            'Container timeline retrieved successfully'
        );
    }
}
