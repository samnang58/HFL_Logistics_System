<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class BaseModel extends Model { protected $guarded=[]; protected $casts=['items'=>'array','boxes'=>'array','meta'=>'array','errors'=>'array','pricing_snapshot'=>'array','product_images'=>'array','custom_images'=>'array']; }
