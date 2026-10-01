<?php

namespace App\Http\Controllers;

use App\Models\Container;
use App\Models\ContainerTrackingEvent;
use App\Models\Customer;
use App\Models\Package;
use App\Models\PackageSyncLog;
use App\Models\Shipment;
use App\Models\TrackingEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Development-only China API sandbox.
 * It mimics the shape of an upstream China warehouse feed without touching a real carrier API.
 */
class MockChinaApiController extends ApiController
{
    /**
     * Mock API health/status endpoint.
     * This deliberately mirrors the information we need from the real China API
     * without exposing or requiring a production token.
     */
    public function status()
    {
        return $this->ok([
            'mode' => 'mock',
            'configured' => true,
            'provider' => 'HFL Mock China Warehouse API',
            'version' => 'v1',
            'base_path' => '/api/v1/china-sync/mock',
            'packages_available' => count($this->fixtureRows()),
            'containers_available' => collect($this->fixtureRows())->pluck('InsideNO')->unique()->count(),
            'auth_required' => false,
            'production_ready' => false,
        ], 'Mock China API is ready for testing');
    }

    public function data(Request $request)
    {
        $rows = collect($this->fixtureRows());

        if ($tracking = trim((string) $request->input('tracking'))) {
            $rows = $rows->filter(fn ($row) => strcasecmp($row['Number'], $tracking) === 0);
        }

        if ($container = trim((string) $request->input('container'))) {
            $rows = $rows->filter(fn ($row) => strcasecmp($row['InsideNO'], $container) === 0);
        }

        return $this->ok([
            'items' => $rows->values()->all(),
            'meta' => [
                'total' => $rows->count(),
                'source' => 'mock',
                'generated_at' => now()->toIso8601String(),
            ],
        ], 'Mock China API data');
    }

    public function packages(Request $request)
    {
        $rows = collect($this->fixtureRows());

        if ($tracking = trim((string) $request->input('tracking'))) {
            $rows = $rows->filter(fn ($row) => strcasecmp($row['Number'], $tracking) === 0);
        }

        return $this->ok([
            'items' => $rows->values()->all(),
            'meta' => [
                'total' => $rows->count(),
                'source' => 'mock',
            ],
        ], 'Mock China API packages');
    }

    public function package(string $tracking)
    {
        $row = collect($this->fixtureRows())
            ->first(fn ($item) => strcasecmp($item['Number'], trim($tracking)) === 0);

        if (!$row) {
            return response()->json([
                'success' => false,
                'message' => 'Mock tracking number not found.',
                'tracking_number' => $tracking,
            ], 404);
        }

        return $this->ok($row, 'Mock China API package');
    }

    public function containers()
    {
        $rows = collect($this->fixtureRows())
            ->groupBy('InsideNO')
            ->map(function ($items, $number) {
                $first = $items->first();

                return [
                    'container_number' => $number,
                    'shipment_number' => $first['ShipmentNumber'],
                    'origin' => 'China',
                    'destination' => 'Cambodia',
                    'warehouse' => $first['Warehouse'],
                    'current_location' => $first['CurrentLocation'],
                    'status' => $first['Status'],
                    'departure_date' => $first['DepartureDate'],
                    'eta' => $first['ETA'],
                    'package_count' => $items->count(),
                    'tracking_count' => $items->whereNotNull('Number')->count(),
                    'total_cbm' => round($items->sum('CBM'), 4),
                    'total_weight_kg' => round($items->sum('WeightKG'), 2),
                ];
            })->values();

        return $this->ok([
            'items' => $rows,
            'meta' => ['total' => $rows->count(), 'source' => 'mock'],
        ], 'Mock China API containers');
    }

