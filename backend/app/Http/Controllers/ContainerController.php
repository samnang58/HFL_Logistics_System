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
     * List containers.
     */
    public function index(Request $request)
    {
        $query = Container::query()
            ->with([
                'trackingEvents',
                'packages' => fn ($q) => $q->wherePivotNull('unloaded_at'),
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
                    $packageQuery
                        ->wherePivotNull('unloaded_at')
                        ->where(function ($q) use ($search) {
                            $q->where('packages.tracking_number', 'like', '%' . $search . '%')
                                ->orWhere('packages.china_waybill_number', 'like', '%' . $search . '%')
                                ->orWhere('packages.hfl_package_code', 'like', '%' . $search . '%')
                                ->orWhere('packages.package_id', 'like', '%' . $search . '%');
                        });
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

        $containers->each(function ($container) {
            $packages = $container->packages;

            $container->setAttribute('package_count', $packages->count());
            $container->setAttribute(
                'tracking_count',
                $packages->filter(
                    fn ($p) => !empty($p->tracking_number)
                        || !empty($p->china_waybill_number)
                )->count()
            );
            $container->setAttribute(
                'product_types',
                $packages->pluck('product_name')->filter()->unique()->count()
            );
            $container->setAttribute(
                'total_quantity',
                (int) $packages->sum(fn ($p) => (int) ($p->quantity ?? 0))
            );
            $container->setAttribute(
                'total_cbm',
                round(
                    $packages->sum(fn ($p) => (float) ($p->total_cbm ?? 0)),
                    6
                )
            );
            $container->setAttribute(
                'total_weight',
                round(
                    $packages->sum(fn ($p) => (float) ($p->total_weight ?? 0)),
                    3
                )
            );
        });

        return $this->ok(
            $containers,
            'Containers retrieved successfully'
        );
    }

    /**
     * Create container.
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

        $data['status'] = $data['status']
            ?? 'Received at China Warehouse';

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
     * Show container details.
     */
    public function show($id)
    {
        $container = Container::with([
            'shipment',
            'trackingEvents.createdBy:id,name,email,role',
            'packages' => fn ($q) => $q
                ->wherePivotNull('unloaded_at')
                ->with('customer'),
            'packages.containers',
        ])->findOrFail($id);

        $packages = $container->packages;

        $container->setAttribute('package_count', $packages->count());
        $container->setAttribute(
            'total_cbm',
            round($packages->sum(fn ($p) => (float) ($p->total_cbm ?? 0)), 6)
        );
        $container->setAttribute(
            'total_weight',
            round($packages->sum(fn ($p) => (float) ($p->total_weight ?? 0)), 3)
        );
        $container->setAttribute(
            'loaded_package_count',
            $packages->filter(fn ($p) => !empty($p->pivot?->loaded_at))->count()
        );
        $container->setAttribute(
            'unloaded_package_count',
            $packages->filter(fn ($p) => !empty($p->pivot?->unloaded_at))->count()
        );
        $container->setAttribute(
            'product_types',
            $packages->pluck('product_name')->filter()->unique()->count()
        );
        $container->setAttribute(
            'total_quantity',
            (int) $packages->sum(fn ($p) => (int) ($p->quantity ?? 0))
        );

        return $this->ok(
            $container,
            'Container retrieved successfully'
        );
    }

    /**
     * Update container details.
     */
    public function update(Request $request, $id)
    {
        $container = Container::findOrFail($id);

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
                'unique:containers,container_number,' . $container->id,
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
     * Delete container.
     */
    public function destroy($id)
    {
        $container = Container::findOrFail($id);

        $container->delete();

        return $this->ok(
            null,
            'Container deleted successfully'
        );
    }

    /**
     * Transition container movement and synchronize supported records.
     */
    public function transition(Request $request, $id)
    {
        $container = Container::with([
            'packages',
            'shipment',
        ])->findOrFail($id);

        $data = $request->validate([
            'status' => [
                'required',
                'in:Received at China Warehouse,The Container Finish,Customs declaration in progress,Under inspection,Customs Clearance cleared,Cambodia Warehouse,Delivered,Received',
            ],
            'location' => [
                'required',
                'string',
                'max:255',
            ],
            'event_date' => [
                'nullable',
                'date',
            ],
            'remarks' => [
                'nullable',
                'string',
            ],
        ]);
                /*
         * Prevent container movement from going backwards.
         * "Received" is handled separately and never changes package receipt.
         */
        $containerFlow = [
            'Received at China Warehouse',
            'The Container Finish',
            'Customs declaration in progress',
            'Under inspection',
            'Customs Clearance cleared',
            'Cambodia Warehouse',
            'Delivered',
        ];

        $currentContainerStatus = (string) $container->status;
        $requestedContainerStatus = (string) $data['status'];

        // Do not allow a completed container to return to an earlier stage.
        if (
            $currentContainerStatus === 'Received'
            && $requestedContainerStatus !== 'Received'
        ) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'status' => [
                    'A container marked Received cannot return to an earlier status.',
                ],
            ]);
        }

        // Received is a separate terminal status; do not treat it as normal movement.
        if (
            $requestedContainerStatus === 'Received'
            && !in_array($currentContainerStatus, [
                'Delivered',
                'Received',
            ], true)
        ) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'status' => [
                    'Mark the container Delivered before setting it to Received.',
                ],
            ]);
        }

        $currentContainerRank = array_search(
            $currentContainerStatus,
            $containerFlow,
            true
        );

        $requestedContainerRank = array_search(
            $requestedContainerStatus,
            $containerFlow,
            true
        );

        if (
            $currentContainerRank !== false
            && $requestedContainerRank !== false
            && $requestedContainerRank < $currentContainerRank
        ) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'status' => [
                    'Container status cannot move backwards. Current status: '
                    . $currentContainerStatus
                    . '; requested status: '
                    . $requestedContainerStatus
                    . '.',
                ],
            ]);
        }
        return DB::transaction(function () use ($container, $data, $request) {
            $eventDate = $data['event_date'] ?? now();

            /*
             * 1. Update container movement.
             */
            $containerUpdates = [
                'status' => $data['status'],
                'current_location' => $data['location'],
            ];

            if ($data['status'] === 'Cambodia Warehouse') {
                $containerUpdates['actual_arrival'] =
                    $container->actual_arrival ?: now()->toDateString();
            }

            $container->update($containerUpdates);

            /*
             * 2. Record the container timeline event.
             */
            $container->trackingEvents()->create([
                'location' => $data['location'],
                'status' => $data['status'],
                'event_date' => $eventDate,
                'remarks' => $data['remarks'] ?? null,
                'created_by' => $request->user()?->id,
            ]);

            /*
             * 3. Synchronize package transport status only.
             *
             * Never automatically change a package to Customer Received.
             * Never overwrite later package workflow stages.
             */
            $packageStatus = match ($data['status']) {
                'Received at China Warehouse' => 'Received at China Warehouse',
                'The Container Finish' => 'Loading',
                'Customs declaration in progress',
                'Under inspection' => 'Customs',
                'Customs Clearance cleared' => 'Cambodia Port',
                'Cambodia Warehouse' => 'Cambodia Warehouse',
                'Delivered', 'Received' => null,
                default => null,
            };

            $packageTransportRanks = [
                'Received at China Warehouse' => 0,
                'Waiting Shipment' => 1,
                'Loading' => 2,
                'Departed China' => 3,
                'In Transit' => 4,
                'Cambodia Port' => 5,
                'Customs' => 6,
                'Arrived Cambodia' => 7,
                'Cambodia Warehouse' => 8,
            ];

            if ($packageStatus !== null) {
                $targetRank = $packageTransportRanks[$packageStatus] ?? null;

                foreach ($container->packages as $package) {
                    $currentStatus = (string) ($package->status ?? '');
                    $currentRank = $packageTransportRanks[$currentStatus] ?? null;

                    if (
                        $currentRank === null
                        || $targetRank === null
                        || $targetRank < $currentRank
                    ) {
                        continue;
                    }

                    $sameState =
                        $currentStatus === $packageStatus
                        && (
                            $data['status'] !== 'Cambodia Warehouse'
                            || (string) ($package->warehouse_location ?? '')
                                === (string) $data['location']
                        );

                    $packageUpdates = [
                        'status' => $packageStatus,
                    ];

                    if ($data['status'] === 'Cambodia Warehouse') {
                        $packageUpdates['warehouse_location'] = $data['location'];
                    }

                    $package->update($packageUpdates);

                    if (!$sameState) {
                        TrackingEvent::create([
                            'tracking_number' => $package->tracking_number,
                            'package_id' => $package->id,
                            'status' => $packageStatus,
                            'location' => $data['location'],
                            'warehouse' => $data['location'],
                            'staff_name' => $request->user()?->name ?? 'Operations',
                            'note' => $data['remarks']
                                ?? 'Container status transitioned',
                            'event_at' => $eventDate,
                        ]);
                    }
                }
            }

            /*
             * 4. Keep warehouse location synchronized without changing
             * package status or customer receipt.
             */
            if ($data['status'] === 'Cambodia Warehouse') {
                foreach ($container->packages as $package) {
                    if (
                        (string) ($package->warehouse_location ?? '')
                        !== (string) $data['location']
                    ) {
                        $package->update([
                            'warehouse_location' => $data['location'],
                        ]);
                    }
                }
            }

            /*
             * 5. Synchronize Shipment using the existing Shipment FLOW.
             *
             * ShipmentController::FLOW:
             * Preparing -> Loading -> Departed China -> In Transit
             * -> Cambodia Port -> Customs -> Cambodia Warehouse -> Completed
             *
             * Container-only statuses must never be saved as Shipment statuses.
             * Received must not change Shipment status.
             */
            if ($container->shipment) {
                $shipmentStatus = match ($data['status']) {
                    'Received at China Warehouse' => 'Preparing',
                    'The Container Finish' => 'Loading',
                    'Customs declaration in progress',
                    'Under inspection' => 'Customs',
                    'Customs Clearance cleared' => 'Cambodia Port',
                    'Cambodia Warehouse' => 'Cambodia Warehouse',
                    'Delivered' => 'Completed',
                    'Received' => null,
                    default => null,
                };

                if ($shipmentStatus !== null) {
                    $shipmentFlow = ShipmentController::FLOW;

                    $currentShipmentRank = array_search(
                        $container->shipment->status,
                        $shipmentFlow,
                        true
                    );

                    $targetShipmentRank = array_search(
                        $shipmentStatus,
                        $shipmentFlow,
                        true
                    );

                    /*
                     * Advance only when the mapped status is later in FLOW.
                     * Unknown statuses and backward transitions are ignored.
                     * Equal statuses do not create duplicate events.
                     */
                    if (
                        $currentShipmentRank !== false
                        && $targetShipmentRank !== false
                        && $targetShipmentRank > $currentShipmentRank
                    ) {
                        $shipmentUpdates = [
                            'status' => $shipmentStatus,
                        ];

                        if (in_array(
                            $shipmentStatus,
                            ['Cambodia Warehouse', 'Completed'],
                            true
                        )) {
                            $shipmentUpdates['actual_arrival'] =
                                $container->shipment->actual_arrival
                                ?: now()->toDateString();
                        }

                        $container->shipment->update($shipmentUpdates);

                        ShipmentTrackingEvent::create([
                            'shipment_id' => $container->shipment->id,
                            'location' => $data['location'],
                            'status' => $shipmentStatus,
                            'event_date' => $eventDate,
                            'remarks' => $data['remarks']
                                ?? 'Container lifecycle transition',
                            'created_by' => $request->user()?->id,
                        ]);
                    }
                }
            }

            return $this->ok(
                $container->fresh()->load([
                    'shipment',
                    'packages',
                    'trackingEvents.createdBy:id,name,email,role',
                ]),
                'Container transition completed successfully'
            );
        });
    }

    /**
     * Attach packages to a container.
     */
    public function attachPackages(Request $request, $id)
    {
        $container = Container::findOrFail($id);

        if ($container->status !== 'Received at China Warehouse') {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'container' => [
                    'Packages can only be attached while the container is Received at China Warehouse.',
                ],
            ]);
        }

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

        DB::transaction(function () use ($container, $data) {
            foreach ($data['package_ids'] as $packageId) {
                $package = Package::findOrFail($packageId);

                $loadableStatuses = [
                    'Received at China Warehouse',
                    'Waiting Shipment',
                    'Loading',
                    'Departed China',
                    'In Transit',
                ];

                if (!in_array($package->status, $loadableStatuses, true)) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'package_ids' => [
                            "Package {$package->package_id} cannot be loaded because it is already at workflow stage {$package->status}.",
                        ],
                    ]);
                }

                $hasUnloadedHistory = $container->packages()
                    ->where('packages.id', $package->id)
                    ->wherePivotNotNull('unloaded_at')
                    ->exists();

                if ($hasUnloadedHistory) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'package_ids' => [
                            "Package {$package->package_id} was previously removed from this container. Use a new container to preserve its loading history.",
                        ],
                    ]);
                }

                $otherContainer = $package->containers()
                    ->where('containers.id', '!=', $container->id)
                    ->wherePivotNull('unloaded_at')
                    ->exists();

                if ($otherContainer) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'package_ids' => [
                            "Package {$package->package_id} is already loaded in another active container.",
                        ],
                    ]);
                }

               $alreadyAttached = $container->packages()
                    ->where('packages.id', $package->id)
                    ->wherePivotNull('unloaded_at')
                    ->exists();

                if (!$alreadyAttached) {
                    $container->packages()->attach($package->id, [
                        'loaded_at' => now(),
                    ]);
                }
                if (in_array(
                    $package->status,
                    ['Received at China Warehouse', 'Waiting Shipment'],
                    true
                )) {
                    $package->update([
                        'status' => 'Loading',
                    ]);

                    TrackingEvent::create([
                        'tracking_number' => $package->tracking_number,
                        'package_id' => $package->id,
                        'status' => 'Loading',
                        'location' => $container->current_location
                            ?: $container->origin
                            ?: 'China Warehouse',
                        'warehouse' => $container->current_location
                            ?: $container->origin,
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
     * Remove package from container.
     */
    public function detachPackage($id, $packageId)
    {
        $container = Container::findOrFail($id);

        $packageLink = $container->packages()
            ->where('packages.id', $packageId)
            ->wherePivotNull('unloaded_at')
            ->first();

        if (!$packageLink) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'package_id' => ['This package is not actively attached to this container.'],
            ]);
        }

        $container->packages()->updateExistingPivot($packageId, [
            'unloaded_at' => now(),
        ]);

        return $this->ok(
            null,
            'Package removed from container successfully'
        );
    }

    /**
     * Backward-compatible endpoint for container movement.
     */
    public function updateLocation(Request $request, $id)
    {
        return $this->transition($request, $id);
    }

    /**
     * Get packages inside a container.
     */
    public function packages($id)
    {
        $container = Container::findOrFail($id);

        $packages = $container->packages()
            ->wherePivotNull('unloaded_at')
            ->with('customer')
            ->orderByDesc('container_packages.id')
            ->get();

        return $this->ok([
            'items' => $packages,
            'summary' => [
                'package_count' => $packages->count(),
                'tracking_count' => $packages
                    ->whereNotNull('tracking_number')
                    ->count(),
                'product_types' => $packages
                    ->pluck('product_name')
                    ->filter()
                    ->unique()
                    ->count(),
                'total_quantity' => (int) $packages->sum(
                    fn ($p) => (int) ($p->quantity ?? 0)
                ),
                'total_cbm' => round(
                    $packages->sum(fn ($p) => (float) ($p->total_cbm ?? 0)),
                    6
                ),
                'total_weight' => round(
                    $packages->sum(fn ($p) => (float) ($p->total_weight ?? 0)),
                    3
                ),
            ],
        ], 'Container packages retrieved successfully');
    }

    /**
     * Get container timeline.
     */
    public function timeline($id)
    {
        $container = Container::findOrFail($id);

        return $this->ok(
            $container->trackingEvents()
                ->with('createdBy:id,name,email,role')
                ->get(),
            'Container timeline retrieved successfully'
        );
    }
}
