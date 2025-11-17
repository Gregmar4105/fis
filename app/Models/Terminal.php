<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations;

class Terminal extends Model
{
    use HasFactory;

    public $timestamps = false;

    /**
     * Get the airport this terminal belongs to.
     */
    public function airport(): Relations\BelongsTo
    {
        return $this->belongsTo(Airport::class, 'iata_code', 'iata_code');
    }

    /**
     * Get all gates in this terminal.
     */
    public function gates(): Relations\HasMany
    {
        return $this->hasMany(Gate::class, 'terminal_id');
    }

    /**
     * Get all baggage belts in this terminal.
     */
    public function baggageBelts(): Relations\HasMany
    {
        return $this->hasMany(BaggageBelt::class, 'terminal_id');
    }
}