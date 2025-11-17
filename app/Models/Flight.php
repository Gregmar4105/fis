<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations;

/**
 * The core entity representing a single flight segment in the system.
 *
 * @property int $id
 * @property string $flight_number
 * @property string $airline_code
 * @property string $origin_code
 * @property string $destination_code
 * @property string|null $aircraft_icao_code
 * @property string|null $fk_id_terminal_code
 * @property string|null $fk_id_gate_code
 * @property string|null $fk_id_belt_code
 * @property string|null $fk_id_status_code
 * @property \Illuminate\Support\Carbon $scheduled_departure_time
 * @property \Illuminate\Support\Carbon|null $scheduled_arrival_time
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
class Flight extends Model
{
    use HasFactory;

    // Use $guarded = [] or define $fillable based on your security policy.
    // For simplicity, we use $guarded.
    protected $guarded = [];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'scheduled_departure_time' => 'datetime',
        'scheduled_arrival_time' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        // Eloquent automatically handles bigint for the ID fields
    ];

    // --- CORE LOOKUP RELATIONSHIPS ---

    /**
     * Get the current operational status (SCH, DEP, ARR, DLY).
     */
    public function status(): Relations\BelongsTo
    {
        return $this->belongsTo(FlightStatus::class, 'fk_id_status_code', 'id_status_code');
    }

    /**
     * Get the operating airline.
     */
    public function airline(): Relations\BelongsTo
    {
        return $this->belongsTo(Airline::class, 'airline_code', 'airline_code');
    }

    /**
     * Get the current assigned aircraft model.
     */
    public function aircraft(): Relations\BelongsTo
    {
        return $this->belongsTo(Aircraft::class, 'aircraft_icao_code', 'icao_code');
    }
    
    /**
     * Get the current/scheduled gate assigned to the flight (FIDS data).
     * This uses the fk_id_gate_code field from the main flights table.
     */
    public function gate(): Relations\BelongsTo
    {
        return $this->belongsTo(Gate::class, 'fk_id_gate_code', 'id_gate_code');
    }

    /**
     * Get the current/scheduled baggage belt assigned to the flight (FIDS data).
     * This uses the fk_id_belt_code field from the main flights table.
     */
    public function baggageBelt(): Relations\BelongsTo
    {
        return $this->belongsTo(BaggageBelt::class, 'fk_id_belt_code', 'id_belt_code');
    }

    /**
     * Alias for backward compatibility.
     * @deprecated Use baggageBelt() instead
     */
    public function baggageClaim(): Relations\BelongsTo
    {
        return $this->baggageBelt();
    }
    
    /**
     * Get the origin airport.
     */
    public function origin(): Relations\BelongsTo
    {
        return $this->belongsTo(Airport::class, 'origin_code', 'iata_code');
    }

    /**
     * Get the destination airport.
     */
    public function destination(): Relations\BelongsTo
    {
        return $this->belongsTo(Airport::class, 'destination_code', 'iata_code');
    }

    // --- FACT/EVENT RELATIONSHIPS ---

    /**
     * Get the recorded departure facts (actual times, runway time).
     */
    public function departure(): Relations\HasOne
    {
        return $this->hasOne(FlightDeparture::class, 'flight_id');
    }

    /**
     * Get the recorded arrival facts (actual times, landing time).
     */
    public function arrival(): Relations\HasOne
    {
        return $this->hasOne(FlightArrival::class, 'flight_id');
    }

    /**
     * Get the full audit log for this flight.
     */
    public function events(): Relations\HasMany
    {
        return $this->hasMany(FlightEvent::class, 'flight_id');
    }

    // --- INTER-FLIGHT RELATIONSHIPS (Connections) ---

    /**
     * Get all flights that this flight connects *to* (e.g., this is the ARRIVAL flight).
     */
    public function connections(): Relations\BelongsToMany
    {
        return $this->belongsToMany(
            Flight::class,
            'flight_connections', // The pivot table
            'arrival_flight_id',  // Foreign key on pivot for this model
            'departure_flight_id' // Foreign key on pivot for the related model
        )->withPivot('minimum_connecting_time');
    }

    /**
     * Get all flights that this flight connects *from* (e.g., this is the DEPARTURE flight).
     */
    public function connectingFrom(): Relations\BelongsToMany
    {
        return $this->belongsToMany(
            Flight::class,
            'flight_connections',
            'departure_flight_id', // Foreign key on pivot for this model
            'arrival_flight_id'    // Foreign key on pivot for the related model
        )->withPivot('minimum_connecting_time');
    }

    /**
     * Alias for connections() - flights this arrives into (inbound connections)
     */
    public function inboundConnections(): Relations\BelongsToMany
    {
        return $this->connections();
    }

    /**
     * Alias for connectingFrom() - flights this departs to (outbound connections)
     */
    public function outboundConnections(): Relations\BelongsToMany
    {
        return $this->connectingFrom();
    }
    
    // --- CONVENIENCE RELATIONSHIPS (for efficient querying) ---

    /**
     * Gets the Terminal model through the Gate model (N+1 fix for FIDS).
     *
     * Relationship path: Flight -> Gate -> Terminal
     * - Flight.gate_id links to Gate.id
     * - Gate.terminal_id links to Terminal.id
     */
    public function terminal(): Relations\HasOneThrough
    {
        return $this->hasOneThrough(
            Terminal::class,    // Final model to access
            Gate::class,        // Intermediate model
            'terminal_id',      // Foreign key on the intermediate table (gates) referencing the final table (terminals)
            'id',               // Primary key on the final table (terminals) - default
            'gate_id',          // Local key on the starting table (flights) referencing the intermediate table (gates)
            'id'                // Primary key on the intermediate table (gates) - default
        );
    }
}