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
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
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
            'gate.terminal.airport',
            'baggageBelt.terminal',
            'baggageBelt.terminal.airport',
            'aircraft',
            'terminalDirect',
            'terminalDirect.airport',
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

        // Get flight IDs for efficient connection checking
        $flightIds = (clone $query)->pluck('id')->toArray();
        
        // Check connections in a single optimized query
        $connectionsMap = [];
        if (!empty($flightIds)) {
            $connections = \DB::table('flight_connections')
                ->where(function($q) use ($flightIds) {
                    $q->whereIn('arrival_flight_id', $flightIds)
                      ->orWhereIn('departure_flight_id', $flightIds);
                })
                ->select('arrival_flight_id', 'departure_flight_id')
                ->get();
            
            foreach ($connections as $conn) {
                if ($conn->arrival_flight_id) {
                    $connectionsMap[$conn->arrival_flight_id] = true;
                }
                if ($conn->departure_flight_id) {
                    $connectionsMap[$conn->departure_flight_id] = true;
                }
            }
        }

        $flights = $query->paginate(10)->through(function ($flight) use ($connectionsMap) {
            // Connection status
            $flight->has_connections = isset($connectionsMap[$flight->id]) && $connectionsMap[$flight->id];
            
            // Use direct terminal if available, otherwise fall back to gate's terminal
            if (!$flight->terminalDirect && $flight->gate && $flight->gate->terminal) {
                $flight->terminal = $flight->gate->terminal;
            } elseif ($flight->terminalDirect) {
                $flight->terminal = $flight->terminalDirect;
            }
            
            return $flight;
        })->withQueryString();

        // Get dropdown options for create/edit forms
        // Return the canonical status key used in the production dump: `id_status_code` (string)
        $statuses = FlightStatus::all(['id', 'id_status_code', 'status_code', 'status_name']);
        $airlines = Airline::all(['airline_code', 'airline_name']);
        $airports = Airport::all(['iata_code', 'airport_name', 'city', 'timezone']);
        $aircraft = Aircraft::all(['icao_code', 'manufacturer', 'model_name']);
        // Get gates and belts with their related terminal and airport data
        // Eloquent will automatically include all fields including id_gate_code and id_belt_code
        $gates = Gate::with(['terminal', 'terminal.airport'])->get();
        $baggageBelts = BaggageBelt::with(['terminal', 'terminal.airport'])->get();

        // Provide recent arrival flights as candidate connecting flights.
        // These are flights that have arrived or will arrive soon, which can be connected to new departure flights.
        // Frontend will filter these by selected origin to suggest appropriate connections.
        $connectingFlights = Flight::query()
            ->select(['id', 'flight_number', 'airline_code', 'origin_code', 'destination_code', 'scheduled_departure_time', 'scheduled_arrival_time'])
            ->whereNotNull('scheduled_arrival_time')
            ->whereBetween('scheduled_arrival_time', [now()->subHours(12), now()->addHours(72)]) // Extended to 72 hours for more options
            ->orderBy('scheduled_arrival_time', 'desc')
            ->limit(500) // Increased limit for more options
            ->get();

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
                'connectingFlights' => $connectingFlights,
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
        // If client provided connection info but did not provide scheduled departure,
        // compute the scheduled departure server-side from the connecting flight's
        // scheduled arrival + minimum connecting time (authoritative source).
        if ((!$request->has('scheduled_departure_time') || !$request->scheduled_departure_time) && $request->has('connections') && is_array($request->connections) && count($request->connections)) {
            $first = $request->connections[0];
            if (is_array($first) && !empty($first['departure_flight_id'])) {
                try {
                    $depFlight = Flight::find((int) $first['departure_flight_id']);
                    if ($depFlight && $depFlight->scheduled_arrival_time) {
                        $minCt = isset($first['minimum_connecting_time']) ? (int)$first['minimum_connecting_time'] : 0;
                        $computed = Carbon::parse($depFlight->scheduled_arrival_time)->addMinutes($minCt);
                        // store as local string in request for subsequent tz conversion
                        $request->merge(['scheduled_departure_time' => $computed->toDateTimeString()]);
                    }
                } catch (\Exception $e) {
                    // non-blocking: allow later validation to catch missing/invalid times
                }
            }
        }

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

        $rules = [
            'flight_number' => 'required|string|max:10',
            'airline_code' => 'required|string|exists:airlines,airline_code',
            'aircraft_icao_code' => 'nullable|string|exists:aircrafts,icao_code',
            'origin_code' => 'required|string|exists:airports,iata_code',
            'destination_code' => 'required|string|exists:airports,iata_code|different:origin_code',
            'scheduled_departure_time' => 'required|date',
            'scheduled_arrival_time' => 'required|date|after:scheduled_departure_time',
            'fk_id_status_code' => 'required|exists:flight_status,id_status_code',
            'fk_id_terminal_code' => 'nullable|exists:terminals,id_terminal_code',
            'fk_id_gate_code' => 'nullable|exists:gates,id_gate_code',
            'fk_id_belt_code' => 'nullable|exists:baggage_belts,id_belt_code',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errors = $validator->errors()->toArray();
            // If there is an existing flight that matches the provided flight_number, attach a validation-failed event
            try {
                if ($request->has('flight_number') && $request->flight_number) {
                    $existing = Flight::where('flight_number', $request->flight_number)->first();
                    if ($existing) {
                        $existing->events()->create([
                            'event_type' => 'validation_failed',
                            'description' => 'Validation failed on create attempt',
                            'new_value' => json_encode($errors),
                            'timestamp' => now(),
                        ]);
                    }
                }
            } catch (\Exception $e) {
                // Log but do not block returning validation errors
                Log::warning('Failed to persist validation event for flight create', ['error' => $e->getMessage()]);
            }

            return redirect()->back()->withErrors($validator)->withInput();
        }
        $validated = $validator->validated();

        // Create the flight
        $flight = Flight::create($validated);

        // Create initial event log
        $flight->events()->create([
            'event_type' => 'created',
            'description' => 'Flight created in FIS',
            'timestamp' => now(),
        ]);

        // Record server-computed and client-submitted times as a TIME_UPDATE event
        try {
            $times = [];
            // server / authoritative UTC times (from the persisted model)
            if ($flight->scheduled_departure_time) {
                $times['server_scheduled_departure_utc'] = Carbon::parse($flight->scheduled_departure_time)->setTimezone('UTC')->toDateTimeString();
            }
            if ($flight->scheduled_arrival_time) {
                $times['server_scheduled_arrival_utc'] = Carbon::parse($flight->scheduled_arrival_time)->setTimezone('UTC')->toDateTimeString();
            }

            // client-submitted local/UTC (if present)
            if ($request->has('scheduled_departure_local')) $times['scheduled_departure_local'] = $request->scheduled_departure_local;
            if ($request->has('scheduled_departure_utc_client')) $times['scheduled_departure_utc_client'] = $request->scheduled_departure_utc_client;
            if ($request->has('scheduled_arrival_local')) $times['scheduled_arrival_local'] = $request->scheduled_arrival_local;
            if ($request->has('scheduled_arrival_utc_client')) $times['scheduled_arrival_utc_client'] = $request->scheduled_arrival_utc_client;

            if (count($times)) {
                $flight->events()->create([
                    'event_type' => 'TIME_UPDATE',
                    'description' => 'Server and client submitted timestamps',
                    'new_value' => json_encode($times),
                    'timestamp' => now(),
                ]);
            }
        } catch (\Exception $e) {
            // ignore non-fatal event recording errors
        }

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

        // Ensure departure and arrival fact rows exist immediately after creating the master flight.
        // This makes downstream services (n8n, outbound notifications) safer by guaranteeing
        // that `flight_departures` and `flight_arrivals` rows are present even if fields are null.
        try {
            $flight->departure()->firstOrCreate(
                ['flight_id' => $flight->id],
                ['actual_departure_time' => null, 'runway_time' => null, 'gate_id' => null]
            );

            $flight->arrival()->firstOrCreate(
                ['flight_id' => $flight->id],
                ['actual_arrival_time' => null, 'landing_time' => null, 'baggage_belt_id' => null]
            );
        } catch (\Exception $e) {
            // Non-blocking: ensure flight creation does not fail if DB inserts for facts have issues.
            // Consider logging in future if silent failures are not acceptable.
        }

        // If the client provided connection data (connecting flights), attach pivot rows.
        // Expected payload shape: connections: [{ departure_flight_id: <id>, minimum_connecting_time: <minutes> }, ...]
        if ($request->has('connections') && is_array($request->connections)) {
            foreach ($request->connections as $conn) {
                if (!is_array($conn)) {
                    continue;
                }
                if (empty($conn['departure_flight_id'])) {
                    continue;
                }

                $departureId = (int) $conn['departure_flight_id'];
                $pivot = [];
                if (isset($conn['minimum_connecting_time'])) {
                    $pivot['minimum_connecting_time'] = (int) $conn['minimum_connecting_time'];
                }

                try {
                    // Attach as an inbound connection for this flight (this flight = arrival_flight_id)
                    $flight->connections()->syncWithoutDetaching([$departureId => $pivot]);
                } catch (\Exception $e) {
                    // Non-blocking: skip failed pivot attach
                }
            }
        }

        return redirect()->back()->with('success', 'Flight created successfully.');
    }

    /**
     * Update the specified flight in the database.
     */
    public function update(Request $request, Flight $flight)
    {
        // Handle timezone conversion for updates (same as create)
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

        $rules = [
            'flight_number' => 'sometimes|string|max:10',
            'airline_code' => 'sometimes|string|exists:airlines,airline_code',
            'origin_code' => 'sometimes|string|exists:airports,iata_code',
            'destination_code' => 'sometimes|string|exists:airports,iata_code|different:origin_code',
            'aircraft_icao_code' => 'nullable|string|exists:aircrafts,icao_code',
            'fk_id_terminal_code' => 'nullable|exists:terminals,id_terminal_code',
            'fk_id_gate_code' => 'nullable|exists:gates,id_gate_code',
            'fk_id_belt_code' => 'nullable|exists:baggage_belts,id_belt_code',
            'fk_id_status_code' => 'sometimes|exists:flight_status,id_status_code',
            'scheduled_departure_time' => 'sometimes|date',
            'scheduled_arrival_time' => 'nullable|date|after:scheduled_departure_time',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errors = $validator->errors()->toArray();
            try {
                $flight->events()->create([
                    'event_type' => 'validation_failed',
                    'description' => 'Validation failed on update attempt',
                    'new_value' => json_encode($errors),
                    'timestamp' => now(),
                ]);
            } catch (\Exception $e) {
                Log::warning('Failed to persist validation event for flight update', ['flight_id' => $flight->id, 'error' => $e->getMessage()]);
            }

            return redirect()->back()->withErrors($validator)->withInput();
        }

        $validated = $validator->validated();

        $flight->update($validated);

        return redirect()->back()->with('success', 'Flight updated successfully.');
    }

    /**
     * Remove the specified flight from the database.
     */
    public function destroy(Flight $flight)
    {
        // Soft-delete (archive) the flight. SoftDeletes trait will set `deleted_at`.
        // We allow archiving even if related records exist — this avoids destructive hard-deletes.
        $flight->delete();

        // Distinguish messaging for archival vs full deletion (we don't hard-delete here).
        return redirect()->back()->with('success', 'Flight archived successfully.');
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
