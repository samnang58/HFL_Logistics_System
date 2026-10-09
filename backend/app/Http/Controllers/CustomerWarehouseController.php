<?php

namespace App\Http\Controllers;

use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CustomerWarehouseController extends ApiController
{
    public function index(Request $request)
    {
        $customer = $request->user();

        if (!$customer) {
            return $this->fail('Unauthenticated.', [], 401);
        }

        $validated = $request->validate([
            'mode' => [
                'nullable',
                'string',
                Rule::in(['LAND', 'SEA', 'AIR']),
            ],
        ]);

        $query = Warehouse::query()
            ->where('status', 'active');

        if (!empty($validated['mode'])) {
            $query->where(
                'shipping_mode',
                strtoupper($validated['mode'])
            );
        }

        $warehouses = $query
            ->orderBy('name')
            ->get([
                'id',
                'code',
                'name',
                'country',
                'shipping_mode',
                'address',
                'phone',
                'status',
                'created_at',
                'updated_at',
            ]);

        $customerCode = $customer->username;

        $data = $warehouses->map(function (Warehouse $warehouse) use ($customerCode) {
            $modeLabel = match (strtoupper($warehouse->shipping_mode ?? 'LAND')) {
                'SEA' => '海运',
                'AIR' => '空运',
                default => '陆运',
            };

            return [
                'id' => $warehouse->id,
                'code' => $warehouse->code,
                'name' => $warehouse->name,
                'country' => $warehouse->country,
                'shipping_mode' => $warehouse->shipping_mode,
                'address' => $warehouse->address,
                'contact_name' => "承运 {$customerCode}",
                'phone' => $warehouse->phone,
                'receiving_requirement' =>
                    "入仓号/唛头：“{$customerCode}{$modeLabel}”，一定要备注在货物外包装上",
                'status' => $warehouse->status,
                'created_at' => $warehouse->created_at,
                'updated_at' => $warehouse->updated_at,
            ];
        })->values();

        return $this->ok(
            $data,
            'Warehouse addresses retrieved successfully.'
        );
    }
}
