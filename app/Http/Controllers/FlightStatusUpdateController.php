<?php

namespace App\Http\Controllers;

use App\Models\Flight;
use App\Models\FlightStatus;
use App\Models\FlightEvent;
use App\Models\Gate;
use App\Models\BaggageBelt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * FlightStatusUpdateController
 * 
 * FIS Core Function: Quick status updates and real-time flight information distribution
 * 
 * Purpose:
 * - Provide airport staff with quick interface to update flight status, gates, and baggage claims
 * - Process status changes and distribute to connected systems
 * - Log all changes for audit and compliance
 * 
 * Integration Points:
 * - When status changes: Notify PMS, BHS, and passengers
 * - When gate changes: Update BHS baggage routing, notify passengers
 * - When delayed/cancelled: Notify all systems and trigger appropriate actions
 * 
 * This is a core FIS responsibility: Acting as the single source of truth for flight status.
 */
class FlightStatusUpdateController extends Controller
{
    /**
     * Display the quick status update interface.
     * 
     * Shows all flights for quick operational updates.
     * Used by: Airport operations staff, ground handlers
     */
    public function index(Request $request): Response
    {
        // Get all flights
        $flights = Flight::with([
            'status',
            'airline',
            'origin',
            'destination',
            'gate.terminal',
            'baggageBelt'
        ])
            ->orderBy('scheduled_departure_time', 'desc')
            ->get()
            ->map(function ($flight) {
                return [
                    'id' => $flight->id,
                    'flight_number' => $flight->flight_number,
                    'airline' => $flight->airline?->airline_name,
                    'route' => "{$flight->origin?->iata_code} → {$flight->destination?->iata_code}",
                    'scheduled_departure' => $flight->scheduled_departure_time->format('Y-m-d H:i'),
                    'status' => [
                        'id' => $flight->status_id,
                        'code' => $flight->status?->status_code,
                        'name' => $flight->status?->status_name,
                    ],
                    'gate' => [
                        'id' => $flight->gate_id,
                        'code' => $flight->gate?->gate_code,
                        'terminal' => $flight->gate?->terminal?->name ?? $flight->gate?->terminal?->terminal_code,
                    ],
                    'baggage_belt' => [
                        'id' => $flight->baggageBelt?->id,
                        'code' => $flight->baggageBelt?->belt_code,
                        'status' => $flight->baggageBelt?->status,
                    ],
                ];
            });

        // Get available options
        $statuses = FlightStatus::all(['id', 'status_code', 'status_name'])->map(function ($status) {
            return [
                'id' => $status->id,
                'code' => $status->status_code,
                'name' => $status->status_name,
            ];
        });
        $gates = Gate::with('terminal')->get()->map(function ($gate) {
            return [
                'id' => $gate->id,
                'code' => $gate->gate_code,
                'terminal' => $gate->terminal?->name ?? $gate->terminal?->terminal_code,
                'display' => ($gate->terminal?->terminal_code ?? '') . '-' . $gate->gate_code,
            ];
        });
        $baggageBelts = BaggageBelt::with('terminal')->get()->map(function ($belt) {
            return [
                'id' => $belt->id,
                'code' => $belt->belt_code,
                'status' => $belt->status,
                'terminal' => $belt->terminal?->name ?? $belt->terminal?->terminal_code,
            ];
        });

        return Inertia::render('flights/status-update', [
            'flights' => $flights,
            'options' => [
                'statuses' => $statuses,
                'gates' => $gates,
                'baggageBelts' => $baggageBelts,
            ],
        ]);
    }

    /**
     * Quick update flight status.
     */
    public function updateStatus(Request $request, Flight $flight)
    {
        $validated = $request->validate([
            'status_id' => 'required|exists:flight_status,id',
            'reason' => 'nullable|string|max:500',
        ]);

        $oldStatus = $flight->status;
        $newStatus = FlightStatus::find($validated['status_id']);
        $flight->update(['fk_id_status_code' => $newStatus->id_status_code]);

        // Log the status change event
        FlightEvent::create([
            'flight_id' => $flight->id,
            'event_type' => 'STATUS_CHANGE',
            'old_value' => $oldStatus?->status_name,
            'new_value' => $flight->status->status_name,
        ]);

        return redirect()->back()->with('success', 'Flight status updated successfully.');
    }

