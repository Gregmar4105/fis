<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations;

class FlightEvent extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'flight_events';

    /**
     * Indicates if the model should be timestamped.
     * (The table has its own 'timestamp' column, not created_at/updated_at).
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'flight_id',
        'event_type',
        'description',
        'old_value',
        'new_value',
        'old_fk_id',
        'new_fk_id',
    ];

    /**
     * Get the flight that this event belongs to.
     */
    public function flight(): Relations\BelongsTo
    {
        return $this->belongsTo(Flight::class, 'flight_id');
    }
}