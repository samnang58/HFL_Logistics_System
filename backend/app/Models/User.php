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
        $role = strtolower(trim((string) $this->role));

        // Super Admin is the only role with unconditional full access.
        if ($role === 'super admin') {
            return true;
        }

        // All other users receive only explicitly assigned permissions.
        $permissions = $this->permissions;

        if (!is_array($permissions) || count($permissions) === 0) {
            return false;
        }

        // The wildcard must not grant automatic full access to other roles.
        return in_array($permission, $permissions, true);
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
