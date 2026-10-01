<?php
namespace App\Http\Controllers;
use App\Models\AuditLog;
use Illuminate\Http\Request;
class AuditLogController extends ApiController {
 public function index(Request $r){
  $q=AuditLog::query();
  foreach(['action','status','entity_type','user_id'] as $f) if($r->filled($f)) $q->where($f,$r->input($f));
  if($r->filled('from')) $q->whereDate('created_at','>=',$r->input('from'));
  if($r->filled('to')) $q->whereDate('created_at','<=',$r->input('to'));
  if($r->filled('search')){ $s=$r->input('search'); $q->where(function($x)use($s){$x->where('route','like',"%$s%")->orWhere('entity_id','like',"%$s%")->orWhere('user_name','like',"%$s%");}); }
  return $this->ok($q->latest()->paginate((int)$r->input('per_page',50)));
 }
}
