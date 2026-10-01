<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Shipment extends BaseModel
{
    public function containers(): HasMany
    {
        return $this->hasMany(Container::class);
    }

    public function trackingEvents(): HasMany
    {
        return $this->hasMany(ShipmentTrackingEvent::class)->orderBy('event_date');
    }
}
