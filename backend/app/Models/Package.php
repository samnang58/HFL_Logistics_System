<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Package extends BaseModel
{
    public function customer(): BelongsTo
    {
        return $this->belongsTo(
            Customer::class,
            'customer_id',
            'customer_id'
        );
    }

    public function containers(): BelongsToMany
    {
        return $this->belongsToMany(
            Container::class,
            'container_packages'
        )
        ->withPivot([
            'loaded_at',
            'unloaded_at',
        ])
        ->withTimestamps();
    }
}
