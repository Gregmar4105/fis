<?php

namespace App\Http\Controllers;

use App\Models\Flight;
use App\Models\FlightStatus;
use App\Models\Airline;
use App\Models\Airport;
use App\Models\Aircraft;
use App\Models\Gate;
use App\Models\BaggageBelt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * FlightManagementController
 * 
 * FIS Responsibility: Create and manage flight operations globally
 * 
 * This controller handles CRUD operations for flights within the FIS system.
 * FIS is the central system that creates, manages, and distributes flight information.
 * 
 * FIS Role: Create → Manage → Distribute
 * 
 * Flight Management:
 * - Flight creation and scheduling (FIS creates flights)
 * - Status updates from ATC (clearance, weather, delays)
 * - Gate and terminal assignments
 * - Baggage claim area assignments
 * 
 * Data Distribution:
 * - Flight schedules sent to ARS for booking operations
 * - Updates sent to PMS for passenger handling
 * - Updates sent to BHS for baggage routing
 * - Updates displayed to passengers via FIDS/apps
 * 
 * Integration Points:
 * - ARS: Receives flight schedules for booking availability
 * - PMS: Receives flight updates for check-in/boarding
 * - BHS: Receives gate/baggage assignments for routing
 * - ATC: Provides NOTAMs and clearances affecting flights
 */