    /**
     * Quick update gate assignment.
     */
    public function updateGate(Request $request, Flight $flight)
    {
        $validated = $request->validate([
            'gate_id' => 'nullable|exists:gates,id',
            'reason' => 'nullable|string|max:500',
        ]);

        $oldGate = $flight->gate;
        $newGate = $validated['gate_id'] ? Gate::find($validated['gate_id']) : null;
        $flight->update(['fk_id_gate_code' => $newGate?->id_gate_code]);

        // Log the gate change event
        FlightEvent::create([
            'flight_id' => $flight->id,
            'event_type' => 'GATE_CHANGE',
            'old_value' => $oldGate?->gate_code,
            'new_value' => $flight->gate?->gate_code ?? 'Unassigned',
        ]);

        return redirect()->back()->with('success', 'Gate assignment updated successfully.');
    }

    /**
     * Quick update baggage belt assignment.
     */
    public function updateBaggageClaim(Request $request, Flight $flight)
    {
        $validated = $request->validate([
            'baggage_belt_id' => 'nullable|exists:baggage_belts,id',
            'reason' => 'nullable|string|max:500',
        ]);

        $oldBelt = $flight->baggageBelt;
        $newBelt = $validated['baggage_belt_id'] ? BaggageBelt::find($validated['baggage_belt_id']) : null;
        $flight->update(['fk_id_belt_code' => $newBelt?->id_belt_code]);

        // Log the baggage belt change event
        FlightEvent::create([
            'flight_id' => $flight->id,
            'event_type' => 'CLAIM_CHANGE',
            'old_value' => $oldBelt?->belt_code,
            'new_value' => $flight->baggageBelt?->belt_code ?? 'Unassigned',
        ]);

        return redirect()->back()->with('success', 'Baggage belt assignment updated successfully.');
    }

    /**
     * Bulk update for multiple flights.
     */
    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'flight_ids' => 'required|array',
            'flight_ids.*' => 'exists:flights,id',
            'update_type' => 'required|in:status,gate,baggage_belt',
            'value' => 'required',
            'reason' => 'nullable|string|max:500',
        ]);

        $flights = Flight::whereIn('id', $validated['flight_ids'])->get();

        foreach ($flights as $flight) {
            switch ($validated['update_type']) {
                case 'status':
                    $oldStatus = $flight->status;
                    $newStatus = FlightStatus::find($validated['value']);
                    $flight->update(['fk_id_status_code' => $newStatus->id_status_code]);
                    
                    FlightEvent::create([
                        'flight_id' => $flight->id,
                        'event_type' => 'STATUS_CHANGE',
                        'old_value' => $oldStatus?->status_name,
                        'new_value' => $flight->status->status_name,
                    ]);
                    break;

                case 'gate':
                    $oldGate = $flight->gate;
                    $newGate = Gate::find($validated['value']);
                    $flight->update(['fk_id_gate_code' => $newGate?->id_gate_code]);
                    
                    FlightEvent::create([
                        'flight_id' => $flight->id,
                        'event_type' => 'GATE_CHANGE',
                        'old_value' => $oldGate?->gate_code,
                        'new_value' => $flight->gate?->gate_code ?? 'Unassigned',
                    ]);
                    break;

                case 'baggage_belt':
                    $oldBelt = $flight->baggageBelt;
                    $newBelt = BaggageBelt::find($validated['value']);
                    $flight->update(['fk_id_belt_code' => $newBelt?->id_belt_code]);
                    
                    FlightEvent::create([
                        'flight_id' => $flight->id,
                        'event_type' => 'CLAIM_CHANGE',
                        'old_value' => $oldBelt?->belt_code,
                        'new_value' => $flight->baggageBelt?->belt_code ?? 'Unassigned',
                    ]);
                    break;
            }
        }

        return redirect()->back()->with('success', count($flights) . ' flights updated successfully.');
    }
}
