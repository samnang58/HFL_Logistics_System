<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;

    protected $guarded = [];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'permissions' => 'array',
    ];


    public function hasPermission(string $permission): bool
    {
        $permissions = $this->permissions;

        if (is_array($permissions) && count($permissions) > 0) {
            return in_array('*', $permissions, true) || in_array($permission, $permissions, true);
        }

        $role = strtolower(trim((string) $this->role));
        $all = ['*'];
        $billing = [
            'invoice.view',
            'invoice.create',
            'invoice.print',
            'invoice.download',
            'payment.view',
            'payment.create',
        ];

        if (in_array($role, ['super admin', 'admin', 'finance', 'accounting'], true)) {
            return true;
        }

        if ($role === 'sales') {
            return in_array($permission, ['invoice.view', 'invoice.create', 'invoice.print', 'invoice.download'], true);
        }

        if ($role === 'warehouse') {
            return in_array($permission, ['invoice.view', 'invoice.create', 'invoice.print'], true);
        }

        return false;
    }

    public function customers()
    {
        return $this->hasMany(Customer::class, 'sales_owner_id');
    }

    public function createdCustomers()
    {
        return $this->hasMany(Customer::class, 'created_by');
    }
}
