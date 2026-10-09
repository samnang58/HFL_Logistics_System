<?php

namespace App\Http\Controllers;

use App\Models\Package;
use App\Models\TrackingEvent;
use Illuminate\Http\Request;

class CustomerShipmentController extends ApiController
{
    /**
     * List customer shipments.
     */
    public function index(Request $request)
    {
        $customer = $request->user();

        $filter = $request->query('filter', 'all');

        $query = Package::query()
            ->where('customer_id', $customer->customer_id);

        switch ($filter) {
            case 'china_warehouse':
                $query->whereIn('status', [
                    'China Warehouse',
                    'Received China',
                    'Warehouse Received',
                    'Received at China Warehouse',
                ]);
                break;

            case 'in_transit':
                $query->whereIn('status', [
                    'In Transit',
                    'in_transit',
                ]);
                break;

            case 'arrived_kh':
                $query->whereIn('status', [
                    'Cambodia Warehouse',
                    'Arrived Cambodia',
                    'Arrived KH',
                ]);
                break;
        }

        $packages = $query
            ->latest('updated_at')
            ->get();

        $data = $packages->map(function (Package $package) {
            return [
                'tracking_number' => $package->tracking_number,

                'status' => $package->status,
                'status_label' => $package->status,

                'service_line' => $package->shipping_mode,
                'transport_mode' => $package->shipping_mode,
                'transport_label' => $package->shipping_mode,

                'origin_country' => 'China',
                'destination_country' => 'Cambodia',

                'origin_city' => $package->from_warehouse,
                'destination_city' => $package->to_warehouse,

                'warehouse' => $package->warehouse_location,

                'received_at' => $package->received_at,
                'date' => $package->shipping_date,

                'weight_kg' => $package->total_weight,
                'volume_cbm' => $package->total_cbm,

                'current_location' =>
                    $package->warehouse_location
                    ?: $package->to_warehouse,

                'eta' => $package->eta,

                'arrived_at' =>
                    $package->actual_arrival ?? null,

                'dimensions' => $this->formatDimensions(
                    $package->boxes
                ),

                'expected_date' => $package->eta,

                'container_number' =>
                    $package->china_container_number,

                'origin_name_kh' => null,
                'destination_name_kh' => 'ភ្នំពេញ',
            ];
        });

        return $this->ok($data);
    }

    /**
     * Shipment status counts.
     */
    public function counts(Request $request)
    {
        $customer = $request->user();

        $query = Package::query()
            ->where('customer_id', $customer->customer_id);

        return $this->ok([
            'all' => (clone $query)->count(),

            'in_transit' => (clone $query)
                ->whereIn('status', [
                    'In Transit',
                    'in_transit',
                ])
                ->count(),

            'arrived_kh' => (clone $query)
                ->whereIn('status', [
                    'Cambodia Warehouse',
                    'Arrived Cambodia',
                    'Arrived KH',
                ])
                ->count(),

            'china_warehouse' => (clone $query)
                ->whereIn('status', [
                    'China Warehouse',
                    'Received China',
                    'Warehouse Received',
                    'Received at China Warehouse',
                ])
                ->count(),
        ]);
    }

