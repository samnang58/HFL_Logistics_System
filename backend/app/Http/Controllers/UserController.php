<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class UserController extends ApiController
{
    private const ROLES = [
        'Admin',
        'Finance',
        'Accounting',
        'Sales',
        'Warehouse',
        'Delivery',
    ];

    private const DEPARTMENTS = [
        'Sales',
        'Warehouse',
        'Finance',
        'Delivery',
        'Customer Service',
        'Admin',
        'Management',
        'Other',
    ];

    private const ALLOWED_PERMISSIONS = [
        'dashboard.view',
        'approvals.view',
        'crm.view',
        'crm.manage',
        'buying.view',
        'stock.view',
        'selling.view',
        'hr.view',
        'packages.view',
        'packages.manage',
        'data_import.manage',
        'customers.view',
        'customers.manage',
        'pricing.view',
        'pricing.manage',
        'shipments.view',
        'shipments.manage',
        'shipping_modes.view',
        'shipping_modes.manage',
        'tracking.view',
        'tracking.manage',
        'warehouses.view',
        'warehouses.manage',
        'china_warehouse.view',
        'china_sync.view',
        'china_sync.manage',
        'cambodia_warehouse.view',
        'cambodia_warehouse.manage',
        'containers.view',
        'containers.manage',
        'deliveries.view',
        'deliveries.manage',
        'finance.view',
        'cash.view',
        'cash.manage',
        'finance.close',
        'finance.reopen',
        'expenses.view',
        'expenses.manage',
        'income.view',
        'income.manage',
        'report.view',
        'settings.manage',
        'test-data.manage',
        'quotation.view',
        'quotation.manage',
        'invoice.view',
        'invoice.create',
        'invoice.print',
        'invoice.download',
        'payment.view',
        'payment.create',
        'billing.settings',
    ];

    private function isSuperAdmin(User $user): bool
    {
        return strtolower(trim((string) $user->role)) === 'super admin';
    }

    private function staffColumns(): array
    {
        $columns = [
            'id',
            'name',
            'email',
            'role',
            'permissions',
            'created_at',
            'updated_at',
        ];

        foreach (['phone', 'department', 'is_active'] as $column) {
            if (Schema::hasColumn('users', $column)) {
                $columns[] = $column;
            }
        }

        return $columns;
    }

    private function staffFieldsReady(): bool
    {
        return Schema::hasColumn('users', 'phone')
            && Schema::hasColumn('users', 'department')
            && Schema::hasColumn('users', 'is_active');
    }

    private function staffFieldsUnavailable()
    {
        return $this->fail(
            'Required staff database fields are not available.',
            [],
            422
        );
    }

    private function staffValidationRules(?User $user = null): array
    {
        $emailUnique = Rule::unique('users', 'email');
        $phoneUnique = Rule::unique('users', 'phone');

        if ($user) {
            $emailUnique->ignore($user->id);
            $phoneUnique->ignore($user->id);
        }

        return [
            'name' => ['required', 'string', 'max:255'],

            'email' => [
                'nullable',
                'email',
                'max:255',
                $emailUnique,
            ],

            'phone' => [
                'required',
                'string',
                'max:30',
                $phoneUnique,
            ],

            'department' => [
                'required',
                'string',
                Rule::in(self::DEPARTMENTS),
            ],

            'role' => [
                'required',
                Rule::in(self::ROLES),
            ],

            'permissions' => [
                'nullable',
                'array',
            ],

            'permissions.*' => [
                'string',
                'distinct',
                Rule::in(self::ALLOWED_PERMISSIONS),
            ],

            'is_active' => [
                'sometimes',
                'boolean',
            ],
        ];
    }

    public function index(Request $request)
    {
        $query = User::query()->select($this->staffColumns());

        $search = trim((string) $request->input('search', ''));

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('role', 'like', "%{$search}%");

                if (Schema::hasColumn('users', 'phone')) {
                    $q->orWhere('phone', 'like', "%{$search}%");
                }

                if (Schema::hasColumn('users', 'department')) {
                    $q->orWhere('department', 'like', "%{$search}%");
                }
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }

        return $this->ok(
            $query->orderBy('name')->get(),
            'Users retrieved successfully'
        );
    }

    public function show($id)
    {
        $user = User::query()
            ->select($this->staffColumns())
            ->findOrFail($id);

        return $this->ok(
            $user,
            'User retrieved successfully'
        );
    }

    public function store(Request $request)
    {
        if (!$this->staffFieldsReady()) {
            return $this->staffFieldsUnavailable();
        }

        $rules = $this->staffValidationRules();

        $rules['password'] = [
            'required',
            'string',
            'min:8',
        ];

        $data = $request->validate($rules);

        // A new Super Admin cannot be created through this endpoint.
        // The allowed role list intentionally excludes Super Admin.

        $data['email'] = $data['email'] ?? null;

        $data['permissions'] = array_values(
            $data['permissions'] ?? []
        );

        // New staff are active by default.
        // Ignore any is_active value submitted during creation.
        $data['is_active'] = true;

        $data['password'] = Hash::make($data['password']);

        $user = User::create($data);

        return $this->ok(
            $user->only($this->staffColumns()),
            'Staff created successfully'
        );
    }

    public function update(Request $request, $id)
    {
        if (!$this->staffFieldsReady()) {
            return $this->staffFieldsUnavailable();
        }

        $user = User::findOrFail($id);

        if ($this->isSuperAdmin($user)) {
            return $this->fail(
                'Super Admin accounts cannot be modified through Staff Management.',
                [],
                403
            );
        }

        $data = $request->validate(
            $this->staffValidationRules($user)
        );

        $data['email'] = $data['email'] ?? null;

        $data['permissions'] = array_values(
            $data['permissions'] ?? []
        );

        // A staff member cannot be promoted to Super Admin.
        // The allowed role list intentionally excludes Super Admin.

        DB::transaction(function () use ($user, $data) {
            $wasActive = (bool) $user->is_active;

            $user->update($data);

            // Revoke existing sessions when a staff account is disabled.
            if ($wasActive && !$user->is_active) {
                $user->tokens()->delete();
            }
        });

        return $this->ok(
            $user->fresh()->only($this->staffColumns()),
            'Staff updated successfully'
        );
    }

    public function resetPassword(Request $request, $id)
    {
        $data = $request->validate([
            'password' => [
                'required',
                'string',
                'min:8',
            ],
        ]);

        $user = User::findOrFail($id);

        if ($this->isSuperAdmin($user)) {
            return $this->fail(
                'Super Admin passwords cannot be reset through Staff Management.',
                [],
                403
            );
        }

        DB::transaction(function () use ($user, $data) {
            $user->update([
                'password' => Hash::make($data['password']),
            ]);

            // Force the staff member to log in again.
            $user->tokens()->delete();
        });

        return $this->ok(
            null,
            'Password reset successfully. Existing sessions were revoked.'
        );
    }

    public function destroy(Request $request, $id)
    {
        if (!$this->staffFieldsReady()) {
            return $this->staffFieldsUnavailable();
        }

        $user = User::findOrFail($id);

        if ((int) $request->user()->id === (int) $user->id) {
            return $this->fail(
                'You cannot disable your own account.',
                [],
                422
            );
        }

        if ($this->isSuperAdmin($user)) {
            return $this->fail(
                'Super Admin accounts cannot be disabled.',
                [],
                403
            );
        }

        DB::transaction(function () use ($user) {
            $user->update([
                'is_active' => false,
            ]);

            // Revoke all existing staff sessions.
            $user->tokens()->delete();
        });

        // Keep the user record and its historical relationships.
        return $this->ok(
            null,
            'Staff disabled successfully'
        );
    }

    public function sales()
{
    $query = User::query()
        ->where('role', 'Sales');

    if (Schema::hasColumn('users', 'is_active')) {
        $query->where('is_active', true);
    }

    return $this->ok(
        $query->orderBy('name')->get(['id', 'name', 'role']),
        'Sales users retrieved successfully'
    );
}

public function deliveryDrivers()
{
    $query = User::query()
        ->whereIn('role', ['Delivery', 'Warehouse']);

    if (Schema::hasColumn('users', 'is_active')) {
        $query->where('is_active', true);
    }

    return $this->ok(
        $query->orderBy('name')->get(['id', 'name', 'role']),
        'Delivery users retrieved successfully'
    );
}
}