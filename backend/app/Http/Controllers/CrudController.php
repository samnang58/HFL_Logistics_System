<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Model;
abstract class CrudController extends ApiController {
 protected string $model;
 protected array $rules=[];
 public function index(Request $r){ $q=($this->model)::query(); if($r->filled('search')){ $s=$r->string('search'); $q->where(function($x)use($s){foreach($this->searchColumns() as $c)$x->orWhere($c,'like','%'.$s.'%');}); } return $this->ok($q->latest()->paginate((int)$r->input('per_page',25))); }
 protected function searchColumns():array{return ['id'];}
 public function show($id){$m=($this->model)::findOrFail($id); return $this->ok($m);}
 public function store(Request $r){$data=$r->validate($this->rules); $m=($this->model)::create($data); return $this->ok($m,'Created');}
 public function update(Request $r,$id){$m=($this->model)::findOrFail($id); $rules=$this->rules; foreach($rules as $k=>$v)$rules[$k]=str_replace('required|','',$v); $m->update($r->validate($rules)); return $this->ok($m,'Updated');}
 public function destroy($id){($this->model)::findOrFail($id)->delete(); return $this->ok(null,'Deleted');}
}