    public function container(string $container)
    {
        $items = collect($this->fixtureRows())
            ->filter(fn ($row) => strcasecmp($row['InsideNO'], trim($container)) === 0)
            ->values();

        if ($items->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Mock container not found.',
                'container_number' => $container,
            ], 404);
        }

        $first = $items->first();

        return $this->ok([
            'container' => [
                'container_number' => $first['InsideNO'],
                'shipment_number' => $first['ShipmentNumber'],
                'origin' => 'China',
                'destination' => 'Cambodia',
                'warehouse' => $first['Warehouse'],
                'current_location' => $first['CurrentLocation'],
                'status' => $first['Status'],
                'departure_date' => $first['DepartureDate'],
                'eta' => $first['ETA'],
                'package_count' => $items->count(),
                'tracking_count' => $items->whereNotNull('Number')->count(),
                'total_cbm' => round($items->sum('CBM'), 4),
                'total_weight_kg' => round($items->sum('WeightKG'), 2),
            ],
            'packages' => $items->all(),
            'meta' => ['source' => 'mock'],
        ], 'Mock China API container');
    }


    public function sync(Request $request)
    {
        $rows = $this->fixtureRows();
        $created = $updated = $containersCreated = $attached = 0;
        $started = now();

        DB::transaction(function () use ($rows, &$created, &$updated, &$containersCreated, &$attached) {
            $containers = [];
            foreach ($rows as $row) {
                $customer = Customer::firstOrCreate(
                    ['customer_id' => $row['CustomerNumber']],
                    [
                        'username' => $row['CustomerNumber'],
                        'full_name' => $row['CustomerName'],
                        'company_name' => $row['CustomerName'],
                        'phone' => $row['Phone'],
                        'status' => 'Active',
                        'registration_date' => now()->toDateString(),
                    ]
                );

                if (!isset($containers[$row['InsideNO']])) {
                    $shipment = Shipment::firstOrCreate(
                        ['shipment_number' => $row['ShipmentNumber']],
                        [
                            'origin' => 'China',
                            'destination' => 'Cambodia',
                            'shipping_mode' => 'SEA',
                            'container_number' => $row['InsideNO'],
                            'departure_date' => $row['DepartureDate'],
                            'eta' => $row['ETA'],
                            'status' => $this->normalizeLifecycleStatus($row['Status']),
                            'package_ids' => json_encode([]),
                            'package_count' => 0,
                            'total_cbm' => 0,
                            'total_weight' => 0,
                        ]
                    );
                    $container = Container::firstOrCreate(
                        ['container_number' => $row['InsideNO']],
                        [
                            'shipment_id' => $shipment->id,
                            'container_type' => '40HQ',
                            'seal_number' => 'HFL-SEAL-' . substr($row['InsideNO'], -6),
                            'shipping_mode' => 'SEA',
                            'origin' => 'Guangzhou, China',
                            'destination' => 'Phnom Penh, Cambodia',
                            'current_location' => $row['CurrentLocation'],
                            'status' => $this->normalizeLifecycleStatus($row['Status']),
                            'departure_date' => $row['DepartureDate'],
                            'estimated_arrival' => $row['ETA'],
                            'notes' => 'MOCK API TEST CONTAINER',
                        ]
                    );
                    if ($container->wasRecentlyCreated) {
                        $containersCreated++;
                        $events = [
                            ['location' => 'Guangzhou Warehouse', 'status' => 'RECEIVED_CHINA', 'event_date' => Carbon::parse($row['DepartureDate'])->subDays(2)],
                            ['location' => 'Guangzhou Port', 'status' => 'LOADED', 'event_date' => Carbon::parse($row['DepartureDate'])->subDay()],
                            ['location' => $row['CurrentLocation'], 'status' => $this->normalizeLifecycleStatus($row['Status']), 'event_date' => now()],
                        ];
                        foreach ($events as $event) {
                            ContainerTrackingEvent::create($event + ['container_id' => $container->id, 'remarks' => 'Mock China API event']);
                        }
                    }
                    $containers[$row['InsideNO']] = $container;
                }

                $container = $containers[$row['InsideNO']];
                $package = Package::where('china_waybill_number', $row['Number'])
                    ->orWhere('tracking_number', $row['Number'])
                    ->first();
                $payload = [
                    'code' => 'MOCK-' . $row['Number'],
                    // China Number is the original delivery/courier tracking.
                    // HFL tracking is generated only after physical China receipt.
                    'tracking_number' => $package?->tracking_number,
                    'china_waybill_number' => $row['Number'],
                    'china_container_number' => $row['InsideNO'],
                    'customer_id' => $customer->customer_id,
                    'customer_name' => $customer->full_name,
                    'supplier' => $row['Supplier'],
                    'product_name' => $row['GoodsName'],
                    'product_category' => 'General Goods',
                    'quantity' => $row['Quantity'],
                    'shipping_mode' => 'SEA',
                    'pricing_type' => 'GC',
                    'from_warehouse' => $row['Warehouse'],
                    'to_warehouse' => 'Phnom Penh Warehouse',
                    'status' => $this->normalizeLifecycleStatus($row['Status']),
                    'shipping_date' => $row['DepartureDate'],
                    'eta' => $row['ETA'],
                    'boxes' => [['length' => 50, 'width' => 40, 'height' => 30, 'quantity' => $row['Quantity']]],
                    'total_cbm' => $row['CBM'],
                    'total_weight' => $row['WeightKG'],
                    'box_count' => $row['Quantity'],
                    'warehouse_location' => $row['CurrentLocation'],
                    'received_at' => Carbon::parse($row['ReceivedAt']),
                    'shipping_rate' => 165,
                    'shipping_cost' => round($row['CBM'] * 165, 2),
                    'grand_total' => round($row['CBM'] * 165, 2),
                    'product_images' => $row['Images'] ?? [],
                ];

                if ($package) {
                    if (str_starts_with((string) $package->package_id, 'HFL-PKG-')) {
                        $package->package_id = 'PKG-' . str_pad((string) $package->id, 6, '0', STR_PAD_LEFT);
                        $package->save();
                    }
                    $package->update($payload);
                    $updated++;
                } else {
                    $number = Package::count() + 1;
                    $payload['package_id'] = 'PKG-' . str_pad((string) $number, 6, '0', STR_PAD_LEFT);
                    $package = Package::create($payload);
                    TrackingEvent::create([
                        'tracking_number' => $package->tracking_number ?: $package->china_waybill_number,
                        'package_id' => $package->id,
                        'status' => 'RECEIVED_CHINA',
                        'location' => $row['Warehouse'],
                        'warehouse' => $row['Warehouse'] . ' China Warehouse',
                        'staff_name' => 'Mock China API',
                        'note' => 'Imported from MOCK China API',
                        'event_at' => Carbon::parse($row['ReceivedAt']),
                    ]);
                    TrackingEvent::create([
                        'tracking_number' => $package->tracking_number ?: $package->china_waybill_number,
                        'package_id' => $package->id,
                        'status' => $this->normalizeLifecycleStatus($row['Status']),
                        'location' => $row['CurrentLocation'],
                        'warehouse' => $row['Warehouse'] . ' China Warehouse',
                        'staff_name' => 'Mock China API',
                        'note' => 'Mock current movement',
                        'event_at' => now(),
                    ]);
                    $created++;
                }

                if (!$container->packages()->where('packages.id', $package->id)->exists()) {
                    $container->packages()->attach($package->id, ['loaded_at' => Carbon::parse($row['DepartureDate'])]);
                    $attached++;
                }

                $shipment = $container->shipment;
                $existingIds = is_array($shipment?->package_ids) ? $shipment->package_ids : (json_decode((string) ($shipment?->package_ids ?? '[]'), true) ?: []);
                $ids = collect($existingIds)->push($package->id)->unique()->values()->all();
                if ($shipment) {
                    $shipment->update([
                        'package_ids' => json_encode($ids),
                        'package_count' => count($ids),
                        'total_cbm' => round($container->packages()->sum('total_cbm'), 4),
                        'total_weight' => round($container->packages()->sum('total_weight'), 3),
                    ]);
                }
            }
        });

        PackageSyncLog::create([
            'source' => 'mock_china_api',
            'status' => 'success',
            'received' => count($rows),
            'created_count' => $created,
            'updated_count' => $updated,
            'duplicate_count' => $updated,
            'failed_count' => 0,
            'containers_created' => $containersCreated,
            'packages_attached' => $attached,
            'message' => 'Mock China API: 50 packages / 5 containers synchronized.',
            'synced_at' => $started,
        ]);

        return $this->ok([
            'received' => count($rows),
            'created' => $created,
            'updated' => $updated,
            'containers_created' => $containersCreated,
            'packages_attached' => $attached,
            'mode' => 'mock',
            'synced_at' => $started,
        ], 'Mock China API sync completed');
    }

    private function normalizeLifecycleStatus(?string $status): string
    {
        return match (strtoupper(trim((string) $status))) {
            'PENDING' => 'Pending',
            'LOADING' => 'Loading',
            'DEPARTED CHINA', 'DEPARTED_CHINA' => 'Departed China',
            'IN TRANSIT', 'IN_TRANSIT' => 'In Transit',
            'CAMBODIA PORT', 'ARRIVED_CAMBODIA', 'ARRIVED CAMBODIA' => 'Cambodia Port',
            'CUSTOMS' => 'Customs',
            'CAMBODIA WAREHOUSE', 'RECEIVED_CAMBODIA', 'RECEIVED CAMBODIA' => 'Cambodia Warehouse',
            'DELIVERED', 'COMPLETED' => 'Delivered',
            default => 'Pending',
        };
    }

    private function fixtureRows(): array
    {
        $containers = [
            ['no' => 'YCL269191', 'shipment' => 'HFL-SHP-00001', 'loc' => 'Guangzhou Port', 'status' => 'IN_TRANSIT', 'eta' => '2026-09-27', 'departure' => '2026-09-20', 'warehouse' => 'Guangzhou'],
            ['no' => 'YCL269192', 'shipment' => 'HFL-SHP-00002', 'loc' => 'South China Sea', 'status' => 'IN_TRANSIT', 'eta' => '2026-09-28', 'departure' => '2026-09-21', 'warehouse' => 'Foshan'],
            ['no' => 'YCL269193', 'shipment' => 'HFL-SHP-00003', 'loc' => 'Yiwu Warehouse', 'status' => 'LOADING', 'eta' => '2026-10-01', 'departure' => '2026-09-24', 'warehouse' => 'Yiwu'],
            ['no' => 'YCL269194', 'shipment' => 'HFL-SHP-00004', 'loc' => 'Phnom Penh Port', 'status' => 'ARRIVED_CAMBODIA', 'eta' => '2026-09-22', 'departure' => '2026-09-14', 'warehouse' => 'Guangzhou'],
            ['no' => 'YCL269195', 'shipment' => 'HFL-SHP-00005', 'loc' => 'Cambodia Warehouse', 'status' => 'RECEIVED_CAMBODIA', 'eta' => '2026-09-21', 'departure' => '2026-09-12', 'warehouse' => 'Foshan'],
        ];
        $goods = ['Shoes', 'Phone Accessories', 'Kitchen Tools', 'Clothing', 'LED Lights', 'Cosmetics Packaging', 'Toys', 'Home Decor', 'Auto Parts', 'Electronics'];
        $imageHost = rtrim(request()->getSchemeAndHttpHost(), '/') . '/api/v1/mock-china/image/';
        $rows = [];
        for ($i = 1; $i <= 50; $i++) {
            $c = $containers[($i - 1) % 5];
            $n = str_pad((string) $i, 4, '0', STR_PAD_LEFT);
            $rows[] = [
                'Number' => '777777777' . str_pad((string) $i, 3, '0', STR_PAD_LEFT),
                'InsideNO' => $c['no'],
                'CustomerNumber' => 'HFL' . str_pad((string) (((int) ceil($i / 5))), 5, '0', STR_PAD_LEFT),
                'CustomerName' => 'Mock Customer ' . (((int) ceil($i / 5))),
                'Phone' => '012' . str_pad((string) (1000000 + $i), 7, '0', STR_PAD_LEFT),
                'Supplier' => 'China Supplier ' . (($i % 10) + 1),
                'GoodsName' => $goods[($i - 1) % count($goods)],
                'Quantity' => (($i - 1) % 4) + 1,
                'WeightKG' => round(4.5 + (($i * 1.73) % 35), 2),
                'CBM' => round(0.06 + fmod($i * 0.037, 0.62), 4),
                'Warehouse' => $c['warehouse'],
                'CurrentLocation' => $c['loc'],
                'Status' => $c['status'],
                'ETA' => $c['eta'],
                'DepartureDate' => $c['departure'],
                'ReceivedAt' => Carbon::parse($c['departure'])->subDays(2)->toDateTimeString(),
                'ShipmentNumber' => $c['shipment'],
                // Fake product photos (generated SVGs served by MockWayBillApiController).
                'Images' => $i % 2 === 0
                    ? [$imageHost . $i . '.svg', $imageHost . ($i + 1) . '.svg']
                    : [$imageHost . $i . '.svg'],
            ];
        }
        return $rows;
    }
}
