<?php

use App\Contracts\StatusUpdater;
use App\Models\Flight;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;

it('updates scheduled departure time and logs outbound notification via stub', function () {
    // Minimal, in-memory schema for this isolated test. Guard creation to avoid
    // collisions when a full migrations-based flights table already exists.
    if (! Schema::hasTable('flights')) {
        Schema::create('flights', function ($table) {
        $table->integer('id')->primary();
        $table->timestamp('scheduled_departure_time')->nullable();
        $table->timestamp('scheduled_arrival_time')->nullable();
        $table->timestamps();
        });
    }

    if (! Schema::hasTable('flight_events')) {
        Schema::create('flight_events', function ($table) {
        $table->increments('id');
        $table->integer('flight_id');
        $table->string('event_type');
        $table->string('old_fk_id')->nullable();
        $table->string('new_fk_id')->nullable();
        $table->string('old_value')->nullable();
        $table->string('new_value')->nullable();
        $table->timestamps();
        });
    }

    // Seed flight
    Flight::unguard();
    Flight::create([
        'id' => 555,
        'scheduled_departure_time' => Carbon::parse('2025-11-12 08:00:00'),
    ]);

    // Fake StatusUpdater capturing updateTime calls
    $calls = [];
    $fakeUpdater = new class($calls) implements StatusUpdater {
        public array $timeCalls = [];
        public function __construct(&$callsRef) { $this->timeCalls =& $callsRef; }
    public function updateStatus(array $payload): Flight { throw new RuntimeException('not used'); }
        public function updateGate(Flight $flight, \App\Models\Gate $newGate): bool { return true; }
        public function updateBaggageClaim(Flight $flight, \App\Models\BaggageClaim $newClaim): bool { return true; }
        public function updateBaggageBelt(Flight $flight, \App\Models\BaggageBelt $newBelt): bool { return true; }
        public function updateTime(Flight $flight, string $timeType, Carbon $newTime): bool {
            $this->timeCalls[] = compact('flight','timeType','newTime');
            return true;
        }
        public function notifyActualDeparture(Flight $flight): bool { return true; }
        public function notifyActualArrival(Flight $flight): bool { return true; }
        public function notifyStatusChange(Flight $flight, \App\Models\FlightStatus $newStatus): bool { return true; }
    };

    // Direct service invocation instead of HTTP to keep test minimal
    $service = new \App\Services\FlightOperationsService($fakeUpdater);
    $flight = Flight::find(555);
    $service->updateFlightTime($flight, 'scheduled_departure', Carbon::parse('2025-11-12 09:15:00'));

    expect($fakeUpdater->timeCalls)->toHaveCount(1);
    expect($fakeUpdater->timeCalls[0]['timeType'])->toBe('scheduled_departure');
    expect($fakeUpdater->timeCalls[0]['newTime']->toDateTimeString())->toBe('2025-11-12 09:15:00');

    $fresh = Flight::find(555);
    expect(optional($fresh->scheduled_departure_time)->toDateTimeString())->toBe('2025-11-12 09:15:00');
});
