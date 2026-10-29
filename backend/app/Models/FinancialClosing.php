<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinancialClosing extends BaseModel
{
    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'total_income' => 'decimal:4',
        'total_expense' => 'decimal:4',
        'closing_balance' => 'decimal:4',
        'closed_at' => 'datetime',
        'reopened_at' => 'datetime',
    ];

    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function reopener(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reopened_by');
    }

    public function audits(): HasMany
    {
        return $this->hasMany(FinancialClosingAudit::class);
    }
}