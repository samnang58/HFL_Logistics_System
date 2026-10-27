<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class UserController extends ApiController
{
    private const ROLES = [
        'Super Admin', 'Admin', 'Finance', 'Accounting',
        'Sales', 'Warehouse', 'Delivery',
    ];

    private const DEPARTMENTS = [
        'Sales', 'Warehouse', 'Finance', 'Delivery',
        'Customer Service', 'Admin', 'Management', 'Other',
    ];

    private function staffColumns(): array
    {
        $columns = [
            'id', 'name', 'email', 'role', 'permissions',
            'created_at', 'updated_at',
        ];

        foreach (['phone', 'department'] as $column) {
            if (Schema::hasColumn('users', $column)) {
                $columns[] = $column;
            }
        }

        return $columns;
    }

    private function staffFieldsReady(): bool
    {
        return Schema::hasColumn('users', 'phone')
            && Schema::hasColumn('users', 'department');
    }

    private function staffFieldsUnavailable()
    {
        return $this->fail(
            'Staff phone and department fields are not available yet. A database migration is required before creating or updating staff details.',
            [],
            422
        );
    }

    public function index(Request $request)
    {
        $columns = $this->staffColumns();
        $query = User::query()->select($columns);

        if ($search = trim((string) $request->input('search'))) {
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

        if ($role = $request->input('role')) {
            $query->where('role', $role);
        }

        return $this->ok(
            $query->orderBy('name')->get(),
            'Users retrieved successfully'
        );
    }

    public function show($id)
    {
        return $this->ok(
            User::query()->select($this->staffColumns())->findOrFail($id),
            'User retrieved successfully'
        );
    }

    public function store(Request $request)
    {
        if (!$this->staffFieldsReady()) {
            return $this->staffFieldsUnavailable();
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:30', 'unique:users,phone'],
            'department' => ['required', 'string', Rule::in(self::DEPARTMENTS)],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(self::ROLES)],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'max:100'],
        ]);

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

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'phone' => [
                'required', 'string', 'max:30',
                Rule::unique('users', 'phone')->ignore($user->id),
            ],
            'department' => ['required', 'string', Rule::in(self::DEPARTMENTS)],
            'role' => ['required', Rule::in(self::ROLES)],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'max:100'],
        ]);

        $user->update($data);

        return $this->ok(
            $user->fresh()->only($this->staffColumns()),
            'Staff updated successfully'
        );
    }

    public function resetPassword(Request $request, $id)
    {
        $data = $request->validate([
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = User::findOrFail($id);
        $user->update(['password' => Hash::make($data['password'])]);

        return $this->ok(null, 'Password reset successfully');
    }

    public function destroy(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if ((int) $request->user()->id === (int) $user->id) {
            return $this->fail('You cannot delete your own account.', [], 422);
        }

        if ($user->role === 'Super Admin') {
            return $this->fail('Super Admin accounts cannot be deleted.', [], 422);
        }

        $user->delete();

        return $this->ok(null, 'User deleted successfully');
    }

    public function sales()
    {
        $sales = User::query()
            ->where('role', 'Sales')
            ->orderBy('name')
            ->get($this->staffColumns());

        return $this->ok($sales, 'Sales users retrieved successfully');
    }

    public function deliveryDrivers()
    {
        $drivers = User::query()
            ->whereIn('role', ['Delivery', 'Warehouse'])
            ->orderBy('name')
            ->get($this->staffColumns());

        return $this->ok($drivers, 'Delivery users retrieved successfully');
    }
}
