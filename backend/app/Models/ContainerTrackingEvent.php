<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContainerTrackingEvent extends BaseModel
{
    protected $fillable = [
        'container_id',
        'location',
        'status',
        'event_date',
        'remarks',
        'created_by',
    ];

    protected $casts = [
        'event_date' => 'datetime',
    ];

    public function container(): BelongsTo
    {
        return $this->belongsTo(
            Container::class
        );
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }
}
