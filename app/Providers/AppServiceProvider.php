<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Contracts\FlightDataFactory;
use App\Contracts\StatusUpdater;
use App\Services\N8nFlightDataFactory;
use App\Services\N8nStatusUpdaterService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    // Register any application services.
    public function register(): void
    {
        /* BIND THE ABSTRACT FACTORY INTERFACE TO THE CONCRETE IMPLEMENTATION
        This enables Dependency Inversion: all controllers request the interface,
        and Laravel provides the N8n factory implementation. */

        $this->app->bind(
            FlightDataFactory::class,
            N8nFlightDataFactory::class
        );

        // Bind the StatusUpdater interface so services/controllers can inject it directly
        $this->app->bind(
            StatusUpdater::class,
            N8nStatusUpdaterService::class
        );
    }

    // Bootstrap any application services.
    public function boot(): void
    {
        // Ensure MySQL connections use UTC session timezone so TIMESTAMP columns
        // are consistently stored/retrieved in UTC across app connections.
        // This is non-destructive and only affects the DB session for each
        // connection established by the app.
        try {
            if (Config::get('database.default') === 'mysql') {
                DB::statement("SET time_zone = '+00:00'");
            }
        } catch (\Throwable $e) {
            // If the database connection isn't ready or the driver doesn't support
            // this statement, fail silently so boot does not break the app.
        }

        // Share the user's session timezone with all Inertia responses so the
        // frontend can use a per-session preference without requiring DB changes.
        try {
            Inertia::share('user_timezone', function () {
                return request()->session()->get('user_timezone', config('app.timezone') ?? 'UTC');
            });
        } catch (\Throwable $e) {
            // Non-blocking: if Inertia is not available during certain CLI runs,
            // do not break the app.
        }
    }
}