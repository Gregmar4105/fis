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
 * @property int $gate_id            // References gates.id (BIGINT UNSIGNED)
 * @property int $baggage_claim_id   // References baggage_claims.id (BIGINT UNSIGNED)
 * @property int $status_id          // References flight_status.id
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
        return $this->belongsTo(FlightStatus::class, 'status_id');
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
     * This uses the gate_id field from the main flights table.
     */
    public function gate(): Relations\BelongsTo
    {
        return $this->belongsTo(Gate::class, 'gate_id');
    }

    /**
     * Get the current/scheduled baggage claim assigned to the flight (FIDS data).
     * This uses the baggage_claim_id field from the main flights table.
     */
    public function baggageClaim(): Relations\BelongsTo
    {
        return $this->belongsTo(BaggageClaim::class, 'baggage_claim_id');
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
    
    // --- CONVENIENCE RELATIONSHIPS (for efficient querying) ---

    /**
     * Gets the Terminal model through the Gate model (N+1 fix for FIDS).
     */
    public function terminal(): Relations\HasOneThrough
    {
        return $this->hasOneThrough(
            Terminal::class,
            Gate::class,
            'id',           // Foreign key on Gate table (PK)
            'id',           // Foreign key on Terminal table (PK)
            'gate_id',      // Local key on Flight table
            'terminal_id'   // Local key on Gate table
        );
    }
}