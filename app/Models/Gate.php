<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations;

/**
 * @property int $id
 * @property int $terminal_id
 * @property string|null $gate_code
 * @property string|null $gate_type
 * @property string $id_gate_code
 */
class Gate extends Model
{
    use HasFactory;

    public $timestamps = false;

    /**
     * Get the terminal this gate belongs to.
     */
    public function terminal(): Relations\BelongsTo
    {
        return $this->belongsTo(Terminal::class, 'terminal_id');
    }

    /**
     * Get all departure records for this gate.
     */
    public function departures(): Relations\HasMany
    {
        return $this->hasMany(FlightDeparture::class, 'gate_id');
    }

    /**
     * Get the airlines that are authorized to use this gate.
     */
    public function authorizedAirlines(): Relations\BelongsToMany
    {
        return $this->belongsToMany(
            Airline::class,
            'airline_gates',
            'gate_id',
            'airline_code'
        );
    }

    /**
     * Get the aircraft models that are restricted from this gate.
     */
    public function restrictedAircraft(): Relations\BelongsToMany
    {
        return $this->belongsToMany(
            Aircraft::class,
            'gate_restrictions',    // The pivot table
            'gate_id',              // Foreign key for this model
            'aircraft_icao_code'    // Foreign key for the related model
        )
        ->using(GateRestriction::class) // <-- Tell Laravel to use your new Pivot Model
        ->withPivot('restriction_type');  // <-- Tell Laravel to include this extra column
    }
}