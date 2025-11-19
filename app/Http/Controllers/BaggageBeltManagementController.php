<?php

namespace App\Http\Controllers;

use App\Models\BaggageBelt;
use App\Models\Terminal;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BaggageBeltManagementController extends Controller
{
    /**
     * Display a listing of baggage belts with assignments.
     */
    public function index(Request $request): Response
    {
        $perPage = $this->resolvePerPage($request->integer('per_page', 10));

        $query = BaggageBelt::with(['terminal.airport']);

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where('belt_code', 'like', "%{$search}%");
        }

        if ($request->filled('terminal')) {
            $query->where('terminal_id', $request->integer('terminal'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $baggageBelts = $query->orderBy('belt_code')
            ->paginate($perPage)
            ->withQueryString()
            ->through(function ($belt) {
            // Get current flights for this baggage belt (using flights table directly)
            $currentFlights = \App\Models\Flight::where('fk_id_belt_code', $belt->id_belt_code)
                ->whereBetween('scheduled_arrival_time', [
                    now()->startOfDay(),
                    now()->addDay()->endOfDay()
                ])
                ->with(['status', 'airline', 'origin'])
                ->get();

            return [
                'id' => $belt->id,
                'belt_code' => $belt->belt_code,
                'status' => $belt->status,
                'terminal' => [
                    'id' => $belt->terminal->id,
                    'code' => $belt->terminal->terminal_code,
                    'name' => $belt->terminal->name,
                    'airport' => $belt->terminal->airport->iata_code,
                ],
                'current_flights' => $currentFlights->map(function ($flight) {
                    return [
                        'flight_number' => $flight->flight_number,
                        'airline' => $flight->airline?->airline_name ?? 'N/A',
                        'origin' => $flight->origin?->iata_code ?? 'N/A',
                        'status' => $flight->status?->status_name ?? 'N/A',
                        'scheduled_arrival' => $flight->scheduled_arrival_time?->format('H:i') ?? 'N/A',
                    ];
                }),
                'is_active' => $currentFlights->isNotEmpty(),
            ];
        });

        $terminals = Terminal::with('airport')->orderBy('terminal_code')->get();
        $statusOptions = ['Active', 'Maintenance', 'Closed', 'Scheduled'];
        
        // Get terminals that don't have baggage belts yet
        $terminalsWithBelts = BaggageBelt::distinct('terminal_id')->pluck('terminal_id')->toArray();
        $terminalsWithoutBelts = $terminals->filter(function ($terminal) use ($terminalsWithBelts) {
            return !in_array($terminal->id, $terminalsWithBelts);
        })->map(function ($terminal) {
            return [
                'id' => $terminal->id,
                'code' => $terminal->terminal_code,
                'name' => $terminal->terminal_code,
                'airport' => $terminal->airport->iata_code,
            ];
        })->values();

        // Group terminals by airport for better organization
        $terminalsByAirport = $terminals->groupBy('iata_code')->map(function ($terminals) {
            return [
                'iata_code' => $terminals->first()->airport->iata_code,
                'airport_name' => $terminals->first()->airport->airport_name,
                'terminals' => $terminals->map(function ($terminal) {
                    return [
                        'id' => $terminal->id,
                        'code' => $terminal->terminal_code,
                        'name' => $terminal->terminal_code,
                        'airport' => $terminal->airport->iata_code,
                    ];
                })->values(),
            ];
        })->values();

        return Inertia::render('management/baggage-belts', [
            'baggageBelts' => $baggageBelts->withQueryString(),
            'terminals' => $terminals->map(function ($terminal) {
                return [
                    'id' => $terminal->id,
                    'code' => $terminal->terminal_code,
                    'name' => $terminal->terminal_code,
                    'airport' => $terminal->airport->iata_code,
                ];
            }),
            'terminalsByAirport' => $terminalsByAirport,
            'terminalsWithoutBelts' => $terminalsWithoutBelts,
            'statuses' => $statusOptions,
            'filters' => [
                'search' => $request->input('search', ''),
                'terminal' => $request->input('terminal', ''),
                'status' => $request->input('status', ''),
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => BaggageBelt::count(),
                'active' => BaggageBelt::where('status', 'Active')->count(),
                'maintenance' => BaggageBelt::where('status', 'Maintenance')->count(),
            ],
        ]);
    }

    /**
     * Store a newly created baggage belt.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'terminal_id' => 'required|exists:terminals,id',
            'belt_code' => 'required|string|max:10',
            'status' => 'required|in:Active,Maintenance,Closed,Scheduled',
        ]);

        BaggageBelt::create($validated);

        return redirect()->back()->with('success', 'Baggage belt created successfully.');
    }

    /**
     * Update the specified baggage belt.
     */
    public function update(Request $request, BaggageBelt $baggageBelt)
    {
        $validated = $request->validate([
            'belt_code' => 'sometimes|string|max:10',
            'terminal_id' => 'sometimes|exists:terminals,id',
            'status' => 'sometimes|in:Active,Maintenance,Closed,Scheduled',
        ]);

        $baggageBelt->update($validated);

        return redirect()->back()->with('success', 'Baggage belt updated successfully.');
    }

    /**
     * Remove the specified baggage belt.
     */
    public function destroy($baggageBelt)
    {
        try {
            // Handle both route model binding and direct ID
            $beltModel = $baggageBelt instanceof BaggageBelt ? $baggageBelt : BaggageBelt::findOrFail($baggageBelt);
            
            // Check if baggage belt has active flights
            $statusCodes = \App\Models\FlightStatus::whereIn('status_code', ['SCH', 'BRD', 'ARR'])
                ->pluck('id_status_code')
                ->toArray();
            
            if (\App\Models\Flight::where('fk_id_belt_code', $beltModel->id_belt_code)
                ->whereIn('fk_id_status_code', $statusCodes)
                ->exists()) {
                return redirect()->back()->with('error', 'Cannot delete baggage belt with active flights.');
            }

            $beltModel->delete();

            return redirect()->back()->with('success', 'Baggage belt deleted successfully.');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return redirect()->back()->with('error', 'Baggage belt not found.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'An error occurred while deleting the baggage belt.');
        }
    }

    protected function resolvePerPage(int $perPage): int
    {
        $options = [10, 25, 50];
        return in_array($perPage, $options, true) ? $perPage : 10;
    }
}
