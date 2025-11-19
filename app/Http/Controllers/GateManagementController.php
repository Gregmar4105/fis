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
            if ($status === 'occupied') {
                $occupiedGateIds = \App\Models\Flight::whereBetween('scheduled_departure_time', [
                    now()->startOfDay(),
                    now()->addDay()->endOfDay(),
                ])
                ->whereNotNull('fk_id_gate_code')
                ->pluck('fk_id_gate_code')
                ->toArray();
                $query->whereIn('id_gate_code', $occupiedGateIds);
            } else {
                $occupiedGateIds = \App\Models\Flight::whereBetween('scheduled_departure_time', [
                    now()->startOfDay(),
                    now()->addDay()->endOfDay(),
                ])
                ->whereNotNull('fk_id_gate_code')
                ->pluck('fk_id_gate_code')
                ->toArray();
                $query->whereNotIn('id_gate_code', $occupiedGateIds);
            }
        }

        // Get all gate codes for batch querying
        $gatesPaginated = $query->orderBy('gate_code')
            ->paginate($perPage)
            ->withQueryString();
        
        $gateCodes = $gatesPaginated->pluck('id_gate_code')->filter()->toArray();
        
        // Batch query all flights for these gates in one query
        $allFlights = [];
        if (!empty($gateCodes)) {
            $flights = \App\Models\Flight::whereIn('fk_id_gate_code', $gateCodes)
                ->whereBetween('scheduled_departure_time', [
                    now()->startOfDay(),
                    now()->addDay()->endOfDay()
                ])
                ->with(['status', 'airline'])
                ->get();
            
            // Group flights by gate code for quick lookup
            foreach ($flights as $flight) {
                $gateCode = $flight->fk_id_gate_code;
                if (!isset($allFlights[$gateCode])) {
                    $allFlights[$gateCode] = [];
                }
                $allFlights[$gateCode][] = $flight;
            }
        }
        
        $gates = $gatesPaginated->through(function ($gate) use ($allFlights) {
            // Get flights for this gate from the pre-loaded array
            $currentFlights = $allFlights[$gate->id_gate_code] ?? [];

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
                'current_flights' => collect($currentFlights)->map(function ($flight) {
                    return [
                        'flight_number' => $flight->flight_number,
                        'airline' => $flight->airline?->airline_name ?? 'N/A',
                        'status' => $flight->status?->status_name ?? 'N/A',
                        'scheduled_departure' => $flight->scheduled_departure_time->format('H:i'),
                    ];
                })->toArray(),
                'authorized_airlines' => $gate->authorizedAirlines->map(function ($airline) {
                    return [
                        'code' => $airline->airline_code,
                        'name' => $airline->airline_name,
                    ];
                }),
                'is_occupied' => collect($currentFlights)->filter(function ($flight) {
                    return $flight->status && $flight->status->status_code === 'BRD';
                })->isNotEmpty(),
            ];
        });

        $terminals = Terminal::with('airport')->orderBy('terminal_code')->get();
        $airlines = Airline::orderBy('airline_name')->get(['airline_code', 'airline_name']);
        
        // Get terminals that don't have gates yet
        $terminalsWithGates = Gate::distinct('terminal_id')->pluck('terminal_id')->toArray();
        $terminalsWithoutGates = $terminals->filter(function ($terminal) use ($terminalsWithGates) {
            return !in_array($terminal->id, $terminalsWithGates);
        })->map(function ($terminal) {
            return [
                'id' => $terminal->id,
                'code' => $terminal->terminal_code,
                'name' => $terminal->terminal_code,
                'airport' => $terminal->airport->iata_code,
            ];
        })->values();
        
        // Calculate stats efficiently - batch query all gates and flights
        $allGateCodes = Gate::pluck('id_gate_code')->filter()->toArray();
        $occupiedGateCodes = [];
        
        if (!empty($allGateCodes)) {
            // Get all boarding flights for all gates in one query
            $boardingFlights = \App\Models\Flight::whereIn('fk_id_gate_code', $allGateCodes)
                ->whereBetween('scheduled_departure_time', [
                    now()->startOfDay(),
                    now()->addDay()->endOfDay()
                ])
                ->with('status')
                ->get()
                ->filter(function ($flight) {
                    return $flight->status && $flight->status->status_code === 'BRD';
                })
                ->pluck('fk_id_gate_code')
                ->unique()
                ->toArray();
            
            $occupiedGateCodes = $boardingFlights;
        }
        
        $occupiedCount = count($occupiedGateCodes);

        return Inertia::render('management/gates', [
            'gates' => $gates->withQueryString(),
            'terminals' => $terminals->map(function ($terminal) {
                return [
                    'id' => $terminal->id,
                    'code' => $terminal->terminal_code,
                    'name' => $terminal->terminal_code,
                    'airport' => $terminal->airport->iata_code,
                ];
            }),
            'terminalsWithoutGates' => $terminalsWithoutGates,
            'airlines' => $airlines,
            'filters' => [
                'search' => $request->input('search', ''),
                'terminal' => $request->input('terminal', ''),
                'status' => $request->input('status', ''),
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => Gate::count(),
                'occupied' => $occupiedCount,
                'available' => Gate::count() - $occupiedCount,
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
        $statusCodes = \App\Models\FlightStatus::whereIn('status_code', ['SCH', 'BRD', 'DLY'])
            ->pluck('id_status_code')
            ->toArray();
        
        if (\App\Models\Flight::where('fk_id_gate_code', $gate->id_gate_code)
            ->whereIn('fk_id_status_code', $statusCodes)
            ->exists()) {
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
