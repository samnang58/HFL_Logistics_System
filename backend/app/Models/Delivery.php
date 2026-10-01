<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class Delivery extends BaseModel {
 public function package(): BelongsTo { return $this->belongsTo(Package::class); }
 public function driver(): BelongsTo { return $this->belongsTo(User::class,'driver_id'); }
}