class FlightManagementController extends Controller
{
    /**
     * Display a listing of all flights with CRUD operations.
     * 
     * Filters: search, status, date range
     * Used by: Airport staff for monitoring and management
     */
    public function index(Request $request): Response
    {
        $query = Flight::with([
            'status',
            'airline',
            'origin',
            'destination',
            'gate.terminal',
            'baggageBelt',
            'aircraft'
        ]);

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('flight_number', 'like', "%{$search}%")
                  ->orWhere('airline_code', 'like', "%{$search}%")
                  ->orWhere('origin_code', 'like', "%{$search}%")
                  ->orWhere('destination_code', 'like', "%{$search}%");
            });
        }

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('fk_id_status_code', $request->status);
        }

        // Filter by date range
        if ($request->has('date_from')) {
            $query->whereDate('scheduled_departure_time', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('scheduled_departure_time', '<=', $request->date_to);
        }

        // Order by scheduled departure time
        $query->orderBy('scheduled_departure_time', $request->get('order', 'asc'));

        $flights = $query->paginate(10)->withQueryString();

        // Get dropdown options for create/edit forms
        $statuses = FlightStatus::all(['id', 'status_code', 'status_name']);
        $airlines = Airline::all(['airline_code', 'airline_name']);
        $airports = Airport::all(['iata_code', 'airport_name', 'city', 'timezone']);
        $aircraft = Aircraft::all(['icao_code', 'manufacturer', 'model_name']);
        $gates = Gate::with(['terminal', 'terminal.airport'])->get();
        $baggageBelts = BaggageBelt::with(['terminal', 'terminal.airport'])->get();

        return Inertia::render('flights/management', [
            'flights' => $flights,
            'filters' => $request->only(['search', 'status', 'date_from', 'date_to', 'order']),
            'options' => [
                'statuses' => $statuses,
                'airlines' => $airlines,
                'airports' => $airports,
                'aircraft' => $aircraft,
                'gates' => $gates,
                'baggageBelts' => $baggageBelts,
            ],
        ]);
    }

    /**
     * Store a newly created flight in the database.
     * 
     * FIS creates and manages flights globally.
     */
    public function store(Request $request)
    {
        // If client provided timezone info for origin/destination, convert local times to UTC
        if ($request->has('departure_tz') && $request->scheduled_departure_time) {
            try {
                $dt = Carbon::parse($request->scheduled_departure_time, $request->departure_tz)->setTimezone('UTC');
                $request->merge(['scheduled_departure_time' => $dt->toDateTimeString()]);
            } catch (\Exception $e) {
                // leave original value; validator will catch invalid format
            }
        }
        if ($request->has('arrival_tz') && $request->scheduled_arrival_time) {
            try {
                $dt = Carbon::parse($request->scheduled_arrival_time, $request->arrival_tz)->setTimezone('UTC');
                $request->merge(['scheduled_arrival_time' => $dt->toDateTimeString()]);
            } catch (\Exception $e) {
                // leave original value
            }
        }

        $validated = $request->validate([
            'flight_number' => 'required|string|max:10',
            'airline_code' => 'required|string|exists:airlines,airline_code',
            'aircraft_icao_code' => 'nullable|string|exists:aircrafts,icao_code',
            'origin_code' => 'required|string|exists:airports,iata_code',
            'destination_code' => 'required|string|exists:airports,iata_code|different:origin_code',
            'scheduled_departure_time' => 'required|date',
            'scheduled_arrival_time' => 'required|date|after:scheduled_departure_time',
            'fk_id_status_code' => 'required|exists:flight_status,id_status_code',
            'fk_id_gate_code' => 'nullable|exists:gates,id_gate_code',
            'fk_id_belt_code' => 'nullable|exists:baggage_belts,id_belt_code',
        ]);

        // Create the flight
        $flight = Flight::create($validated);

        // Create initial event log
        $flight->events()->create([
            'event_type' => 'created',
            'description' => 'Flight created in FIS',
            'timestamp' => now(),
        ]);

        // Record computed flight hours as an event (use UTC times from validated payload)
        try {
            if (!empty($validated['scheduled_departure_time']) && !empty($validated['scheduled_arrival_time'])) {
                $dep = Carbon::parse($validated['scheduled_departure_time'])->setTimezone('UTC');
                $arr = Carbon::parse($validated['scheduled_arrival_time'])->setTimezone('UTC');
                $minutes = $dep->diffInMinutes($arr);
                $hours = round($minutes / 60, 2);
                $flight->events()->create([
                    'event_type' => 'flight_hours',
                    'description' => 'Scheduled flight duration (hours)',
                    'new_value' => (string)$hours,
                    'timestamp' => now(),
                ]);
            }
        } catch (\Exception $e) {
            // non-blocking: log if needed, but do not fail creation
        }

        return redirect()->back()->with('success', 'Flight created successfully.');
    }

    /**
     * Update the specified flight in the database.
     */
    public function update(Request $request, Flight $flight)
    {
        $validated = $request->validate([
            'flight_number' => 'sometimes|string|max:10',
            'airline_code' => 'sometimes|string|exists:airlines,airline_code',
            'origin_code' => 'sometimes|string|exists:airports,iata_code',
            'destination_code' => 'sometimes|string|exists:airports,iata_code|different:origin_code',
            'aircraft_icao_code' => 'nullable|string|exists:aircrafts,icao_code',
            'fk_id_gate_code' => 'nullable|exists:gates,id_gate_code',
            'fk_id_belt_code' => 'nullable|exists:baggage_belts,id_belt_code',
            'fk_id_status_code' => 'sometimes|exists:flight_status,id_status_code',
            'scheduled_departure_time' => 'sometimes|date',
            'scheduled_arrival_time' => 'nullable|date|after:scheduled_departure_time',
        ]);

        $flight->update($validated);

        return redirect()->back()->with('success', 'Flight updated successfully.');
    }

    /**
     * Remove the specified flight from the database.
     */
    public function destroy(Flight $flight)
    {
        // Check if flight has any dependencies (arrivals, departures, connections, events)
        $hasDependencies = $flight->arrival()->exists() 
            || $flight->departure()->exists() 
            || $flight->events()->exists()
            || $flight->connections()->exists()
            || $flight->connectingFrom()->exists();

        if ($hasDependencies) {
            return redirect()->back()->with('error', 'Cannot delete flight with existing records. Archive it instead.');
        }

        $flight->delete();

        return redirect()->back()->with('success', 'Flight deleted successfully.');
    }

    /**
     * Display the specified flight with full details.
     */
    public function show(Flight $flight): Response
    {
        $flight->load([
            'status',
            'airline',
            'origin',
            'destination',
            'gate.terminal',
            'baggageBelt',
            'aircraft',
            'arrival',
            'departure',
            'events' => function ($query) {
                $query->orderBy('timestamp', 'desc')->limit(20);
            },
            'inboundConnections.origin',
            'outboundConnections.destination',
        ]);

        return Inertia::render('flights/show', [
            'flight' => $flight,
        ]);
    }
}
