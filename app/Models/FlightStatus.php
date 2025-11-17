<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations;

/**
 * @property int $id
 * @property string $status_code
 * @property string $status_name
 * @property string $id_status_code
 */
class FlightStatus extends Model
{
    use HasFactory;

    protected $table = 'flight_status';
    public $timestamps = false;

    /**
     * Get all flights currently in this status.
     */
    public function flights(): Relations\HasMany
    {
        return $this->hasMany(Flight::class, 'fk_id_status_code', 'id_status_code');
    }
}