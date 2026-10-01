<?php
namespace App\Http\Middleware;
use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;
class AuditMutations {
 public function handle(Request $request, Closure $next){
  $response=$next($request);
  if(in_array(strtoupper($request->method()),['POST','PUT','PATCH','DELETE'],true) && $request->route()){
   try {
    $user=$request->user();
    $routeName=$request->route()->getName();
    $path=$request->path();
    $segments=explode('/',$path);
    $entityType=$segments[2] ?? null;
    if($entityType==='v1') $entityType=$segments[3] ?? null;
    $entityId=null;
    foreach($request->route()->parameters() as $v){ if(is_scalar($v) && preg_match('/^\d+$/',(string)$v)){ $entityId=(string)$v; break; } }
    $action=strtoupper($request->method()).' '.($routeName ?: $path);
    AuditLog::create([
      'user_id'=>$user?->id,'user_name'=>$user?->name ?? 'System','action'=>substr($action,0,50),
      'method'=>strtoupper($request->method()),'route'=>$path,'entity_type'=>$entityType,'entity_id'=>$entityId,
      'status'=>$response->getStatusCode()<400?'success':'failed','response_code'=>$response->getStatusCode(),
      'ip_address'=>$request->ip(),'user_agent'=>substr((string)$request->userAgent(),0,1000),
      'metadata'=>['route_name'=>$routeName,'query'=>$request->query()],
    ]);
   } catch(\Throwable $e) { /* audit must never break business requests */ }
  }
  return $response;
 }
}
