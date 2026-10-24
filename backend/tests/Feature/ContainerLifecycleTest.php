<?php

namespace Tests\Feature;

use App\Models\Container;
use App\Models\Package;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ContainerLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $user = User::create([
            'name' => 'Container Test Admin',
            'email' => 'container-test@example.com',
            'password' => Hash::make('test-password'),
            'role' => 'Admin',
        ]);

        Sanctum::actingAs($user);
    }

    private function makeContainer(
        string $status = 'Received at China Warehouse'
    ): Container {
        return Container::create([
            'container_number' => 'CONT-' . uniqid(),
            'status' => $status,
            'current_location' => 'China Warehouse',
            'origin' => 'China Warehouse',
        ]);
    }

    private function makePackage(
        string $status = 'Received at China Warehouse'
    ): Package {
        return Package::create([
            'package_id' => 'PKG-' . uniqid(),
            'tracking_number' => 'TRACK-' . uniqid(),
            'status' => $status,
        ]);
    }

    public function test_package_can_be_attached_at_china_warehouse(): void
    {
        $container = $this->makeContainer();
        $package = $this->makePackage();

        $response = $this->postJson(
            "/api/v1/containers/{$container->id}/packages",
            ['package_ids' => [$package->id]]
        );

        $response->assertSuccessful();

        $this->assertDatabaseHas('container_packages', [
            'container_id' => $container->id,
            'package_id' => $package->id,
            'unloaded_at' => null,
        ]);

        $this->assertDatabaseHas('packages', [
            'id' => $package->id,
            'status' => 'Loading',
        ]);
    }

    public function test_repeated_attach_does_not_overwrite_loaded_at(): void
    {
        $container = $this->makeContainer();
        $package = $this->makePackage();

        $loadedAt = now()->subHour()->startOfSecond();

        $container->packages()->attach($package->id, [
            'loaded_at' => $loadedAt,
        ]);

        $response = $this->postJson(
            "/api/v1/containers/{$container->id}/packages",
            ['package_ids' => [$package->id]]
        );

        $response->assertSuccessful();

        $this->assertDatabaseHas('container_packages', [
            'container_id' => $container->id,
            'package_id' => $package->id,
            'loaded_at' => $loadedAt->toDateTimeString(),
            'unloaded_at' => null,
        ]);
    }

    public function test_package_cannot_be_attached_after_container_leaves_china_warehouse(): void
    {
        $container = $this->makeContainer('The Container Finish');
        $package = $this->makePackage();

        $response = $this->postJson(
            "/api/v1/containers/{$container->id}/packages",
            ['package_ids' => [$package->id]]
        );

        $response->assertUnprocessable();

        $this->assertDatabaseMissing('container_packages', [
            'container_id' => $container->id,
            'package_id' => $package->id,
        ]);
    }

    public function test_detaching_package_preserves_pivot_history(): void
    {
        $container = $this->makeContainer();
        $package = $this->makePackage();

        $container->packages()->attach($package->id, [
            'loaded_at' => now(),
        ]);

        $response = $this->deleteJson(
            "/api/v1/containers/{$container->id}/packages/{$package->id}"
        );

        $response->assertSuccessful();

        $this->assertDatabaseHas('container_packages', [
            'container_id' => $container->id,
            'package_id' => $package->id,
        ]);

        $pivot = $container->packages()
            ->where('packages.id', $package->id)
            ->withPivot('unloaded_at')
            ->first();

        $this->assertNotNull($pivot);
        $this->assertNotNull($pivot->pivot->unloaded_at);
    }

    public function test_container_cannot_be_marked_received_before_delivered(): void
    {
        $container = $this->makeContainer('Cambodia Warehouse');

        $response = $this->postJson(
            "/api/v1/containers/{$container->id}/transition",
            [
                'status' => 'Received',
                'location' => 'Cambodia Warehouse',
            ]
        );

        $response->assertUnprocessable();

        $this->assertDatabaseHas('containers', [
            'id' => $container->id,
            'status' => 'Cambodia Warehouse',
        ]);
    }

    public function test_received_container_cannot_move_backwards(): void
    {
        $container = $this->makeContainer('Received');

        $response = $this->postJson(
            "/api/v1/containers/{$container->id}/transition",
            [
                'status' => 'Delivered',
                'location' => 'Cambodia Warehouse',
            ]
        );

        $response->assertUnprocessable();

        $this->assertDatabaseHas('containers', [
            'id' => $container->id,
            'status' => 'Received',
        ]);
    }
}
