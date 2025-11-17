<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\FlightIntegrationController;
use App\Http\Controllers\API\Admin\FlightOperationsController; // Import new controller

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// ---
// INBOUND API (From n8n, ATC, ARS, etc.)
// These routes use your Abstract Factory pattern to sync data.
// ---
Route::prefix('v1/sync')->name('api.v1.sync.')->group(function () {
    
    // POST /api/v1/sync/flight
    Route::post('/flight', [FlightIntegrationController::class, 'syncFlight'])
         ->name('flight');

    // POST /api/v1/sync/status
    Route::post('/status', [FlightIntegrationController::class, 'updateStatus'])
         ->name('status');

    // POST /api/v1/sync/airport
    Route::post('/airport', [FlightIntegrationController::class, 'syncAirport'])
         ->name('airport');
});


// ---
// PUBLIC READ API (For iaos.larable.dev - Passenger Screens)
// ---
Route::prefix('v1/public')->name('api.v1.public.')->group(function () {
    
    // GET /api/v1/public/flights/{id}
    Route::get('/flights/{id}', [FlightIntegrationController::class, 'readFlightDetails'])
         ->name('flights.show');
         
    // You would add more routes here, e.g., get all arrivals/departures
    // Route::get('/flights/arrivals', [FlightReadController::class, 'getArrivals']);
    // Route::get('/flights/departures', [FlightReadController::class, 'getDepartures']);
});


// ---
// ADMIN API (For fis.larable.dev - Admin Panel)
// These routes must be protected by Sanctum authentication.
// ---
Route::middleware('auth:sanctum')->prefix('v1/admin')->name('api.v1.admin.')->group(function () {
    
    // POST /api/v1/admin/flights/{flight}/gate
    Route::post('/flights/{flight}/gate', [FlightOperationsController::class, 'updateGate'])
         ->name('flights.updateGate');

    // POST /api/v1/admin/flights/{flight}/baggage
    Route::post('/flights/{flight}/baggage', [FlightOperationsController::class, 'updateBaggageBelt'])
         ->name('flights.updateBaggage');

    // POST /api/v1/admin/flights/{flight}/time
    Route::post('/flights/{flight}/time', [FlightOperationsController::class, 'updateTime'])
         ->name('flights.updateTime');
         
    // ... other admin routes
});