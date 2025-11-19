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
        if ($request->has('status') && $request->status && $request->status !== 'all') {
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
        $query->orderBy('scheduled_departure_time', $request->get('order', 'desc'));

        $flights = $query->paginate(10)->through(function ($flight) {
            // Use direct terminal if available, otherwise fall back to gate's terminal
            if (!$flight->terminalDirect && $flight->gate && $flight->gate->terminal) {
                $flight->terminal = $flight->gate->terminal;
            } elseif ($flight->terminalDirect) {
                $flight->terminal = $flight->terminalDirect;
            }
            
            return $flight;
        })->withQueryString();

        // Get available options - optimized
        $statuses = FlightStatus::all(['id', 'id_status_code', 'status_code', 'status_name']);
        $gates = Gate::with(['terminal', 'terminal.airport'])->get();
        $baggageBelts = BaggageBelt::with(['terminal', 'terminal.airport'])->get();

        return Inertia::render('flights/status-update', [
            'flights' => $flights,
            'filters' => $request->only(['search', 'status', 'date_from', 'date_to', 'order']),
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
            'status_id' => 'required',
            'reason' => 'nullable|string|max:500',
        ]);

        $oldStatus = $flight->status;
        // Try to find by id_status_code first, then by id
        $newStatus = FlightStatus::where('id_status_code', $validated['status_id'])
            ->orWhere('id', $validated['status_id'])
            ->first();
        
        if (!$newStatus) {
            return redirect()->back()->withErrors(['status_id' => 'Invalid status selected.']);
        }
        
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
     * Quick update gate status.
     */
    public function updateGateStatus(Request $request, Flight $flight)
    {
        $validated = $request->validate([
            'gate_status' => 'required|in:Open,Closed',
        ]);

        if (!$flight->gate) {
            return redirect()->back()->with('error', 'Flight does not have an assigned gate.');
        }

        $oldStatus = $flight->gate->gate_status;
        $flight->gate->update(['gate_status' => $validated['gate_status']]);

        // Log the gate status change event
        FlightEvent::create([
            'flight_id' => $flight->id,
            'event_type' => 'GATE_CHANGE',
            'old_value' => $oldStatus ?? 'N/A',
            'new_value' => $validated['gate_status'],
            'description' => 'Gate status updated',
        ]);

        return redirect()->back()->with('success', 'Gate status updated successfully.');
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
