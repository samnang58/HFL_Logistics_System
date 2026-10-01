<?php
use Illuminate\Support\Facades\Route;
Route::get('/', fn()=>response()->json(['name'=>'HFL Logistics API','version'=>'v1','status'=>'ok']));
