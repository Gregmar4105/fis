<?php

namespace App\Http\Controllers;

use App\Models\Terminal;
use App\Models\Airport;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TerminalManagementController extends Controller
{
    /**
     * Display a listing of terminals.
     */
    public function index(Request $request): Response
    {
        $perPage = $this->resolvePerPage($request->integer('per_page', 10));

        $query = Terminal::with(['airport'])
            ->withCount(['gates', 'baggageBelts']);

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where('terminal_code', 'like', "%{$search}%");
        }

        if ($request->filled('airport')) {
            $query->where('iata_code', $request->string('airport'));
        }

        $terminals = $query
            ->orderBy('terminal_code')
            ->paginate($perPage)
            ->withQueryString();

        $airports = Airport::orderBy('airport_name')->get(['iata_code', 'airport_name']);
        
        // Get airports that don't have terminals yet
        $airportsWithTerminals = Terminal::distinct('iata_code')->pluck('iata_code')->toArray();
        $airportsWithoutTerminals = $airports->filter(function ($airport) use ($airportsWithTerminals) {
            return !in_array($airport->iata_code, $airportsWithTerminals);
        })->values();

        return Inertia::render('management/terminals', [
            'terminals' => $terminals,
            'airports' => $airports,
            'airportsWithoutTerminals' => $airportsWithoutTerminals,
            'filters' => [
                'search' => $request->input('search', ''),
                'airport' => $request->input('airport', ''),
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => Terminal::count(),
                'with_gates' => Terminal::whereHas('gates')->count(),
                'with_belts' => Terminal::whereHas('baggageBelts')->count(),
            ],
        ]);
    }

    /**
     * Store a newly created terminal.
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'iata_code' => 'required|exists:airports,iata_code',
                'terminal_code' => 'required|string|max:10',
            ]);

            Terminal::create($validated);

            return redirect()->back()->with('success', 'Terminal created successfully.');
        } catch (\Illuminate\Database\QueryException $e) {
            // Handle duplicate entry errors
            if ($e->getCode() === '23000') {
                return redirect()->back()
                    ->withErrors(['terminal_code' => 'A terminal with this code already exists for this airport.'])
                    ->withInput();
            }
            return redirect()->back()
                ->withErrors(['error' => 'An error occurred while creating the terminal.'])
                ->withInput();
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'An error occurred while creating the terminal.'])
                ->withInput();
        }
    }

    /**
     * Update the specified terminal.
     */
    public function update(Request $request, Terminal $terminal)
    {
        $validated = $request->validate([
            'terminal_code' => 'sometimes|string|max:10',
            'iata_code' => 'sometimes|exists:airports,iata_code',
        ]);

        $terminal->update($validated);

        return redirect()->back()->with('success', 'Terminal updated successfully.');
    }

    /**
     * Remove the specified terminal.
     */
    public function destroy(Terminal $terminal)
    {
        // Check if terminal has gates or baggage claims
        if ($terminal->gates()->exists() || $terminal->baggageBelts()->exists()) {
            return redirect()->back()->with('error', 'Cannot delete terminal with assigned gates or baggage claims.');
        }

        $terminal->delete();

        return redirect()->back()->with('success', 'Terminal deleted successfully.');
    }

    protected function resolvePerPage(int $perPage): int
    {
        $options = [10, 25, 50];
        return in_array($perPage, $options, true) ? $perPage : 10;
    }
}
