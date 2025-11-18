<?php

use App\Contracts\AirportCreator;
use App\Contracts\FlightDataFactory;
use App\Contracts\FlightReader;
use App\Contracts\FlightSyncer;
use App\Contracts\StatusUpdater;
use App\Models\Flight;
use Illuminate\Support\Facades\Log;
// Removed stray import that caused warning; exception referenced by class fully when needed.

// Note: This file relies on inheriting the HTTP methods (like $this->postJson()) 
// from the Tests\TestCase base class, as configured in tests/Pest.php.

it('syncFlight returns 200 and flight_id on success', function () {
    // Arrange: bind a fake factory that returns a fake syncer
    $fakeSyncer = new class implements FlightSyncer {
        public function syncFlight(array $payload): Flight {
            $f = new Flight();
            $f->id = 123; // not persisted, just to satisfy controller
            $f->flight_number = $payload['flight_number'] ?? 'TEST100';
            return $f;
        }
    };

    $fakeFactory = new class($fakeSyncer) implements FlightDataFactory {
        public function __construct(private FlightSyncer $syncer) {}
        public function createFlightReader(): FlightReader { throw new RuntimeException('not used'); }
        public function createStatusUpdater(): StatusUpdater { throw new RuntimeException('not used'); }
        public function createAirportCreator(): AirportCreator { throw new RuntimeException('not used'); }
        public function createFlightSyncer(): FlightSyncer { return $this->syncer; }
    };

    app()->bind(FlightDataFactory::class, fn() => $fakeFactory);

    // Act
    $resp = $this->postJson('/api/v1/sync/flight', [
        'flight_number' => 'AB123',
    ]);

    // Assert
    $resp->assertStatus(200)
         ->assertJsonStructure(['message', 'flight_id'])
         ->assertJson(['flight_id' => 123]);
});

it('syncFlight returns 500 when syncer throws', function () {
    $failingSyncer = new class implements FlightSyncer {
        public function syncFlight(array $payload): Flight { throw new InvalidArgumentException('bad payload'); }
    };
    $fakeFactory = new class($failingSyncer) implements FlightDataFactory {
        public function __construct(private FlightSyncer $syncer) {}
        public function createFlightReader(): FlightReader { throw new RuntimeException('not used'); }
        public function createStatusUpdater(): StatusUpdater { throw new RuntimeException('not used'); }
        public function createAirportCreator(): AirportCreator { throw new RuntimeException('not used'); }
        public function createFlightSyncer(): FlightSyncer { return $this->syncer; }
    };

    app()->bind(FlightDataFactory::class, fn() => $fakeFactory);

    $resp = $this->postJson('/api/v1/sync/flight', []);
    $resp->assertStatus(500)
         ->assertJsonStructure(['error']);
});