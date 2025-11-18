<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations;

/**
 * @property int $id
 * @property int $terminal_id
 * @property string|null $gate_code
 * @property string|null $gate_status
 * @property string $id_gate_code
 */
class Gate extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'terminal_id',
        'gate_code',
        'gate_status',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Auto-generate id_gate_code when creating
        // Note: Gate ID is auto-increment (bigInteger), so we don't need to set it
        static::creating(function ($gate) {
            // Generate id_gate_code if not provided
            if (empty($gate->id_gate_code) && $gate->terminal_id && $gate->gate_code) {
                $gate->id_gate_code = $gate->terminal_id . '-' . $gate->gate_code;
            }
            // Set default gate_status if not provided
            if (empty($gate->gate_status)) {
                $gate->gate_status = 'Open';
            }
        });

        // Update id_gate_code when terminal_id or gate_code changes
        static::updating(function ($gate) {
            if ($gate->isDirty('terminal_id') || $gate->isDirty('gate_code')) {
                if ($gate->terminal_id && $gate->gate_code) {
                    $gate->id_gate_code = $gate->terminal_id . '-' . $gate->gate_code;
                }
            }
        });
    }

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