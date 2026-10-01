<?php
namespace App\Http\Controllers;
use Illuminate\Http\JsonResponse;
class ApiController extends Controller {
 protected function ok($data=null,string $message='Success'): JsonResponse { return response()->json(['success'=>true,'message'=>$message,'data'=>$data]); }
 protected function fail(string $message='Error',array $errors=[],int $status=422): JsonResponse { return response()->json(['success'=>false,'message'=>$message,'errors'=>$errors],$status); }
}
