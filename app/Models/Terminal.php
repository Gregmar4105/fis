<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations;

class Terminal extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'iata_code',
        'terminal_code',
        'name',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Auto-generate id_terminal_code when creating
        // Note: Terminal ID is NOT auto-increment, so we need it provided or generated
        static::creating(function ($terminal) {
            // If ID is not set, we need to get the next available ID
            if (empty($terminal->id)) {
                $maxId = static::max('id') ?? 0;
                $terminal->id = $maxId + 1;
            }
            
            // Generate id_terminal_code if not provided - format: {iata_code}-{terminal_code}
            if (empty($terminal->id_terminal_code) && $terminal->iata_code && $terminal->terminal_code) {
                $terminal->id_terminal_code = $terminal->iata_code . '-' . $terminal->terminal_code;
            }
        });

        // Update id_terminal_code when terminal_code or iata_code changes
        static::updating(function ($terminal) {
            if ($terminal->isDirty('terminal_code') || $terminal->isDirty('iata_code')) {
                if ($terminal->iata_code && $terminal->terminal_code) {
                    $terminal->id_terminal_code = $terminal->iata_code . '-' . $terminal->terminal_code;
                }
            }
        });
    }

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