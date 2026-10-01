<?php

namespace App\Models;

class TrackingEvent extends BaseModel
{
    /**
     * Tracking event timestamps come from MySQL as strings. Cast them to
     * Carbon so TrackingController can safely compare/order event times.
     */
    protected $casts = [
        'event_at' => 'datetime',
    ];
}
