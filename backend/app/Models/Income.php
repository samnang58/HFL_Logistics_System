<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Income extends BaseModel
{
    protected $casts = [
        'amount' => 'decimal:4',
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class, 'payment_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }
}