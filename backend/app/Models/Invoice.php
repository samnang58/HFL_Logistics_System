<?php
namespace App\Models;
class Invoice extends BaseModel { protected $casts=['items'=>'array','pricing_snapshot'=>'array','meta'=>'array']; }
