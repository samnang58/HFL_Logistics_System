<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CashManagementSecurityTest extends TestCase
{
    use RefreshDatabase;

    private function makeStaff(
        string $role = 'Staff',
        array $permissions = [],
        bool $active = true
    ): User {
        return User::create([
            'name' => 'Cash Security Test Staff',
            'email' => uniqid('cash-security-') . '@example.com',
            'password' => bcrypt('test-password-123'),
            'role' => $role,
            'permissions' => $permissions,
            'is_active' => $active,
        ]);
    }

    public function test_guest_cannot_view_cash_accounts(): void
    {
        $this->getJson('/api/v1/cash/accounts')
            ->assertStatus(401);
    }

    public function test_guest_cannot_create_cash_transaction(): void
    {
        $this->postJson('/api/v1/cash/transactions', [])
            ->assertStatus(401);
    }

    public function test_staff_without_cash_view_gets_403(): void
    {
        Sanctum::actingAs($this->makeStaff());

        $this->getJson('/api/v1/cash/accounts')
            ->assertStatus(403);
    }

    public function test_staff_with_cash_view_can_access_accounts(): void
    {
        Sanctum::actingAs(
            $this->makeStaff('Staff', ['cash.view'])
        );

        $this->getJson('/api/v1/cash/accounts')
            ->assertStatus(200);
    }

    public function test_staff_with_only_cash_view_cannot_create_transaction(): void
    {
        Sanctum::actingAs(
            $this->makeStaff('Staff', ['cash.view'])
        );

        $this->postJson('/api/v1/cash/transactions', [])
            ->assertStatus(403);
    }

    public function test_staff_with_cash_manage_passes_permission_check(): void
    {
        Sanctum::actingAs(
            $this->makeStaff('Staff', ['cash.manage'])
        );

        // Empty payload should reach validation and return 422,
        // rather than being blocked by authentication or permission.
        $this->postJson('/api/v1/cash/transactions', [])
            ->assertStatus(422);
    }

    public function test_inactive_staff_cannot_view_cash_accounts(): void
    {
        Sanctum::actingAs(
            $this->makeStaff('Staff', ['cash.view'], false)
        );

        $this->getJson('/api/v1/cash/accounts')
            ->assertStatus(403);
    }

    public function test_inactive_staff_cannot_create_transaction(): void
    {
        Sanctum::actingAs(
            $this->makeStaff('Staff', ['cash.manage'], false)
        );

        $this->postJson('/api/v1/cash/transactions', [])
            ->assertStatus(403);
    }

    public function test_super_admin_can_view_cash_accounts(): void
    {
        Sanctum::actingAs(
            $this->makeStaff('Super Admin')
        );

        $this->getJson('/api/v1/cash/accounts')
            ->assertStatus(200);
    }
}
