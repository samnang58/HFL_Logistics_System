<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Container extends BaseModel
{
    protected $fillable = [
        'shipment_id',
        'container_number',
        'container_type',
        'seal_number',
        'shipping_mode',
        'origin',
        'destination',
        'current_location',
        'status',
        'departure_date',
        'estimated_arrival',
        'actual_arrival',
        'notes',
    ];

    protected $casts = [
        'departure_date' => 'date',
        'estimated_arrival' => 'date',
        'actual_arrival' => 'date',
    ];


    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id');
    }

    public function packages(): BelongsToMany
    {
        return $this->belongsToMany(
            Package::class,
            'container_packages'
        )
        ->withPivot([
            'loaded_at',
            'unloaded_at',
        ])
        ->withTimestamps();
    }

    public function trackingEvents(): HasMany
    {
        return $this->hasMany(
            ContainerTrackingEvent::class
        )->orderByDesc('event_date');
    }
}
