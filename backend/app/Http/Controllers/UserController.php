<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends ApiController
{
    private const ROLES = ['Super Admin', 'Admin', 'Finance', 'Accounting', 'Sales', 'Warehouse', 'Delivery'];

    public function index(Request $request)
    {
        $query = User::query()->select('id', 'name', 'email', 'role', 'permissions', 'created_at', 'updated_at');

        if ($search = trim((string) $request->input('search'))) {
            $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('role', 'like', "%{$search}%"));
        }

        if ($role = $request->input('role')) {
            $query->where('role', $role);
        }

        return $this->ok($query->orderBy('name')->get(), 'Users retrieved successfully');
    }

    public function show($id)
    {
        return $this->ok(User::query()
            ->select('id', 'name', 'email', 'role', 'permissions', 'created_at', 'updated_at')
            ->findOrFail($id), 'User retrieved successfully');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(self::ROLES)],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'max:100'],
        ]);

        $data['password'] = Hash::make($data['password']);
        $user = User::create($data);

        return $this->ok($user->only(['id', 'name', 'email', 'role', 'permissions', 'created_at', 'updated_at']), 'User created successfully');
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['required', Rule::in(self::ROLES)],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'max:100'],
        ]);

        $user->update($data);

        return $this->ok($user->fresh()->only(['id', 'name', 'email', 'role', 'permissions', 'created_at', 'updated_at']), 'User updated successfully');
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
        $sales = User::query()->where('role', 'Sales')->orderBy('name')->get(['id', 'name', 'email', 'role']);
        return $this->ok($sales, 'Sales users retrieved successfully');
    }

    public function deliveryDrivers()
    {
        $drivers = User::query()->whereIn('role', ['Delivery', 'Warehouse'])->orderBy('name')->get(['id', 'name', 'email', 'role']);
        return $this->ok($drivers, 'Delivery users retrieved successfully');
    }
}