    /**
     * Shipment detail.
     */
    public function show(
        Request $request,
        string $trackingNumber
    ) {
        $customer = $request->user();

        $package = Package::with([
            'customer',
            'containers',
        ])
            ->where(
                'customer_id',
                $customer->customer_id
            )
            ->where(
                'tracking_number',
                $trackingNumber
            )
            ->first();

        if (!$package) {
            return $this->fail(
                'Shipment not found',
                [],
                404
            );
        }

        $tracking = TrackingEvent::where(
            'package_id',
            $package->id
        )
            ->orderByDesc('event_at')
            ->orderByDesc('id')
            ->get();

        $container = $package->containers->first();

        $data = [
            'tracking_number' =>
                $package->tracking_number,

            'status' =>
                $package->status,

            'status_label' =>
                $package->status,

            'service_line' =>
                $package->shipping_mode,

            'transport_mode' =>
                $package->shipping_mode,

            'transport_label' =>
                $package->shipping_mode,

            'origin_country' => 'China',

            'destination_country' =>
                'Cambodia',

            'origin_city' =>
                $package->from_warehouse,

            'destination_city' =>
                $package->to_warehouse,

            'origin_name_kh' => null,

            'destination_name_kh' =>
                'ភ្នំពេញ',

            'warehouse' =>
                $package->warehouse_location,

            'current_location' =>
                $package->warehouse_location
                ?: (
                    $container?->current_location
                    ?: $package->to_warehouse
                ),

            'received_at' =>
                $package->received_at,

            'date' =>
                $package->shipping_date,

            'eta' =>
                $package->eta,

            'expected_date' =>
                $package->eta,

            'arrived_at' =>
                $package->actual_arrival
                ?? $container?->actual_arrival,

            'weight_kg' =>
                $package->total_weight,

            'volume_cbm' =>
                $package->total_cbm,

            'dimensions' =>
                $this->formatDimensions(
                    $package->boxes
                ),

            'container_number' =>
                $container?->container_number
                ?? $package->china_container_number,

            'container' =>
                $container
                    ? [
                        'container_number' =>
                            $container->container_number,

                        'container_type' =>
                            $container->container_type,

                        'status' =>
                            $container->status,

                        'current_location' =>
                            $container->current_location,

                        'origin' =>
                            $container->origin,

                        'destination' =>
                            $container->destination,

                        'departure_date' =>
                            $container->departure_date,

                        'estimated_arrival' =>
                            $container->estimated_arrival,

                        'actual_arrival' =>
                            $container->actual_arrival,
                    ]
                    : null,

            'tracking_events' =>
                $tracking
                    ->map(function ($event) {
                        return [
                            'status' =>
                                $event->status,

                            'location' =>
                                $event->location,

                            'warehouse' =>
                                $event->warehouse,

                            'note' =>
                                $event->note,

                            'event_at' =>
                                $event->event_at,
                        ];
                    })
                    ->values(),
        ];

        return $this->ok(
            $data,
            'Shipment detail retrieved successfully.'
        );
    }

    /**
     * Shipment tracking.
     *
     * This response matches the Flutter
     * TrackingInfo model and the Figma
     * 5-stage tracking UI.
     */
    public function tracking(
        Request $request,
        string $trackingNumber
    ) {
        $customer = $request->user();

        $package = Package::with('containers')
            ->where(
                'customer_id',
                $customer->customer_id
            )
            ->where(
                'tracking_number',
                $trackingNumber
            )
            ->first();

        if (!$package) {
            return $this->fail(
                'Shipment not found',
                [],
                404
            );
        }

        $events = TrackingEvent::where(
            'package_id',
            $package->id
        )
            ->orderBy('event_at')
            ->orderBy('id')
            ->get();

        $container = $package->containers->first();

        /*
         * Latest event = current tracking event.
         */
        $latestEvent = $events->last();

        $currentLocation =
            $package->warehouse_location
            ?: (
                $container?->current_location
                ?: $package->to_warehouse
            );

        /*
         * Convert backend status
         * to the Figma 5-stage tracker.
         *
         * 1 = Picked Up
         * 2 = CN Hub
         * 3 = In Transit
         * 4 = Arrived KH
         * 5 = Delivered
         */
        $stage = $this->calculateTrackingStage(
            $package->status
        );

        /*
         * Convert database tracking events
         * into Flutter TrackingEvent format.
         */
        $timeline = $events
            ->map(function ($event) {
                return [
                    'title' =>
                        $event->status,

                    'status' =>
                        $event->status,

                    'status_label' =>
                        $event->status,

                    'location' =>
                        $event->location,

                    'warehouse' =>
                        $event->warehouse,

                    'note' =>
                        $event->note,

                    'description' =>
                        $event->note,

                    'event_at' =>
                        $event->event_at,

                    'time' =>
                        $event->event_at,

                    'occurred_at' =>
                        $event->event_at,
                ];
            })
            ->values();

        return $this->ok([
            /*
             * Flutter TrackingInfo.shipment
             */
            'shipment' => [
                'tracking_number' =>
                    $package->tracking_number,

                'status' =>
                    $package->status,

                'status_label' =>
                    $package->status,

                'service_line' =>
                    $package->shipping_mode,

                'transport_mode' =>
                    $package->shipping_mode,

                'transport_label' =>
                    $package->shipping_mode,

                'origin_country' =>
                    'China',

                'destination_country' =>
                    'Cambodia',

                'origin_city' =>
                    $package->from_warehouse,

                'destination_city' =>
                    $package->to_warehouse,

                'origin_name_kh' =>
                    null,

                'destination_name_kh' =>
                    'ភ្នំពេញ',

                'warehouse' =>
                    $package->warehouse_location,

                'current_location' =>
                    $currentLocation,

                'received_at' =>
                    $package->received_at,

                'date' =>
                    $package->shipping_date,

                'weight_kg' =>
                    $package->total_weight,

                'volume_cbm' =>
                    $package->total_cbm,

                'dimensions' =>
                    $this->formatDimensions(
                        $package->boxes
                    ),

                'eta' =>
                    $package->eta,

                'expected_date' =>
                    $package->eta,

                'arrived_at' =>
                    $package->actual_arrival
                    ?? $container?->actual_arrival,

                'container_number' =>
                    $container?->container_number
                    ?? $package->china_container_number,
            ],

            /*
             * Current status banner.
             */
            'current_title' =>
                $this->trackingStageTitle(
                    $stage
                ),

            'current_description' =>
                $latestEvent?->note
                ?? $package->status,

            'current_time' =>
                $latestEvent?->event_at
                ?? $package->updated_at,

            'current_location' =>
                $currentLocation,

            /*
             * Figma 5-stage stepper.
             */
            'stage' =>
                $stage,

            'current_stage' =>
                $stage,

            'total_stages' =>
                5,

            /*
             * Tracking timeline.
             */
            'timeline' =>
                $timeline,

            /*
             * TrackingInfo.fromJson()
             * reads "events".
             */
            'events' =>
                $timeline,

            /*
             * Container information.
             */
            'container_number' =>
                $container?->container_number
                ?? $package->china_container_number,

            'container' =>
                $container
                    ? [
                        'container_number' =>
                            $container->container_number,

                        'container_type' =>
                            $container->container_type,

                        'status' =>
                            $container->status,

                        'current_location' =>
                            $container->current_location,

                        'origin' =>
                            $container->origin,

                        'destination' =>
                            $container->destination,

                        'departure_date' =>
                            $container->departure_date,

                        'estimated_arrival' =>
                            $container->estimated_arrival,

                        'actual_arrival' =>
                            $container->actual_arrival,
                    ]
                    : null,
        ], 'Shipment tracking retrieved successfully.');
    }

