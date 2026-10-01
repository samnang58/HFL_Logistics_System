<?php
namespace App\Http\Controllers;
use App\Models\Warehouse;
class WarehouseController extends CrudController {protected string $model=Warehouse::class; protected array $rules=['code'=>'required|string','name'=>'required|string','country'=>'required|string','address'=>'nullable|string','status'=>'nullable|string']; protected function searchColumns():array{return ['code','name','country','address'];}}
