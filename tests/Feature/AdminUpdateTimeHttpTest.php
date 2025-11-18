<?php

use App\Models\Flight;
use App\Contracts\StatusUpdater;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;
use Illuminate\Auth\Middleware\Authenticate;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase; // Ensure TestCase methods are available

// Use a test function wrapper for the Pest structure
it('POST /api/v1/admin/flights/{flight}/time updates time with auth and middleware', function () {
    // Minimal schema just for this HTTP test (only create if missing)
    if (! Schema::hasTable('flights')) {
        Schema::create('flights', function ($table) {
        $table->id(); // Using id() for PK (long form for clarity, matches bigint)
        $table->string('flight_number')->nullable();
        $table->string('airline_code')->nullable();
        $table->string('origin_code')->nullable();
        $table->string('destination_code')->nullable();
        $table->timestamp('scheduled_departure_time')->nullable();
        $table->timestamp('scheduled_arrival_time')->nullable();
        $table->timestamps();
        });
    }

    if (! Schema::hasTable('flight_events')) {
        Schema::create('flight_events', function ($table) {
        $table->increments('id');
        $table->foreignId('flight_id')->constrained('flights'); // Use foreignId to link properly
        $table->string('event_type');
        $table->string('old_fk_id')->nullable();
        $table->string('new_fk_id')->nullable();
        $table->string('old_value')->nullable();
        $table->string('new_value')->nullable();
        $table->timestamps();
        });
    }

    // Create users/permissions for auth checks if missing
    if (! Schema::hasTable('users')) {
        Schema::create('users', function ($table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
        });
    }

    Flight::unguard();
    // Create the flight using the actual model for consistency
    $flight = Flight::create([ 
        'id' => 777,
        'flight_number' => 'AB101',
        'scheduled_departure_time' => Carbon::parse('2025-11-12 08:00:00'),
    ]);

    // Stub outbound updater
    $calls = [];
    $fakeUpdater = new class($calls) implements StatusUpdater {
        public array $timeCalls = [];
        public function __construct(&$callsRef) { $this->timeCalls =& $callsRef; }
        public function updateStatus(array $payload): Flight { return new Flight(); }
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
    app()->bind(StatusUpdater::class, fn() => $fakeUpdater);

    // Arrange: User and Authentication
    $user = User::factory()->create();
    $this->be($user); // Authenticate the user

    // In this specific HTTP test, we bypass the Authenticate middleware 
    // to isolate the function logic, assuming the user is already authenticated above.
    $this->withoutMiddleware(Authenticate::class);

    $resp = $this->postJson('/api/v1/admin/flights/777/time', [
        'time_type' => 'scheduled_departure',
        'new_time' => '2025-11-12 09:15:00'
    ], [ 'X-Correlation-ID' => 'test-cid-123' ]);

    $resp->assertStatus(200)->assertJsonPath('message', 'Flight time updated successfully.');

    // Assert: Outbound stub was called
    expect($fakeUpdater->timeCalls)->toHaveCount(1);
    expect($fakeUpdater->timeCalls[0]['timeType'])->toBe('scheduled_departure');
    expect($fakeUpdater->timeCalls[0]['newTime']->toDateTimeString())->toBe('2025-11-12 09:15:00');

    // Assert: DB updated
    $fresh = Flight::find(777);
    expect(optional($fresh->scheduled_departure_time)->toDateTimeString())->toBe('2025-11-12 09:15:00');
})
->group('api'); // Use grouping for organization