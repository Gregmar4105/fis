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
use Inertia\Inertia;
use Inertia\Response;

class FlightScheduleController extends Controller
{
    /**
     * The IATA code for the primary airport your FIS tracks (e.g., Manila).
     * This allows the system to distinguish between Arrivals and Departures.
     */
    private const LOCAL_IATA_CODE = 'MNL'; 

    /**
     * Eagerly loads all necessary relationships for a complete flight display.
     */
    private function baseQuery()
    {
        return Flight::with([
            'status',
            'airline',
            'origin',
            'destination',
            'aircraft',
            // Load resource facts (actual times, assigned resources)
            'departure.gate.terminal', 
            'arrival.baggageClaim.terminal',
            'gate.terminal',
            'gate.terminal.airport',
            'baggageBelt.terminal',
            'baggageBelt.terminal.airport',
            'baggageClaim',
            // Load terminal directly if available (via fk_id_terminal_code)
            'terminalDirect',
            'terminalDirect.airport',
        ]);
        // Note: Connection counts removed to improve performance
        // If needed, can be added back with a more optimized query
    }

    /**
     * Displays the filtered flight schedule based on type (all, arrivals, departures).
     *
     * @param string $type Can be 'all', 'arrivals', or 'departures'.
     */
    public function index(Request $request, string $type = 'all'): Response
    {
        // Get status codes once to avoid repeated queries
        $statusCodes = FlightStatus::pluck('id_status_code', 'status_code')->toArray();
        $arrivedStatus = $statusCodes['ARR'] ?? '3-ARR';
        $departedStatus = $statusCodes['DEP'] ?? '2-DEP';
        $cancelledStatus = $statusCodes['CNX'] ?? '5-CNX';
        
        $query = $this->baseQuery();

        // 1. Apply Filtering Logic
        switch (strtolower($type)) {
            case 'arrivals':
                // Flights arriving AT the local airport (MNL)
                $query->where('destination_code', self::LOCAL_IATA_CODE)
                      // Filter out ARRIVED flights
                      ->where('fk_id_status_code', '!=', $arrivedStatus)
                      ->orderBy('scheduled_arrival_time', 'asc');
                break;
                
            case 'departures':
                // Flights departing FROM the local airport (MNL)
                $query->where('origin_code', self::LOCAL_IATA_CODE)
                      // Filter out DEPARTED flights
                      ->where('fk_id_status_code', '!=', $departedStatus)
                      ->orderBy('scheduled_departure_time', 'asc');
                break;
            
            case 'all':
            default:
                // All upcoming flights, ordered by nearest departure time globally
                $query->orderBy('scheduled_departure_time', 'asc');
                break;
        }

        // 2. Global Filter: Remove only Cancelled flights from the list view
        // Note: Keep ARRIVED flights visible to match manage flights count
        $query->whereNotIn('fk_id_status_code', [
            $cancelledStatus,
        ]);


        // Get flight IDs for efficient connection checking (clone query to avoid affecting pagination)
        $flightIds = (clone $query)->pluck('id')->toArray();
        
        // Check connections in a single optimized query and count them separately
        $connectionsMap = [];
        $inboundCounts = [];
        $outboundCounts = [];
        if (!empty($flightIds)) {
            $connections = \DB::table('flight_connections')
                ->where(function($q) use ($flightIds) {
                    $q->whereIn('arrival_flight_id', $flightIds)
                      ->orWhereIn('departure_flight_id', $flightIds);
                })
                ->select('arrival_flight_id', 'departure_flight_id')
                ->get();
            
            foreach ($connections as $conn) {
                // Count inbound connections (flights connecting TO this flight)
                if ($conn->arrival_flight_id && in_array($conn->arrival_flight_id, $flightIds)) {
                    $connectionsMap[$conn->arrival_flight_id] = true;
                    $inboundCounts[$conn->arrival_flight_id] = ($inboundCounts[$conn->arrival_flight_id] ?? 0) + 1;
                }
                // Count outbound connections (flights connecting FROM this flight)
                if ($conn->departure_flight_id && in_array($conn->departure_flight_id, $flightIds)) {
                    $connectionsMap[$conn->departure_flight_id] = true;
                    $outboundCounts[$conn->departure_flight_id] = ($outboundCounts[$conn->departure_flight_id] ?? 0) + 1;
                }
            }
        }
        
        $flights = $query->paginate(10)->through(function ($flight) use ($type, $connectionsMap, $inboundCounts, $outboundCounts) {
            // Include a helper property for the frontend (React) to determine display logic
            $flight->type = ($flight->destination_code === self::LOCAL_IATA_CODE) ? 'Arrival' : 'Departure';
            
            // Connection status - check from optimized map
            $flight->has_connections = isset($connectionsMap[$flight->id]) && $connectionsMap[$flight->id];
            
            // Set connection counts for display (frontend uses array length)
            $inboundCount = $inboundCounts[$flight->id] ?? 0;
            $outboundCount = $outboundCounts[$flight->id] ?? 0;
            $flight->inbound_connections = array_fill(0, $inboundCount, (object)[]);
            $flight->outbound_connections = array_fill(0, $outboundCount, (object)[]);
            
            // Use direct terminal if available, otherwise fall back to gate's terminal
            if (!$flight->terminalDirect && $flight->gate && $flight->gate->terminal) {
                $flight->terminal = $flight->gate->terminal;
            } elseif ($flight->terminalDirect) {
                $flight->terminal = $flight->terminalDirect;
            }
            
            return $flight;
        });

        // Determine the page title based on the schedule type (global system, no airport code in title)
        $title = match($type) {
            'arrivals' => 'Arrivals',
            'departures' => 'Departures',
            default => 'All Flight Schedules',
        };

        // Get dropdown options for create/edit forms
        $statuses = FlightStatus::all(['id', 'id_status_code', 'status_code', 'status_name']);
        $airlines = Airline::all(['airline_code', 'airline_name']);
        $airports = Airport::all(['iata_code', 'airport_name', 'city', 'timezone']);
        $aircraft = Aircraft::all(['icao_code', 'manufacturer', 'model_name']);
        $gates = Gate::with(['terminal', 'terminal.airport'])->get();
        $baggageBelts = BaggageBelt::with(['terminal', 'terminal.airport'])->get();

        // 3. Render the dynamic React page
        return Inertia::render('flights/index', [
            'flights' => $flights,
            'scheduleType' => $type,
            'localAirport' => self::LOCAL_IATA_CODE, // Keep for filtering logic, but don't display in UI
            'title' => $title,
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
}