<?php

namespace Tests\Feature;

use App\Models\Container;
use App\Models\Package;
use App\Models\User;
use App\Services\ChinaWayBillService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use Tests\TestCase;

class ChinaWayBillSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_china_waybill_sync_and_china_warehouse_receipt_keep_identifiers_separate(): void
    {
        // Authenticate an Admin in the isolated test database.
        $user = User::create([
            'name' => 'China Sync Test Admin',
            'email' => 'china-sync-test@example.com',
            'password' => Hash::make('test-password'),
            'role' => 'Super Admin',
            'is_active' => true,
        ]);

        Sanctum::actingAs($user);

        // Fake the China API response. No external API is called.
        $this->mock(
            ChinaWayBillService::class,
            function (MockInterface $mock): void {
                $mock->shouldReceive('queryAll')
                    ->once()
                    ->with(null, null, null)
                    ->andReturn([
                        'rows' => [
                            [
                                'Number' => '8899006677100',
                                'InsideNO' => 'YCL269192',
                                'CustomerNumber' => 'HFL00001',
                                'CustomerName' => 'China Sync Test Customer',
                                'GoodsName' => 'Test Package',
                                'ExpressQTY' => 1,
                                'CustomerVolume' => 0.1,
                                'shipping_mode' => 'SEA',
                                'from_warehouse' => 'China Warehouse',
                                'to_warehouse' => 'Cambodia',
                                'status' => 'Order Created',
                            ],
                        ],
                        'count' => 1,
                        'pages' => 1,
                    ]);

                $mock->shouldReceive('extractImages')
                    ->once()
                    ->andReturn([]);

                $mock->shouldReceive('isMock')
                    ->twice()
                    ->andReturn(true);
            }
        );

        // Step 1: sync the fake China waybill.
        $syncResponse = $this->postJson('/api/v1/packages/sync-china');

        $syncResponse->assertSuccessful();



        $package = Package::where(
            'china_waybill_number',
            '8899006677100'
        )->first();

        $this->assertNotNull($package);

        $this->assertSame(
            '8899006677100',
            $package->china_waybill_number
        );

        $this->assertNull(
            $package->tracking_number,
            'China waybill must not be used as the HFL tracking number.'
        );

        $this->assertSame(
            'YCL269192',
            $package->china_container_number
        );

        $container = Container::where(
            'container_number',
            'YCL269192'
        )->first();

        $this->assertNotNull($container);

        $this->assertDatabaseHas('container_packages', [
            'container_id' => $container->id,
            'package_id' => $package->id,
        ]);

        // Step 2: physically receive the package at the China warehouse.
        $receiveResponse = $this->postJson(
            "/api/v1/packages/{$package->id}/receive-china",
            [
                'warehouse_location' => 'China Warehouse',
                'note' => 'Automated SQLite test',
            ]
        );

        $receiveResponse->assertSuccessful();

        $package->refresh();

        $this->assertSame(
            'YC100200300',
            $package->tracking_number,
            'The first package in a clean SQLite test database should receive the expected HFL tracking number.'
        );

        $this->assertSame(
            '8899006677100',
            $package->china_waybill_number,
            'The original China waybill must remain unchanged after receipt.'
        );

        $this->assertSame(
            'YCL269192',
            $package->china_container_number
        );

        $this->assertDatabaseHas('container_packages', [
            'container_id' => $container->id,
            'package_id' => $package->id,
        ]);
    }
}
