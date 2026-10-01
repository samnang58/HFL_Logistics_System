<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShippingMode extends Model
{
    protected $fillable = ['code','name','description','unit','status'];
}
