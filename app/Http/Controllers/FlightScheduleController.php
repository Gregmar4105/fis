<?php

namespace App\Http\Controllers;

use App\Models\Flight;
use App\Models\FlightStatus;
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
            'baggageClaim',
            // Load connection information
            'inboundConnections',
            'outboundConnections',
        ]);
    }

    /**
     * Displays the filtered flight schedule based on type (all, arrivals, departures).
     *
     * @param string $type Can be 'all', 'arrivals', or 'departures'.
     */
    public function index(Request $request, string $type = 'all'): Response
    {
        $query = $this->baseQuery();

        // 1. Apply Filtering Logic
        switch (strtolower($type)) {
            case 'arrivals':
                // Flights arriving AT the local airport (MNL)
                $query->where('destination_code', self::LOCAL_IATA_CODE)
                      // Filter out ARRIVED flights
                      ->where('fk_id_status_code', '!=', FlightStatus::where('status_code', 'ARR')->first()->id_status_code ?? '3-ARR')
                      ->orderBy('scheduled_arrival_time', 'asc');
                break;
                
            case 'departures':
                // Flights departing FROM the local airport (MNL)
                $query->where('origin_code', self::LOCAL_IATA_CODE)
                      // Filter out DEPARTED flights
                      ->where('fk_id_status_code', '!=', FlightStatus::where('status_code', 'DEP')->first()->id_status_code ?? '2-DEP')
                      ->orderBy('scheduled_departure_time', 'asc');
                break;
            
            case 'all':
            default:
                // All upcoming flights, ordered by nearest departure time globally
                $query->orderBy('scheduled_departure_time', 'asc');
                break;
        }

        // 2. Global Filter: Remove Cancelled and Completed flights from the list view
        $query->whereNotIn('fk_id_status_code', [
            FlightStatus::where('status_code', 'ARR')->first()->id_status_code ?? '3-ARR',
            FlightStatus::where('status_code', 'CNX')->first()->id_status_code ?? '5-CNX',
        ]);


        $flights = $query->paginate(10)->through(function ($flight) use ($type) {
            // Include a helper property for the frontend (React) to determine display logic
            $flight->type = ($flight->destination_code === self::LOCAL_IATA_CODE) ? 'Arrival' : 'Departure';
            
            // Add connection status
            $flight->has_connections = $flight->inboundConnections->count() > 0 || $flight->outboundConnections->count() > 0;
            
            return $flight;
        });

        // Determine the page title based on the schedule type
        $title = match($type) {
            'arrivals' => 'Arrivals - ' . self::LOCAL_IATA_CODE,
            'departures' => 'Departures - ' . self::LOCAL_IATA_CODE,
            default => 'All Flight Schedules',
        };

        // 3. Render the dynamic React page
        return Inertia::render('flights/index', [
            'flights' => $flights,
            'scheduleType' => $type,
            'localAirport' => self::LOCAL_IATA_CODE,
            'title' => $title,
        ]);
    }
}