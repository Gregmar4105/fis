<?php

namespace App\Http\Controllers;

use App\Models\Flight;
use App\Models\FlightStatus;
use App\Models\FlightEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Display the FIS dashboard with flight statistics and system alerts.
     */
    public function index(): Response
    {
        // Use the same logic as FlightScheduleController for consistency
        $statusCodes = FlightStatus::pluck('id_status_code', 'status_code')->toArray();
        $arrivedStatus = $statusCodes['ARR'] ?? '3-ARR';
        $departedStatus = $statusCodes['DEP'] ?? '2-DEP';
        $cancelledStatus = $statusCodes['CNX'] ?? '5-CNX';
        $delayedId = $statusCodes['DLY'] ?? null;
        
        // Base query matching FlightScheduleController
        $baseQuery = Flight::with([
            'status',
            'airline',
            'origin',
            'destination',
            'aircraft',
            'gate.terminal',
            'gate.terminal.airport',
            'baggageBelt.terminal',
            'baggageBelt.terminal.airport',
            'terminalDirect',
            'terminalDirect.airport',
        ])
        ->whereNotIn('fk_id_status_code', [$cancelledStatus])
        ->orderBy('scheduled_departure_time', 'asc');

        // Calculate statistics using the same logic as all schedules page
        $totalFlightsQuery = (clone $baseQuery);
        $arrivalsQuery = (clone $baseQuery)->where('destination_code', 'MNL')->where('fk_id_status_code', '!=', $arrivedStatus);
        $departuresQuery = (clone $baseQuery)->where('origin_code', 'MNL')->where('fk_id_status_code', '!=', $departedStatus);
        
        // Count connections efficiently - count unique flights that have connections
        $flightIds = (clone $baseQuery)->pluck('id')->toArray();
        $connectionsCount = 0;
        if (!empty($flightIds)) {
            $connectedFlightIds = \DB::table('flight_connections')
                ->where(function($q) use ($flightIds) {
                    $q->whereIn('arrival_flight_id', $flightIds)
                      ->orWhereIn('departure_flight_id', $flightIds);
                })
                ->selectRaw('COALESCE(arrival_flight_id, departure_flight_id) as flight_id')
                ->distinct()
                ->pluck('flight_id')
                ->toArray();
            $connectionsCount = count($connectedFlightIds);
        }

        $stats = [
            'totalFlights' => $totalFlightsQuery->count(),
            'arrivals' => $arrivalsQuery->count(),
            'departures' => $departuresQuery->count(),
            'delayed' => $delayedId ? (clone $baseQuery)->where('fk_id_status_code', $delayedId)->count() : 0,
            'cancelled' => $cancelledStatus ? Flight::where('fk_id_status_code', $cancelledStatus)->count() : 0,
            'connections' => $connectionsCount,
        ];

        // Get all active flights for statistics, but only 5 for display
        $allFlights = $baseQuery->get();
        
        $activeFlights = $allFlights->take(5)
            ->map(function ($flight) {
                // Use direct terminal if available, otherwise fall back to gate's terminal
                $terminal = null;
                if ($flight->terminalDirect) {
                    $terminal = $flight->terminalDirect->terminal_code ?? $flight->terminalDirect->name;
                } elseif ($flight->gate && $flight->gate->terminal) {
                    $terminal = $flight->gate->terminal->terminal_code ?? $flight->gate->terminal->name;
                } elseif ($flight->baggageBelt && $flight->baggageBelt->terminal) {
                    $terminal = $flight->baggageBelt->terminal->terminal_code ?? $flight->baggageBelt->terminal->name;
                }
                
                return [
                    'id' => $flight->id,
                    'flight_number' => $flight->flight_number,
                    'airline' => $flight->airline?->airline_name,
                    'airline_code' => $flight->airline?->airline_code,
                    'origin' => $flight->origin?->iata_code,
                    'destination' => $flight->destination?->iata_code,
                    'scheduled_departure' => $flight->scheduled_departure_time->toIso8601String(),
                    'scheduled_arrival' => $flight->scheduled_arrival_time?->toIso8601String(),
                    'status' => $flight->status?->status_name,
                    'status_code' => $flight->status?->status_code,
                    'gate' => $flight->gate?->gate_code,
                    'terminal' => $terminal,
                    'baggage_belt' => $flight->baggageBelt?->belt_code,
                    'aircraft' => $flight->aircraft ? [
                        'icao_code' => $flight->aircraft->icao_code,
                        'manufacturer' => $flight->aircraft->manufacturer,
                        'model_name' => $flight->aircraft->model_name,
                    ] : null,
                ];
            });

        // Get system alerts (recent critical events)
        $systemAlerts = $this->getSystemAlerts();
        
        // Get recent flight events for activity feed
        $recentEvents = FlightEvent::with(['flight.status', 'flight.airline', 'flight.origin', 'flight.destination'])
            ->where('timestamp', '>=', now()->subDays(7))
            ->orderBy('timestamp', 'desc')
            ->limit(6)
            ->get()
            ->map(function ($event) {
                return [
                    'id' => $event->id,
                    'flight_id' => $event->flight_id,
                    'flight_number' => $event->flight?->flight_number ?? 'Unknown',
                    'event_type' => $event->event_type,
                    'old_value' => $event->old_value,
                    'new_value' => $event->new_value,
                    'timestamp' => $event->timestamp ? Carbon::parse($event->timestamp)->toIso8601String() : null,
                    'description' => $event->description ?? null,
                    'airline' => $event->flight?->airline?->airline_name,
                    'origin' => $event->flight?->origin?->iata_code,
                    'destination' => $event->flight?->destination?->iata_code,
                    'status' => $event->flight?->status?->status_name,
                    'status_code' => $event->flight?->status?->status_code,
                ];
            });

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'activeFlights' => $activeFlights,
            'systemAlerts' => $systemAlerts,
            'recentEvents' => $recentEvents,
        ]);
    }

    /**
     * Get system alerts including integration failures and critical flight events.
     */
    private function getSystemAlerts(): array
    {
        $alerts = [];

        // Get status IDs from cache
        $statuses = Cache::get('flight_statuses', []);
        $scheduledId = $statuses['SCH'] ?? null;
        $boardingId = $statuses['BRD'] ?? null;
        $delayedId = $statuses['DLY'] ?? null;

        // Check for integration sync failures (using flight_events table)
        // Note: FlightEvent uses 'timestamp' column, not 'occurred_at'
        try {
            $recentFailures = FlightEvent::where('event_type', 'sync_failed')
                ->where('timestamp', '>=', now()->subHours(24))
                ->with('flight')
                ->latest('timestamp')
                ->limit(5)
                ->get()
                ->map(function ($event) {
                    return [
                        'type' => 'integration_failure',
                        'severity' => 'critical',
                        'message' => "Sync failed for flight " . ($event->flight->flight_number ?? 'Unknown'),
                        'timestamp' => $event->timestamp ? Carbon::parse($event->timestamp)->diffForHumans() : 'Unknown',
                    ];
                });
            
            $alerts = array_merge($alerts, $recentFailures->toArray());
        } catch (\Exception $e) {
            // If FlightEvent queries fail, continue with other alerts
        }

        // Check for flights with missing gate assignments (departing within 2 hours)
        $missingGates = Flight::whereNull('fk_id_gate_code')
            ->whereIn('fk_id_status_code', [$scheduledId, $boardingId])
            ->where('scheduled_departure_time', '>=', now())
            ->where('scheduled_departure_time', '<=', now()->addHours(2))
            ->count();

        if ($missingGates > 0) {
            $alerts[] = [
                'type' => 'missing_gates',
                'severity' => 'warning',
                'message' => "{$missingGates} flight(s) departing soon without gate assignment",
                'timestamp' => 'Now',
                'count' => $missingGates,
            ];
        }

        // Check for delayed flights (upcoming flights only)
        $delayedCount = $delayedId ? Flight::where('fk_id_status_code', $delayedId)
            ->where('scheduled_departure_time', '>=', now()->startOfDay())
            ->count() : 0;

        if ($delayedCount > 0) {
            $alerts[] = [
                'type' => 'delayed_flights',
                'severity' => 'info',
                'message' => "{$delayedCount} flight(s) currently delayed",
                'timestamp' => 'Now',
                'count' => $delayedCount,
            ];
        }

        return $alerts;
    }
}
