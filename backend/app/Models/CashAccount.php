<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class CashAccount extends BaseModel
{
    protected $casts = [
        'opening_balance' => 'decimal:4',
        'is_active' => 'boolean',
    ];

    public function transactions(): HasMany
    {
        return $this->hasMany(CashTransaction::class);
    }

    public function advances(): HasMany
    {
        return $this->hasMany(CashAdvance::class);
    }
}