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
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Auto-generate id_belt_code when creating
        static::creating(function ($belt) {
            if (empty($belt->id_belt_code) && $belt->terminal_id && $belt->belt_code) {
                $belt->id_belt_code = $belt->terminal_id . '-' . $belt->belt_code;
            }
            // Set default status if not provided
            if (empty($belt->status)) {
                $belt->status = 'Active';
            }
        });

        // Update id_belt_code when terminal_id or belt_code changes
        static::updating(function ($belt) {
            if ($belt->isDirty('terminal_id') || $belt->isDirty('belt_code')) {
                if ($belt->terminal_id && $belt->belt_code) {
                    $belt->id_belt_code = $belt->terminal_id . '-' . $belt->belt_code;
                }
            }
        });
    }

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
