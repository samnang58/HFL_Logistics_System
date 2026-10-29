<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashAdvance extends BaseModel
{
    protected $casts = [
        'amount' => 'decimal:4',
        'advanced_at' => 'date',
    ];

    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(CashAccount::class);
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}