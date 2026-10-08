<?php

namespace App\Models;

class Warehouse extends BaseModel
{
    protected $fillable = [
        'code',
        'name',
        'country',
        'shipping_mode',
        'address',
        'contact_name',
        'phone',
        'receiving_requirement',
        'status',
    ];
}