    /**
     * Convert backend package status
     * into Figma 5-stage tracking stage.
     */
    private function calculateTrackingStage(
        ?string $status
    ): int {
        $normalized = strtolower(
            trim((string) $status)
        );

        return match (true) {
            in_array($normalized, [
                'delivered',
                'customer received',
                'customer_received',
                'customer received',
                'completed',
            ], true) => 5,

            in_array($normalized, [
                'cambodia warehouse',
                'arrived cambodia',
                'arrived kh',
                'arrived_kh',
                'ready for delivery',
                'out for delivery',
            ], true) => 4,

            in_array($normalized, [
                'in transit',
                'in_transit',
                'consolidated',
                'loaded',
                'loading',
            ], true) => 3,

            in_array($normalized, [
                'china warehouse',
                'received china',
                'warehouse received',
                'received at china warehouse',
                'receivedat china warehouse',
                'measurement completed',
                'received_china',
            ], true) => 2,

            default => 1,
        };
    }

    /**
     * Current title for Figma tracking banner.
     */
    private function trackingStageTitle(
        int $stage
    ): string {
        return match ($stage) {
            5 => 'ប្រគល់ជូន',
            4 => 'មកដល់ខ្មែរ',
            3 => 'កំពុងដឹក',
            2 => 'ឃ្លាំងចិន',
            default => 'ប្រមូលទំនិញ',
        };
    }

    /**
     * Format package box dimensions.
     */
    private function formatDimensions(
        $boxes
    ): ?string {
        if (
            !is_array($boxes)
            || empty($boxes)
        ) {
            return null;
        }

        $box = $boxes[0] ?? null;

        if (!is_array($box)) {
            return null;
        }

        $length = $box['length'] ?? null;
        $width = $box['width'] ?? null;
        $height = $box['height'] ?? null;

        if (
            $length === null
            || $width === null
            || $height === null
        ) {
            return null;
        }

        return "{$length} × {$width} × {$height} cm";
    }
}
