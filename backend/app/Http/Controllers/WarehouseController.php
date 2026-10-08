<?php

namespace App\Http\Controllers;

use App\Models\Warehouse;

class WarehouseController extends CrudController
{
    protected string $model = Warehouse::class;

    protected array $rules = [
        'code' => 'required|string|max:100',
        'name' => 'required|string|max:255',
        'country' => 'required|string|max:100',
        'shipping_mode' => 'required|string|in:LAND,SEA,AIR',
        'address' => 'nullable|string',
        'contact_name' => 'nullable|string|max:255',
        'phone' => 'nullable|string|max:100',
        'receiving_requirement' => 'nullable|string',
        'status' => 'nullable|string|in:active,inactive',
    ];

    protected function searchColumns(): array
    {
        return [
            'code',
            'name',
            'country',
            'address',
            'contact_name',
            'phone',
        ];
    }

    public function update(\Illuminate\Http\Request $request, $id)
    {
        $warehouse = $this->model::findOrFail($id);

        $data = $request->validate([
            'phone' => 'nullable|string|max:100',
            'address' => 'nullable|string',
        ]);

        $warehouse->update($data);

        return $this->ok($warehouse, 'Warehouse phone and address updated successfully.');
    }
}