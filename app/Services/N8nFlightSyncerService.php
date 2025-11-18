<?php

namespace App\Services;

use App\Contracts\FlightSyncer;
use App\Models\Flight;
use App\Models\FlightStatus;
use App\Models\FlightDeparture;
use App\Models\FlightArrival;
use App\Models\Gate;
use App\Models\BaggageBelt;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use RuntimeException;

/**
 * Concrete Product: Implements FlightSyncer contract.
 * Responsible for creating/updating Flight master records from inbound payloads (e.g., from n8n).
 */
class N8nFlightSyncerService implements FlightSyncer
{
    /**
     * The fixed database ID for the 'UNASSIGNED' Gate placeholder (ID 51).
     */
    private const UNASSIGNED_GATE_ID = 51;

    /**
     * The fixed database ID for the 'UNASSIGNED' Baggage Belt placeholder (ID 6).
     */
    private const UNASSIGNED_BELT_ID = 6;

    public function syncFlight(array $payload): Flight
    {
        $flightId           = $payload['flight_id'] ?? null;
        $flightNumber       = $payload['flight_number'] ?? null;
        // scheduledDeparture is parsed to a Carbon object or remains null if empty
        $scheduledDeparture = !empty($payload['scheduled_departure_time']) ? Carbon::parse($payload['scheduled_departure_time']) : null;

        if (!$flightId && (!$flightNumber || !$scheduledDeparture)) {
            throw new InvalidArgumentException('Payload must include flight_id or both flight_number and scheduled_departure_time.');
        }

        return DB::transaction(function () use ($payload, $flightId, $flightNumber, $scheduledDeparture) {
            
            // 1. Locate existing flight or instantiate new
            $flight = null;
            if ($flightId) {
                $flight = Flight::find($flightId);
            }
            if (!$flight && $flightNumber && $scheduledDeparture) {
                // Must convert Carbon to string for WHERE clause comparison
                $flight = Flight::where('flight_number', $flightNumber)
                                 ->where('scheduled_departure_time', $scheduledDeparture->toDateTimeString()) 
                                 ->first();
            }
            
            $isNew = false;
            if (!$flight) {
                $isNew = true;
                $flight = new Flight();
                
                // If ID is explicitly provided (e.g., for flight 9), use it
                if ($flightId) {
                    $flight->id = $flightId;
                }
                
                // Set mandatory fields and defaults for NEW records
                $flight->flight_number          = $flightNumber;
                
                // *** FIX APPLIED: Assign Carbon object directly to satisfy Eloquent/Static Analysis ***
                $flight->scheduled_departure_time = $scheduledDeparture; 
                
                // CRITICAL: Set initial default foreign key values for NEW records
                $defaultStatus = FlightStatus::where('status_code', 'SCH')->first();
                if (!$defaultStatus) {
                    throw new RuntimeException('Default flight status (SCH) not found in the database.');
                }
                $flight->fk_id_status_code = $defaultStatus->id_status_code;
                $flight->fk_id_gate_code = Gate::where('id', self::UNASSIGNED_GATE_ID)->first()->id_gate_code ?? null;
                $flight->fk_id_belt_code = BaggageBelt::where('id', self::UNASSIGNED_BELT_ID)->first()->id_belt_code ?? null;
            }

            // 2. Map basic attributes
            foreach ([
                'origin_code', 'destination_code', 'airline_code', 'aircraft_icao_code', 'scheduled_arrival_time'
            ] as $attr) {
                if (array_key_exists($attr, $payload)) {
                    // Check if the attribute is a datetime field and assign the Carbon object if not empty
                    if (in_array($attr, ['scheduled_departure_time', 'scheduled_arrival_time']) && !empty($payload[$attr])) {
                        $flight->{$attr} = Carbon::parse($payload[$attr]);
                    } else {
                        $flight->{$attr} = $payload[$attr];
                    }
                }
            }

            // 3. Status mapping (Only update if status_code is provided)
            if (!empty($payload['status_code'])) {
                $status = FlightStatus::where('status_code', $payload['status_code'])->first();
                if ($status) {
                    $flight->fk_id_status_code = $status->id_status_code;
                } else {
                    Log::warning('Status code not found during flight sync. Defaulting to existing status.', ['status_code' => $payload['status_code']]);
                }
            }
            
            // 4. Resolve Gate ID - ONLY update if 'gate_code' is present in the payload.
            if (array_key_exists('gate_code', $payload)) {
                $gateCode = $payload['gate_code'];
                $resolvedGateCode = Gate::where('id', self::UNASSIGNED_GATE_ID)->first()->id_gate_code ?? null;

                if (!empty($gateCode)) {
                    $gate = Gate::where('gate_code', $gateCode)->first();
                    if ($gate) {
                        $resolvedGateCode = $gate->id_gate_code;
                    } else {
                         Log::warning('Gate code not found during flight sync. Defaulting to UNASSIGNED.', ['gate_code' => $gateCode]);
                    }
                }
                $flight->fk_id_gate_code = $resolvedGateCode;
            }


            // 5. Resolve Baggage Belt ID - ONLY update if 'belt_code' is present in the payload.
            if (array_key_exists('belt_code', $payload)) {
                $beltCode = $payload['belt_code'];
                $resolvedBeltCode = BaggageBelt::where('id', self::UNASSIGNED_BELT_ID)->first()->id_belt_code ?? null;

                if (!empty($beltCode)) {
                    $belt = BaggageBelt::where('belt_code', $beltCode)->first();
                    if ($belt) {
                        $resolvedBeltCode = $belt->id_belt_code;
                    } else {
                        Log::warning('Baggage belt code not found during flight sync. Defaulting to UNASSIGNED.', ['belt_code' => $beltCode]);
                    }
                }
                $flight->fk_id_belt_code = $resolvedBeltCode;
            }

            // 6. Save the Flight Record
            $isSaved = $flight->save();

            if (!$isSaved) {
                Log::error('Flight save failed silently, forcing rollback.', ['flight_id' => $flight->id ?? 'new']);
                throw new RuntimeException('Database save operation failed unexpectedly.');
            }

            // 7. RELATED RECORDS INITIALIZATION (Departure/Arrival)
            // Resolve the numeric Gate/Belt IDs from the stored gate/belt codes on the flight
            // (the master `flights` row stores codes: fk_id_gate_code, fk_id_belt_code).
            $resolvedGateId = null;
            if (!empty($flight->fk_id_gate_code)) {
                $gate = Gate::where('id_gate_code', $flight->fk_id_gate_code)->first();
                $resolvedGateId = $gate->id ?? null;
            }

            FlightDeparture::firstOrCreate(
                ['flight_id' => $flight->id],
                ['gate_id' => $resolvedGateId]
            );

            $resolvedBeltId = null;
            if (!empty($flight->fk_id_belt_code)) {
                $belt = BaggageBelt::where('id_belt_code', $flight->fk_id_belt_code)->first();
                $resolvedBeltId = $belt->id ?? null;
            }

            FlightArrival::firstOrCreate(
                ['flight_id' => $flight->id],
                ['baggage_belt_id' => $resolvedBeltId]
            );

            return $flight->load('status');
        });
    }
}