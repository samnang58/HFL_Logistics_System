<?php
namespace App\Http\Controllers;
use App\Models\Lead;
class LeadController extends CrudController {protected string $model=Lead::class; protected array $rules=['name'=>'required|string','company_name'=>'nullable|string','phone'=>'nullable|string','email'=>'nullable|email','source'=>'nullable|string','status'=>'nullable|string','owner'=>'nullable|string','notes'=>'nullable|string']; protected function searchColumns():array{return ['lead_no','name','company_name','phone','email','status'];} public function store(\Illuminate\Http\Request $r){$d=$r->validate($this->rules);$d['lead_no']='HFL-LEAD-'.str_pad((string)(Lead::count()+1),6,'0','STR_PAD_LEFT');$d['status']=$d['status']??'New';return $this->ok(Lead::create($d),'Created');}}
