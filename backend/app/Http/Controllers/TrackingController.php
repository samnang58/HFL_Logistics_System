<?php

namespace App\Http\Controllers;

use App\Models\Package;
use App\Models\TrackingEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TrackingController extends ApiController
{
    public function search(Request $r)
    {
        $q = trim((string) $r->input('q', ''));

        if ($q === '') {
            return $this->ok([
                'packages' => [],
                'containers' => [],
            ]);
        }

        $packages = Package::with([
            'customer',
            'containers.shipment',
        ])
        ->where(function ($x) use ($q) {
            foreach ([
                'package_id',
                'code',
                'tracking_number',
                'china_waybill_number',
                'hfl_package_code',
                'china_container_number',
                'customer_id',
                'customer_name',
                'product_name',
            ] as $c) {
                $x->orWhere($c, 'like', '%' . $q . '%');
            }

            $x->orWhereHas('customer', function ($customer) use ($q) {
                $customer->where('phone', 'like', '%' . $q . '%')
                    ->orWhere('full_name', 'like', '%' . $q . '%')
                    ->orWhere('customer_id', 'like', '%' . $q . '%');
            });

            $x->orWhereHas('containers', function ($container) use ($q) {
                $container->where(
                    'container_number',
                    'like',
                    '%' . $q . '%'
                )->orWhereHas('shipment', function ($shipment) use ($q) {
                    $shipment->where(
                        'shipment_number',
                        'like',
                        '%' . $q . '%'
                    );
                });
            });
        })
        ->limit(20)
        ->get();

        $containers = \App\Models\Container::with([
            'shipment',
            'packages.customer',
            'trackingEvents.createdBy:id,name,email,role',
        ])
        ->where(function ($x) use ($q) {
            foreach ([
                'container_number',
                'seal_number',
                'current_location',
                'status',
            ] as $c) {
                $x->orWhere($c, 'like', '%' . $q . '%');
            }

            // A package can be the user's search target. Return its
            // container too, without ambiguous package_id columns.
            $x->orWhereHas('packages', function ($package) use ($q) {
                // IMPORTANT: this is a belongsToMany relationship that joins
                // packages with container_packages. Both tables can expose
                // package_id, so every package search column MUST be qualified
                // with the packages table to avoid MySQL 1052 ambiguity.
                foreach ([
                    'package_id',
                    'code',
                    'tracking_number',
                    'china_waybill_number',
                    'hfl_package_code',
                    'china_container_number',
                ] as $c) {
                    $package->orWhere(
                        'packages.' . $c,
                        'like',
                        '%' . $q . '%'
                    );
                }
            });
        })
        ->limit(20)
        ->get();

        $containers->each(function ($c) {
            $c->setAttribute(
                'package_count',
                $c->packages->count()
            );

            $c->setAttribute(
                'tracking_count',
                $c->packages
                    ->whereNotNull('tracking_number')
                    ->count()
            );

            $c->setAttribute(
                'total_cbm',
                round($c->packages->sum('total_cbm'), 4)
            );

            $c->setAttribute(
                'total_weight',
                round($c->packages->sum('total_weight'), 3)
            );

            // 04. Containers is the source of truth for movement. The 06.
            // Tracking search result must therefore expose the latest container
            // movement instead of stale denormalized container columns.
            $latest = $c->trackingEvents->sortBy(function ($event) {
                return [$event->event_date, $event->id];
            })->last();

            if ($latest) {
                $c->setAttribute('current_location', $latest->location);
                $c->setAttribute('status', $latest->status);
                $c->setAttribute('latest_movement', [
                    'id' => $latest->id,
                    'status' => $latest->status,
                    'location' => $latest->location,
                    'event_date' => $latest->event_date?->toISOString(),
                    'remarks' => $latest->remarks,
                    'staff_name' => $latest->createdBy?->name ?? 'Operations',
                ]);
                $c->setAttribute('movement_events', $c->trackingEvents
                    ->sortBy(function ($event) {
                        return [$event->event_date, $event->id];
                    })
                    ->values()
                    ->map(function ($event) {
                        return [
                            'id' => $event->id,
                            'status' => $event->status,
                            'location' => $event->location,
                            'event_date' => $event->event_date?->toISOString(),
                            'remarks' => $event->remarks,
                            'staff_name' => $event->createdBy?->name ?? 'Operations',
                        ];
                    }));
            }
        });

        return $this->ok([
            'packages' => $packages,
            'containers' => $containers,
        ]);
    }

    public function show($tracking)
    {
        $package = Package::with([
            'customer',
            'containers.shipment',
            'containers.trackingEvents.createdBy:id,name,email,role',
        ])
        ->where(function ($q) use ($tracking) {
            $q->where('tracking_number', $tracking)
                ->orWhere('china_waybill_number', $tracking)
                ->orWhere('hfl_package_code', $tracking)
                ->orWhere('china_container_number', $tracking)
                ->orWhere('package_id', $tracking)
                ->orWhere('code', $tracking);
        })
        ->first();

        if (!$package) {
            return $this->ok([
                'package' => null,
                'events' => [],
                'container_number' => null,
                'shipment_number' => null,
            ]);
        }

        $trackingNumber = $package->tracking_number ?? $tracking;

        $packageEvents = TrackingEvent::where(function ($query) use ($trackingNumber, $package) {
            $query->where('tracking_number', $trackingNumber)
                ->orWhere('package_id', $package->id);
        })
        ->orderBy('event_at')
        ->orderBy('id')
        ->get();

        $container = $package->containers
            ->first(function ($container) {
                return is_null(
                    $container->pivot?->unloaded_at
                );
            })
            ?? $package->containers->first();

        // Legacy/imported records may have the China container number on the
        // package but be missing the container_packages pivot row. Fall back
        // to that identifier so tracking still shows the real container.
        if (!$container && !empty($package->china_container_number)) {
            $container = \App\Models\Container::with('shipment')
                ->where('container_number', $package->china_container_number)
                ->first();
        }

        $shipment = $container?->shipment;

        // 04. Containers is the single source of truth for transport movement.
        // 06. Tracking is a read-only view of that movement. Use the latest
        // container event for the current location/status and the container
        // timeline for transport milestones. Keep package-only events that
        // happen after the container timeline (billing/delivery/POD).
        $containerEvents = $container?->trackingEvents
            ? $container->trackingEvents->sortBy(function ($event) {
                return [$event->event_date, $event->id];
            })->values()
            : collect();

        $latestContainerEvent = $containerEvents->last();
       $containerStatuses = [
            'Received at China Warehouse',
            'The Container Finish',
            'Customs declaration in progress',
            'Under inspection',
            'Customs Clearance cleared',
            'Cambodia Warehouse',
            'Delivered',
            'Received',
        ];

        $packageTransportStatuses = [
            'Received at China Warehouse',
            'Waiting Shipment',
            'Loading',
            'Departed China',
            'In Transit',
            'Cambodia Port',
            'Customs',
            'Arrived Cambodia',
            'Cambodia Warehouse',
        ];

        $containerEventKeys = $containerEvents->map(function ($event) {
            return implode('|', [
                (string) $event->status,
                (string) $event->location,
                optional($event->event_date)->format('Y-m-d H:i:s'),
            ]);
        })->flip();

        $postContainerPackageEvents = $packageEvents->filter(function ($event) use ($containerEvents) {
            if ($containerEvents->isEmpty() || !$containerEvents->last()->event_date || !$event->event_at) {
                return true;
            }

            $packageEventAt = $event->event_at instanceof \Carbon\CarbonInterface
                ? $event->event_at
                : \Carbon\Carbon::parse($event->event_at);
            $containerEventAt = $containerEvents->last()->event_date instanceof \Carbon\CarbonInterface
                ? $containerEvents->last()->event_date
                : \Carbon\Carbon::parse($containerEvents->last()->event_date);

            // Package movement appears in the timeline only if newer than
            // the latest container movement. Other package events follow
            // the same chronological rule.
            return $packageEventAt->gt($containerEventAt);
        });

        $events = $containerEvents->map(function ($event) {
            return [
                'id' => 'container-' . $event->id,
                'status' => $event->status,
                'location' => $event->location,
                'warehouse' => $event->location,
                'staff_name' => $event->createdBy?->name ?? 'Operations',
                'note' => $event->remarks,
                'event_at' => optional($event->event_date)->toISOString(),
                'source' => 'container',
                'container_number' => $event->container?->container_number,
            ];
        })->concat($postContainerPackageEvents->map(function ($event) {
            return [
                'id' => 'package-' . $event->id,
                'status' => $event->status,
                'location' => $event->location,
                'warehouse' => $event->warehouse,
                'staff_name' => $event->staff_name,
                'note' => $event->note,
                'event_at' => optional($event->event_at)->toISOString(),
                'source' => 'package',
            ];
        }))->sortBy('event_at')->values();

        // Prefer the latest recorded Container Movement event so existing
        // containers also display the same state in Tracking even if an older
        // denormalized current_location/status column was not refreshed.
        $containerStatus = $latestContainerEvent?->status ?: $container?->status;
        $containerLocation = $latestContainerEvent?->location ?: $container?->current_location;
        $containerUpdatedAt = $latestContainerEvent?->event_date;

        $package->setAttribute(
            'container_number',
            $container?->container_number
        );

        $package->setAttribute(
            'shipment_number',
            $shipment?->shipment_number
        );

        // These fields are consumed by 06. Tracking so its summary always
        // reflects the latest movement from 04. Containers.
        $latestPackageTransportEvent = $packageEvents
            ->filter(function ($event) use ($packageTransportStatuses) {
                return in_array(
                    (string) $event->status,
                    $packageTransportStatuses,
                    true
                );
            })
            ->last();

        $packageMovementIsLatest = false;
        if ($latestPackageTransportEvent) {
            if (!$latestContainerEvent || !$latestContainerEvent->event_date) {
                $packageMovementIsLatest = true;
            } elseif ($latestPackageTransportEvent->event_at) {
                $packageMovementAt = $latestPackageTransportEvent->event_at instanceof \Carbon\CarbonInterface
                    ? $latestPackageTransportEvent->event_at
                    : \Carbon\Carbon::parse($latestPackageTransportEvent->event_at);
                $containerMovementAt = $latestContainerEvent->event_date instanceof \Carbon\CarbonInterface
                    ? $latestContainerEvent->event_date
                    : \Carbon\Carbon::parse($latestContainerEvent->event_date);

                $packageMovementIsLatest = $packageMovementAt->gt($containerMovementAt);
            }
        }

        $package->setAttribute('container_status', $containerStatus);
        $package->setAttribute('container_current_location', $containerLocation);
        $package->setAttribute('container_updated_at', $containerUpdatedAt?->toISOString());
        $containerTrackingStatusMap = [
            'Received at China Warehouse' => 'Received at China Warehouse',
            'The Container Finish' => 'Loading',
            'Customs declaration in progress' => 'Customs',
            'Under inspection' => 'Customs',
            'Customs Clearance cleared' => 'Cambodia Port',
            'Cambodia Warehouse' => 'Cambodia Warehouse',
            'Delivered' => 'Delivered',
        ];


        $effectiveContainerTrackingStatus = null;
        $effectiveContainerTrackingLocation = null;

        foreach ($containerEvents->reverse() as $event) {
            if ($event->status === 'Received') {
                continue;
            }

            if (isset($containerTrackingStatusMap[$event->status])) {
                $effectiveContainerTrackingStatus =
                    $containerTrackingStatusMap[$event->status];

                $effectiveContainerTrackingLocation = $event->location;
                break;
            }
        }

        $trackingStatus = $packageMovementIsLatest
            ? $latestPackageTransportEvent->status
            : (
                $containerStatus === 'Received'
                    ? ($effectiveContainerTrackingStatus ?: $package->status)
                    : ($containerTrackingStatusMap[$containerStatus] ?? $package->status)
            );

        $package->setAttribute('tracking_status', $trackingStatus);

        $trackingLocation = $packageMovementIsLatest
            ? $latestPackageTransportEvent->location
            : (
                $containerStatus === 'Received'
                    ? (
                        $effectiveContainerTrackingLocation
                        ?: $package->warehouse_location
                    )
                    : (
                        $containerLocation
                        ?: $package->warehouse_location
                    )
            );

        $package->setAttribute('tracking_location', $trackingLocation);


        return $this->ok([
            'package' => $package,
            'events' => $events,
            'container_number' => $container?->container_number,
            'shipment_number' => $shipment?->shipment_number,
            'container' => $container ? [
                'id' => $container->id,
                'container_number' => $container->container_number,
                'status' => $containerStatus,
                'current_location' => $containerLocation,
                'shipment_number' => $shipment?->shipment_number,
                'estimated_arrival' => $container->estimated_arrival?->toDateString(),
                'actual_arrival' => $container->actual_arrival?->toDateString(),
            ] : null,
            'latest_container_movement' => $latestContainerEvent ? [
                'status' => $latestContainerEvent->status,
                'location' => $latestContainerEvent->location,
                'event_date' => $latestContainerEvent->event_date?->toISOString(),
                'remarks' => $latestContainerEvent->remarks,
            ] : null,
        ]);
    }

    public function store(Request $r)
    {
        $data = $r->validate([
            'tracking_number' => 'required|string',
            'package_id' => 'required',
            'status' => 'required|string',
            'location' => 'nullable|string',
            'warehouse' => 'nullable|string',
            'staff_name' => 'nullable|string',
            'note' => 'nullable|string',
            'photo' => 'nullable|string',
            'event_at' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($data) {
            $package = Package::findOrFail($data['package_id']);

            if ($package->tracking_number !== $data['tracking_number']) {
                abort(422, 'Tracking number does not match package.');
            }

            $statusAliases = [
                'CREATED' => 'Order Created',
                'RECEIVED_CHINA' => 'Received at China Warehouse',
                'SCANNED' => 'Received at China Warehouse',
                'STORED' => 'Cambodia Warehouse',
                'LOADED' => 'Loading',
                'DEPARTED_CHINA' => 'Departed China',
                'IN_TRANSIT' => 'In Transit',
                'ARRIVED_CAMBODIA' => 'Arrived Cambodia',
                'RECEIVED_CAMBODIA' => 'Cambodia Warehouse',
                'READY_FOR_DELIVERY' => 'Ready for Delivery',
                'OUT_FOR_DELIVERY' => 'Out for Delivery',
                'DELIVERED' => 'Delivered',
                'FAILED_DELIVERY' => 'Problem / Exception',
                'RETURNED' => 'Returned',
            ];
            $status = $statusAliases[$data['status']] ?? $data['status'];

            $allowed = [
                'Order Created' => ['Received at China Warehouse', 'Problem / Exception', 'Cancelled'],
                'Received at China Warehouse' => ['Loading', 'Problem / Exception', 'Cancelled'],
                'Loading' => ['Departed China', 'Problem / Exception'],
                'Departed China' => ['In Transit', 'Problem / Exception'],
                'In Transit' => ['Arrived Cambodia', 'Problem / Exception'],
                'Arrived Cambodia' => ['Customs', 'Cambodia Warehouse', 'Problem / Exception'],
                'Customs' => ['Cambodia Warehouse', 'Problem / Exception'],
                'Cambodia Warehouse' => ['Measurement Completed', 'Problem / Exception'],
                'Measurement Completed' => ['Ready for Billing', 'Problem / Exception'],
                'Ready for Billing' => ['Invoiced', 'Problem / Exception'],
                'Invoiced' => ['Partially Paid', 'Ready for Delivery', 'Problem / Exception'],
                'Partially Paid' => ['Ready for Delivery', 'Problem / Exception'],
                'Ready for Delivery' => ['Scheduled', 'Problem / Exception'],
                'Scheduled' => ['Out for Delivery', 'Cancelled', 'Problem / Exception'],
                'Out for Delivery' => ['Delivered', 'Returned', 'Problem / Exception'],
                'Delivered' => [],
                'Customer Received' => [],
                'Problem / Exception' => ['Scheduled', 'Cambodia Warehouse', 'Cancelled'],
                'Returned' => [],
                'Cancelled' => [],
            ];

            // Manual tracking can record a measurement edit without changing the
            // package lifecycle. Customer Received is intentionally controlled by
            // the dedicated delivery confirmation endpoint.
            if ($status === 'Customer Received') {
                abort(422, 'Customer Received must be confirmed through the delivery workflow.');
            }

            $currentStatus = (string) ($package->status ?: 'Order Created');
            $isSameStatus = $status === $currentStatus;
            $isInformational = $status === 'Measurement Updated';

            if (!$isSameStatus && !$isInformational && !in_array($status, $allowed[$currentStatus] ?? [], true)) {
                abort(422, "Invalid package tracking transition: {$currentStatus} → {$status}.");
            }

            $event = TrackingEvent::create([
                'tracking_number' => $package->tracking_number,
                'package_id' => $package->id,
                'status' => $status,
                'location' => $data['location'] ?? $package->warehouse_location,
                'warehouse' => $data['warehouse'] ?? null,
                'staff_name' => $data['staff_name'] ?? auth()->user()?->name ?? 'Operations',
                'note' => $data['note'] ?? null,
                'photo' => $data['photo'] ?? null,
                'event_at' => $data['event_at'] ?? now(),
            ]);

            if (!$isSameStatus && !$isInformational) {
                $package->update([
                    'status' => $status,
                    'warehouse_location' => $data['location'] ?? $package->warehouse_location,
                ]);
            } elseif ($data['location'] ?? null) {
                $package->update(['warehouse_location' => $data['location']]);
            }

            return $this->ok($event, 'Tracking event created');
        });
    }
}
