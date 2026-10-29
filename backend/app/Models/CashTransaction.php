<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashTransaction extends BaseModel
{
    protected $casts = [
        'amount' => 'decimal:4',
        'transaction_at' => 'datetime',
    ];

    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(CashAccount::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}