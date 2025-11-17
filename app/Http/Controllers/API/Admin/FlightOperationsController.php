<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Flight;
use App\Models\Gate;
use App\Models\BaggageBelt;
use App\Services\FlightOperationsService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

/**
 * Handles API requests from the FIS Admin Frontend (fis.larable.dev)
 */
class FlightOperationsController extends Controller
{
    public function __construct(protected FlightOperationsService $flightService) {}

    /**
     * Handle the admin API request to update a flight's gate.
     * POST /api/admin/flights/{flight}/gate
     */
    public function updateGate(Request $request, Flight $flight): JsonResponse
    {
        $validated = $request->validate([
            'gate_id' => 'required|integer|exists:gates,id',
        ]);

        $gate = Gate::find($validated['gate_id']);

        // Check gate restrictions (Example of business logic check)
        // This requires the 'restrictedAircraft' relationship to be defined in your Gate model
        $isRestricted = $gate->restrictedAircraft()
                             ->where('aircraft_icao_code', $flight->aircraft_icao_code)
                             ->exists();
        
        if ($isRestricted) {
            throw ValidationException::withMessages([
                'gate_id' => "Aircraft {$flight->aircraft_icao_code} is restricted from this gate.",
            ]);
        }

        $this->flightService->assignGate($flight, $gate);
        
        return response()->json([
            'message' => 'Gate assigned successfully.',
            'flight' => $flight->load('departure.gate')
        ]);
    }

    /**
     * Handle the admin API request to update a flight's baggage belt.
     * POST /api/admin/flights/{flight}/baggage
     */
    public function updateBaggageBelt(Request $request, Flight $flight): JsonResponse
    {
        $validated = $request->validate([
            'baggage_belt_id' => 'required|integer|exists:baggage_belts,id',
        ]);

        $belt = BaggageBelt::find($validated['baggage_belt_id']);

        $this->flightService->assignBaggageBelt($flight, $belt);
        
        return response()->json([
            'message' => 'Baggage belt assigned successfully.',
            'flight' => $flight->load('arrival.baggageBelt')
        ]);
    }

    /**
     * Handle the admin API request to update a flight's time.
     * POST /api/admin/flights/{flight}/time
     */
    public function updateTime(Request $request, Flight $flight): JsonResponse
    {
        $validated = $request->validate([
            'time_type' => 'required|string|in:scheduled_departure,scheduled_arrival',
            'new_time' => 'required|date_format:Y-m-d H:i:s',
        ]);

        $this->flightService->updateFlightTime(
            $flight,
            $validated['time_type'],
            Carbon::parse($validated['new_time'])
        );
        
        return response()->json([
            'message' => 'Flight time updated successfully.',
            'flight' => $flight
        ]);
    }
}