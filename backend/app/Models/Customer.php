<?php

namespace App\Models;

class Customer extends BaseModel
{
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
