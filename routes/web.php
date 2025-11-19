<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

use App\Http\Controllers\FlightScheduleController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FlightConnectionController;
use App\Http\Controllers\FlightManagementController;
use App\Http\Controllers\FlightStatusUpdateController;
use App\Http\Controllers\TerminalManagementController;
use App\Http\Controllers\GateManagementController;
use App\Http\Controllers\BaggageBeltManagementController;
use App\Http\Controllers\DocumentationController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

// --- DOCUMENTATION ROUTES (Public) ---
Route::prefix('docs')->name('docs.')->group(function () {
    Route::get('/', [DocumentationController::class, 'index'])->name('index');
    Route::get('/{file}', [DocumentationController::class, 'show'])->name('show');
});

Route::middleware(['auth', 'verified', 'prevent-back'])->group(function () {
    
    // --- DASHBOARD ---
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // --- FIS SCHEDULE ROUTES ---
    Route::prefix('schedule')->group(function () {
        Route::get('/{type?}', [FlightScheduleController::class, 'index'])
            ->where('type', 'all|arrivals|departures')
            ->name('flights.schedule');
    });

    // --- FLIGHT CONNECTIONS ROUTE ---
    Route::get('/connections', [FlightConnectionController::class, 'index'])
        ->name('flights.connections');

    // --- FLIGHT MANAGEMENT (CRUD) ---
    Route::prefix('flights')->name('flights.')->group(function () {
        Route::get('/management', [FlightManagementController::class, 'index'])->name('management');
        Route::post('/management', [FlightManagementController::class, 'store'])->name('store');
        Route::get('/management/{flight}', [FlightManagementController::class, 'show'])->name('show');
        Route::put('/management/{flight}', [FlightManagementController::class, 'update'])->name('update');
        Route::delete('/management/{flight}', [FlightManagementController::class, 'destroy'])->name('destroy');
    });

    // --- QUICK STATUS UPDATE ---
    Route::prefix('flights/status-update')->name('status.')->group(function () {
        Route::get('/', [FlightStatusUpdateController::class, 'index'])->name('index');
        Route::post('/{flight}/status', [FlightStatusUpdateController::class, 'updateStatus'])->name('update');
        Route::post('/{flight}/gate', [FlightStatusUpdateController::class, 'updateGate'])->name('gate');
        Route::post('/{flight}/gate-status', [FlightStatusUpdateController::class, 'updateGateStatus'])->name('gate-status');
        Route::post('/{flight}/baggage-claim', [FlightStatusUpdateController::class, 'updateBaggageClaim'])->name('baggage');
        Route::post('/bulk', [FlightStatusUpdateController::class, 'bulkUpdate'])->name('bulk');
    });

    // --- RESOURCE MANAGEMENT ---
    Route::prefix('management')->name('management.')->group(function () {
        
        // Terminals
        Route::prefix('terminals')->name('terminals.')->group(function () {
            Route::get('/', [TerminalManagementController::class, 'index'])->name('index');
            Route::post('/', [TerminalManagementController::class, 'store'])->name('store');
            Route::put('/{terminal}', [TerminalManagementController::class, 'update'])->name('update');
            Route::delete('/{terminal}', [TerminalManagementController::class, 'destroy'])->name('destroy');
        });

        // Gates
        Route::prefix('gates')->name('gates.')->group(function () {
            Route::get('/', [GateManagementController::class, 'index'])->name('index');
            Route::post('/', [GateManagementController::class, 'store'])->name('store');
            Route::put('/{gate}', [GateManagementController::class, 'update'])->name('update');
            Route::delete('/{gate}', [GateManagementController::class, 'destroy'])->name('destroy');
            Route::post('/{gate}/airlines', [GateManagementController::class, 'assignAirlines'])->name('assign-airlines');
        });

        // Baggage Belts
        Route::prefix('baggage-belts')->name('baggage-belts.')->group(function () {
            Route::get('/', [BaggageBeltManagementController::class, 'index'])->name('index');
            Route::post('/', [BaggageBeltManagementController::class, 'store'])->name('store');
            Route::put('/{baggageBelt}', [BaggageBeltManagementController::class, 'update'])->name('update');
            Route::delete('/{baggageBelt}', [BaggageBeltManagementController::class, 'destroy'])->name('destroy');
        });
    });

    // --- USER SETTINGS ROUTES ---
    // Includes Profile, Password, and Two-Factor routes
    require __DIR__.'/settings.php';
});

require __DIR__.'/auth.php';
