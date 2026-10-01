<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContainerPackage extends BaseModel
{
    protected $fillable = [
        'container_id',
        'package_id',
        'loaded_at',
        'unloaded_at',
    ];

    protected $casts = [
        'loaded_at' => 'datetime',
        'unloaded_at' => 'datetime',
    ];

    public function container(): BelongsTo
    {
        return $this->belongsTo(
            Container::class
        );
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(
            Package::class
        );
    }
}
