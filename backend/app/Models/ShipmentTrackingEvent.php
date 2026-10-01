<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipmentTrackingEvent extends BaseModel
{
    protected $fillable = [
        'shipment_id','location','status','event_date','remarks','created_by',
    ];

    protected $casts = ['event_date' => 'datetime'];

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
