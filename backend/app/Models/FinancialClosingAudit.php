<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialClosingAudit extends BaseModel
{
    protected $casts = [
        'performed_at' => 'datetime',
        'details' => 'array',
    ];

    public function financialClosing(): BelongsTo
    {
        return $this->belongsTo(FinancialClosing::class);
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}