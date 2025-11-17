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
        // Get flight status IDs (cached to reduce DB queries)
        $statuses = Cache::remember('flight_statuses', 3600, function () {
            return FlightStatus::pluck('id_status_code', 'status_code')->toArray();
        });

        $scheduledId = $statuses['SCH'] ?? null;
        $boardingId = $statuses['BRD'] ?? null;
        $delayedId = $statuses['DLY'] ?? null;
        $arrivedId = $statuses['ARR'] ?? null;
        $departedId = $statuses['DEP'] ?? null;
        $cancelledId = $statuses['CNX'] ?? null;

        // Get today's flights (active flights within next 24 hours)
        $now = now();
        $tomorrow = now()->addDay();
        
        // Build base query for active flights (not arrived, departed, or cancelled)
        // Show flights from today onwards (not just today/tomorrow)
        $activeFlightsQuery = Flight::query()
            ->whereNotIn('fk_id_status_code', array_filter([$arrivedId, $departedId, $cancelledId]))
            ->where('scheduled_departure_time', '>=', $now->startOfDay());

        // Calculate statistics
        $stats = [
            'totalFlights' => (clone $activeFlightsQuery)->count(),
            'arrivals' => (clone $activeFlightsQuery)->where('destination_code', 'MNL')->count(),
            'departures' => (clone $activeFlightsQuery)->where('origin_code', 'MNL')->count(),
            'delayed' => $delayedId ? (clone $activeFlightsQuery)->where('fk_id_status_code', $delayedId)->count() : 0,
            'onTime' => $scheduledId ? (clone $activeFlightsQuery)->where('fk_id_status_code', $scheduledId)->count() : 0,
            'boarding' => $boardingId ? (clone $activeFlightsQuery)->where('fk_id_status_code', $boardingId)->count() : 0,
        ];

        // Get active flights with full details for the dashboard
        $activeFlights = Flight::with([
            'status',
            'airline',
            'origin',
            'destination',
            'gate.terminal',
            'baggageClaim',
            'aircraft'
        ])
            ->whereNotIn('fk_id_status_code', array_filter([$arrivedId, $departedId, $cancelledId]))
            ->where('scheduled_departure_time', '>=', $now->startOfDay())
            ->orderBy('scheduled_departure_time', 'asc')
            ->limit(10)
            ->get()
            ->map(function ($flight) {
                return [
                    'id' => $flight->id,
                    'flight_number' => $flight->flight_number,
                    'airline' => $flight->airline?->airline_name,
                    'origin' => $flight->origin?->iata_code,
                    'destination' => $flight->destination?->iata_code,
                    'scheduled_departure' => $flight->scheduled_departure_time->format('H:i'),
                    'scheduled_arrival' => $flight->scheduled_arrival_time?->format('H:i'),
                    'status' => $flight->status?->status_name,
                    'status_code' => $flight->status?->status_code,
                    'gate' => $flight->gate?->gate_code,
                    'terminal' => $flight->gate?->terminal?->name ?? $flight->gate?->terminal?->terminal_code,
                    'baggage_belt' => $flight->baggageBelt?->belt_code,
                ];
            });

        // Get system alerts (recent critical events)
        $systemAlerts = $this->getSystemAlerts();

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'activeFlights' => $activeFlights,
            'systemAlerts' => $systemAlerts,
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
