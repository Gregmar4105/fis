<?php

namespace App\Http\Controllers;

use App\Models\Gate;
use App\Models\Terminal;
use App\Models\Airline;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GateManagementController extends Controller
{
    /**
     * Display a listing of gates with assignments.
     */
    public function index(Request $request): Response
    {
        $perPage = $this->resolvePerPage($request->integer('per_page', 10));

        $query = Gate::with([
            'terminal.airport',
            'authorizedAirlines'
        ]);

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where('gate_code', 'like', "%{$search}%");
        }

        if ($request->filled('terminal')) {
            $query->where('terminal_id', $request->integer('terminal'));
        }

        if ($request->filled('status')) {
            $status = $request->string('status');
            $query->{$status === 'occupied' ? 'whereHas' : 'whereDoesntHave'}('departures', function ($q) {
                $q->whereHas('flight', function ($flightQuery) {
                    $flightQuery->whereBetween('scheduled_departure_time', [
                        now()->startOfDay(),
                        now()->addDay()->endOfDay(),
                    ]);
                });
            });
        }

        $gates = $query->orderBy('gate_code')
            ->paginate($perPage)
            ->withQueryString()
            ->through(function ($gate) {
            // Get current departures for this gate
            $currentDepartures = $gate->departures()
                ->whereHas('flight', function ($q) {
                    $q->whereBetween('scheduled_departure_time', [
                        now()->startOfDay(),
                        now()->addDay()->endOfDay()
                    ]);
                })
                ->with(['flight.status', 'flight.airline'])
                ->get();

            return [
                'id' => $gate->id,
                'gate_code' => $gate->gate_code,
                'gate_status' => $gate->gate_status ?? 'Open',
                'terminal' => [
                    'id' => $gate->terminal->id,
                    'code' => $gate->terminal->terminal_code,
                    'name' => $gate->terminal->name,
                    'airport' => $gate->terminal->airport->iata_code,
                ],
                'current_flights' => $currentDepartures->map(function ($departure) {
                    return [
                        'flight_number' => $departure->flight->flight_number,
                        'airline' => $departure->flight->airline?->airline_name ?? 'N/A',
                        'status' => $departure->flight->status?->status_name ?? 'N/A',
                        'scheduled_departure' => $departure->flight->scheduled_departure_time->format('H:i'),
                    ];
                }),
                'authorized_airlines' => $gate->authorizedAirlines->map(function ($airline) {
                    return [
                        'code' => $airline->airline_code,
                        'name' => $airline->airline_name,
                    ];
                }),
                'is_occupied' => $currentDepartures->where('flight.status.status_code', 'BRD')->isNotEmpty(),
            ];
        });

        $terminals = Terminal::with('airport')->orderBy('terminal_code')->get();
        $airlines = Airline::orderBy('airline_name')->get(['airline_code', 'airline_name']);

        return Inertia::render('management/gates', [
            'gates' => $gates->withQueryString(),
            'terminals' => $terminals,
            'airlines' => $airlines,
            'filters' => [
                'search' => $request->input('search', ''),
                'terminal' => $request->input('terminal', ''),
                'status' => $request->input('status', ''),
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Store a newly created gate.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'terminal_id' => 'required|exists:terminals,id',
            'gate_code' => 'required|string|max:10',
            'gate_status' => 'nullable|string|max:50',
            'airline_codes' => 'nullable|array',
            'airline_codes.*' => 'exists:airlines,airline_code',
        ]);

        $airlineCodes = $validated['airline_codes'] ?? [];
        unset($validated['airline_codes']);

        // Set default gate_status if not provided
        if (empty($validated['gate_status'])) {
            $validated['gate_status'] = 'Open';
        }

        $gate = Gate::create($validated);

        if (!empty($airlineCodes)) {
            $gate->authorizedAirlines()->sync($airlineCodes);
        }

        return redirect()->back()->with('success', 'Gate created successfully.');
    }

    /**
     * Update the specified gate.
     */
    public function update(Request $request, Gate $gate)
    {
        $validated = $request->validate([
            'gate_code' => 'sometimes|string|max:10',
            'terminal_id' => 'sometimes|exists:terminals,id',
            'gate_status' => 'sometimes|string|max:50',
            'airline_codes' => 'sometimes|array',
            'airline_codes.*' => 'exists:airlines,airline_code',
        ]);

        $airlineCodes = $validated['airline_codes'] ?? null;
        unset($validated['airline_codes']);

        $gate->update($validated);

        if (is_array($airlineCodes)) {
            $gate->authorizedAirlines()->sync($airlineCodes);
        }

        return redirect()->back()->with('success', 'Gate updated successfully.');
    }

    /**
     * Remove the specified gate.
     */
    public function destroy(Gate $gate)
    {
        // Check if gate has active flights
        if ($gate->departures()->whereHas('flight', function ($query) {
            $query->whereIn('status_id', function ($q) {
                $q->select('id')
                    ->from('flight_status')
                    ->whereIn('status_code', ['SCH', 'BRD', 'DLY']);
            });
        })->exists()) {
            return redirect()->back()->with('error', 'Cannot delete gate with active flights.');
        }

        $gate->delete();

        return redirect()->back()->with('success', 'Gate deleted successfully.');
    }

    /**
     * Assign authorized airlines to a gate.
     */
    public function assignAirlines(Request $request, Gate $gate)
    {
        $validated = $request->validate([
            'airline_codes' => 'required|array',
            'airline_codes.*' => 'exists:airlines,airline_code',
        ]);

        $gate->authorizedAirlines()->sync($validated['airline_codes']);

        return redirect()->back()->with('success', 'Airline authorizations updated successfully.');
    }

    protected function resolvePerPage(int $perPage): int
    {
        $options = [10, 25, 50];
        return in_array($perPage, $options, true) ? $perPage : 10;
    }
}
