<?php
namespace App\Http\Controllers;

use App\Models\ShippingMode;
use Illuminate\Http\Request;

class ShippingModeController extends CrudController
{
    protected string $model = ShippingMode::class;

    protected array $rules = [
        'code' => 'required|string|max:20|alpha_dash',
        'name' => 'required|string|max:100',
        'description' => 'nullable|string',
        'unit' => 'required|in:CBM,KG',
        'status' => 'nullable|in:Active,Inactive',
    ];

    protected function searchColumns(): array
    {
        return ['code','name','description','unit','status'];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules);
        $data['code'] = strtoupper($data['code']);
        $data['status'] = $data['status'] ?? 'Active';
        return $this->ok(ShippingMode::create($data), 'Created');
    }

    public function update(Request $request, $id)
    {
        $data = $request->validate($this->rules);
        $data['code'] = strtoupper($data['code']);
        $mode = ShippingMode::findOrFail($id);
        $mode->update($data);
        return $this->ok($mode->fresh(), 'Updated');
    }
}
