<?php

namespace App\Services;

use App\Contracts\StatusUpdater; // Your Abstract Product!
use App\Models\Flight;
use App\Models\FlightEvent;
use App\Models\Gate;
use App\Models\BaggageBelt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * Contains the business logic for the FIS Admin panel.
 * This service WRITES data to the DB and TRIGGERS outbound integrations.
 */
class FlightOperationsService
{
    // We inject the abstract contract. Laravel will provide the
    // concrete N8nStatusUpdaterService thanks to your AppServiceProvider.
    public function __construct(protected StatusUpdater $statusUpdater) {}

    /**
     * Business logic for an admin manually assigning a gate.
     */
    public function assignGate(Flight $flight, Gate $newGate): Flight
    {
        // Accessing gate_id through the departure fact table is correct.
        $oldGateId = $flight->departure->gate_id ?? null;

        if ($oldGateId === $newGate->id) {
            return $flight; // No change
        }

        // Use a transaction for 3NF integrity
        DB::transaction(function () use ($flight, $newGate, $oldGateId) {
            
            // 1. Update the local database (the departure fact table holds the assigned gate)
            $flight->departure()->updateOrCreate(
                ['flight_id' => $flight->id],
                ['gate_id' => $newGate->id]
            );

            // 2. Log the audit event (using the correct FlightEvent model)
            FlightEvent::create([
                'flight_id' => $flight->id,
                'event_type' => 'GATE_CHANGE',
                'old_fk_id' => $oldGateId,
                'new_fk_id' => $newGate->id,
            ]);
        });

        // 3. Notify all other systems (PMS, BHS) via n8n
        // This calls your N8nStatusUpdaterService->updateGate() method
        try {
            $this->statusUpdater->updateGate($flight, $newGate);
        } catch (\Exception $e) {
            Log::error('N8N gate update notification failed.', ['flight_id' => $flight->id, 'error' => $e->getMessage()]);
            // Non-fatal error. The gate is updated locally, but integration failed.
            // You could add this to a failed jobs queue.
        }

        return $flight->fresh('departure.gate');
    }

    /**
     * Business logic for an admin manually assigning a baggage belt.
     */
    public function assignBaggageBelt(Flight $flight, BaggageBelt $newBelt): Flight
    {
        // Accessing baggage_belt_id through the arrival fact table is correct.
        $oldBeltId = $flight->arrival->baggage_belt_id ?? null;

        if ($oldBeltId === $newBelt->id) {
            return $flight; // No change
        }

        DB::transaction(function () use ($flight, $newBelt, $oldBeltId) {
            // 1. Update local DB (the arrival fact table holds the assigned belt)
            $flight->arrival()->updateOrCreate(
                ['flight_id' => $flight->id],
                ['baggage_belt_id' => $newBelt->id]
            );

            // 2. Log audit event
            FlightEvent::create([
                'flight_id' => $flight->id,
                'event_type' => 'BELT_CHANGE',
                'old_fk_id' => $oldBeltId,
                'new_fk_id' => $newBelt->id,
            ]);
        });

        // 3. Notify external systems (PMS, BHS)
        try {
            $this->statusUpdater->updateBaggageBelt($flight, $newBelt);
        } catch (\Exception $e) {
            Log::error('N8N baggage belt update notification failed.', ['flight_id' => $flight->id, 'error' => $e->getMessage()]);
        }

        return $flight->fresh('arrival.baggageBelt');
    }

    /**
     * Business logic for an admin manually updating a time (e.g., new ETA).
     */
    public function updateFlightTime(Flight $flight, string $timeType, Carbon $newTime): Flight
    {
        $oldTime = null;
        $logValue = null;

        DB::transaction(function () use ($flight, $timeType, $newTime, &$oldTime, &$logValue) {
            switch ($timeType) {
                case 'scheduled_departure':
                    $oldTime = $flight->scheduled_departure_time;
                    $flight->scheduled_departure_time = $newTime;
                    $logValue = 'SCHED_DEP_TIME';
                    break;
                case 'scheduled_arrival':
                    $oldTime = $flight->scheduled_arrival_time;
                    $flight->scheduled_arrival_time = $newTime;
                    $logValue = 'SCHED_ARR_TIME';
                    break;
                // You can add cases for 'actual_departure', 'actual_arrival', etc.
                default:
                    throw new \Exception("Invalid time type provided: {$timeType}");
            }
            
            // 1. Update local DB
            $flight->save();

            // 2. Log audit event
            FlightEvent::create([
                'flight_id' => $flight->id,
                'event_type' => 'TIME_UPDATE',
                'old_value' => $oldTime ? $oldTime->toDateTimeString() : null,
                'new_value' => $newTime->toDateTimeString(),
                'old_fk_id' => $logValue, // Using old_fk_id to store the type of time
            ]);
        });

        // 3. Notify external systems
        try {
            $this->statusUpdater->updateTime($flight, $timeType, $newTime);
        } catch (\Exception $e) {
            Log::error('N8N time update notification failed.', ['flight_id' => $flight->id, 'error' => $e->getMessage()]);
        }
        
        return $flight;
    }
}