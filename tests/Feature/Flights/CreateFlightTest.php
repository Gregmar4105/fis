<?php

namespace Tests\Feature\Flights;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;

class CreateFlightTest extends TestCase
{
    use RefreshDatabase;

    public function test_flight_can_be_created_via_management_store()
    {
        // Create and authenticate a user
        $user = User::factory()->create();
        $this->actingAs($user);

        // Ensure migrations have been run in the test database
        $this->artisan('migrate');

        // Seed minimal lookup tables required by the store logic
        // Airports
        \DB::table('airports')->insert([
            'iata_code' => 'MNL',
            'airport_name' => 'Ninoy Aquino Intl',
            'city' => 'Manila',
            'country' => 'Philippines',
            'airport_status' => 'Active',
            'timezone' => 'Asia/Manila',
        ]);
        \DB::table('airports')->insert([
            'iata_code' => 'SIN',
            'airport_name' => 'Changi',
            'city' => 'Singapore',
            'country' => 'Singapore',
            'airport_status' => 'Active',
            'timezone' => 'Asia/Singapore',
        ]);

        // Terminals (explicit id so gates can refer to it)
        \DB::table('terminals')->insert([
            'id' => 1,
            'iata_code' => 'MNL',
            'terminal_code' => 'T3',
            'id_terminal_code' => '1-T3',
        ]);

        // Gates
        \DB::table('gates')->insert([
            'id' => 1,
            'terminal_id' => 1,
            'gate_code' => 'A2',
            'gate_status' => 'Open',
            'id_gate_code' => '1-A2',
        ]);

        // Baggage belts
        \DB::table('baggage_belts')->insert([
            'id' => 1,
            'terminal_id' => 1,
            'status' => 'Active',
            'belt_code' => 'A3',
            'id_belt_code' => '1-A3',
        ]);

        // Airlines
        \DB::table('airlines')->insert([
            'airline_code' => 'PR',
            'airline_name' => 'Philippine Airlines',
            'airline_status' => 'Active',
        ]);

        // Aircrafts
        \DB::table('aircrafts')->insert([
            'icao_code' => 'A359',
            'model_name' => 'A350-900',
            'manufacturer' => 'Airbus',
            'capacity_pax' => 300,
            'aircraft_status' => 'Active',
        ]);

        // Flight status
        \DB::table('flight_status')->insert([
            'id' => 1,
            'status_code' => 'SCH',
            'status_name' => 'Scheduled',
            'id_status_code' => '1-SCH',
        ]);

        $payload = [
            'flight_number' => 'PR999',
            'airline_code' => 'PR',
            'origin_code' => 'MNL',
            'destination_code' => 'SIN',
            'aircraft_icao_code' => 'A359',
            'scheduled_departure_time' => '2025-11-20 10:00:00',
            'scheduled_arrival_time' => '2025-11-20 14:00:00',
            // backend expects these fk id codes
            'fk_id_status_code' => '1-SCH',
            'fk_id_gate_code' => '1-A2',
            'fk_id_belt_code' => '1-A3',
            'fk_id_terminal_code' => '1-T3',
        ];

        $response = $this->post('/flights/management', $payload);

        // Expect redirect (store typically redirects back to management)
        $response->assertStatus(302);

        // Ensure there were no validation errors
        $response->assertSessionHasNoErrors();

        $this->assertDatabaseHas('flights', [
            'flight_number' => 'PR999',
            'airline_code' => 'PR',
            'origin_code' => 'MNL',
            'destination_code' => 'SIN',
        ]);
    }
}
