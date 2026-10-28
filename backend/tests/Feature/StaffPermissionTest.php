<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StaffPermissionTest extends TestCase
{
    use RefreshDatabase;

    private function makeStaff(
        string $role = 'Sales',
        array $permissions = [],
        bool $active = true
    ): User {
        return User::create([
            'name' => 'Security Test Staff',
            'email' => uniqid('security-test-') . '@example.com',
            'password' => bcrypt('test-password-123'),
            'role' => $role,
            'permissions' => $permissions,
            'is_active' => $active,
        ]);
    }

    public function test_guest_cannot_access_dashboard(): void
    {
        $this->getJson('/api/v1/dashboard')
            ->assertStatus(401);
    }

    public function test_staff_without_permission_gets_403(): void
    {
        Sanctum::actingAs($this->makeStaff());

        $this->getJson('/api/v1/dashboard')
            ->assertStatus(403);
    }

    public function test_staff_with_permission_passes_authorization(): void
    {
        Sanctum::actingAs(
            $this->makeStaff('Sales', ['dashboard.view'])
        );

        $response = $this->getJson('/api/v1/dashboard');

        $this->assertNotEquals(401, $response->status());
        $this->assertNotEquals(403, $response->status());
    }

    public function test_inactive_staff_gets_403(): void
    {
        Sanctum::actingAs(
            $this->makeStaff('Sales', ['dashboard.view'], false)
        );

        $this->getJson('/api/v1/dashboard')
            ->assertStatus(403);
    }

    public function test_super_admin_passes_permission_check(): void
    {
        Sanctum::actingAs(
            $this->makeStaff('Super Admin')
        );

        $response = $this->getJson('/api/v1/dashboard');

        $this->assertNotEquals(401, $response->status());
        $this->assertNotEquals(403, $response->status());
    }

    public function test_regular_staff_cannot_access_staff_management(): void
    {
        Sanctum::actingAs(
            $this->makeStaff('Admin', ['dashboard.view'])
        );

        $this->getJson('/api/v1/users')
            ->assertStatus(403);
    }
}