<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations;

/**
 * @property int $id
 * @property int $terminal_id
 * @property string $belt_code
 * @property string $status
 * @property string $id_belt_code
 */
class BaggageBelt extends Model
{
    use HasFactory;

    protected $table = 'baggage_belts';
    public $timestamps = false;

    protected $fillable = [
        'terminal_id',
        'belt_code',
        'status',
    ];

    protected $casts = [
        'terminal_id' => 'integer',
    ];

    /**
     * Get the terminal this baggage belt belongs to.
     */
    public function terminal(): Relations\BelongsTo
    {
        return $this->belongsTo(Terminal::class, 'terminal_id');
    }

    /**
     * Get all flight arrivals assigned to this belt.
     */
    public function arrivals(): Relations\HasMany
    {
        return $this->hasMany(FlightArrival::class, 'baggage_belt_id');
    }

    /**
     * Get all flights assigned to this belt.
     */
    public function flights(): Relations\HasMany
    {
        return $this->hasMany(Flight::class, 'baggage_belt_id');
    }
}
