<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\ShippingMode;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@hfl-logistics.com'],
            [
                'name' => 'HFL Super Admin',
                'password' => Hash::make('change-me'),
                'role' => 'Super Admin',
                'permissions' => ['*'],
            ]
        );

        User::where('role', 'Super Admin')->update(['permissions' => ['*']]);

        foreach ([
            ['code' => 'SEA', 'name' => 'Sea Freight', 'unit' => 'CBM'],
            ['code' => 'LAND', 'name' => 'Land Freight', 'unit' => 'CBM'],
            ['code' => 'AIR', 'name' => 'Air Freight', 'unit' => 'KG'],
        ] as $mode) {
            ShippingMode::firstOrCreate(['code' => $mode['code']], array_merge($mode, [
                'status' => 'Active',
            ]));
        }

    }
}
