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
            $query->where(function ($q) use ($search) {
                $q->where('terminal_code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('airport')) {
            $query->where('iata_code', $request->string('airport'));
        }

        $terminals = $query
            ->orderBy('terminal_code')
            ->paginate($perPage)
            ->withQueryString();

        $airports = Airport::orderBy('airport_name')->get(['iata_code', 'airport_name']);

        return Inertia::render('management/terminals', [
            'terminals' => $terminals,
            'airports' => $airports,
            'filters' => [
                'search' => $request->input('search', ''),
                'airport' => $request->input('airport', ''),
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => Terminal::count(),
                'with_gates' => Terminal::has('gates')->count(),
                'with_belts' => Terminal::has('baggageBelts')->count(),
            ],
        ]);
    }

    /**
     * Store a newly created terminal.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'iata_code' => 'required|exists:airports,iata_code',
            'terminal_code' => 'required|string|max:10',
            'name' => 'nullable|string|max:255',
        ]);

        Terminal::create($validated);

        return redirect()->back()->with('success', 'Terminal created successfully.');
    }

    /**
     * Update the specified terminal.
     */
    public function update(Request $request, Terminal $terminal)
    {
        $validated = $request->validate([
            'terminal_code' => 'sometimes|string|max:10',
            'name' => 'nullable|string|max:255',
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
