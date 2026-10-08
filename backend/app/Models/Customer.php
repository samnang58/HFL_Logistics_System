<?php

namespace App\Models;

use Laravel\Sanctum\HasApiTokens;

class Customer extends BaseModel
{
    use HasApiTokens;

    protected $hidden = ['password'];

    public function salesOwner()
    {
        return $this->belongsTo(User::class, 'sales_owner_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
