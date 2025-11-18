<?php

namespace Tests\Feature\Flights;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;

class UpdateFlightTest extends TestCase
{
    use RefreshDatabase;

    public function test_flight_can_be_updated_via_management_update()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->artisan('migrate');

        // Seed minimal lookups (airports, terminals, gates, belts, airlines, aircrafts, statuses)
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

        \DB::table('terminals')->insert([
            'id' => 1,
            'iata_code' => 'MNL',
            'terminal_code' => 'T3',
            'id_terminal_code' => '1-T3',
        ]);

        \DB::table('gates')->insert([
            'id' => 1,
            'terminal_id' => 1,
            'gate_code' => 'A2',
            'gate_status' => 'Open',
            'id_gate_code' => '1-A2',
        ]);

        \DB::table('baggage_belts')->insert([
            'id' => 1,
            'terminal_id' => 1,
            'status' => 'Active',
            'belt_code' => 'A3',
            'id_belt_code' => '1-A3',
        ]);

        \DB::table('airlines')->insert([
            'airline_code' => 'PR',
            'airline_name' => 'Philippine Airlines',
            'airline_status' => 'Active',
        ]);

        \DB::table('aircrafts')->insert([
            'icao_code' => 'A359',
            'model_name' => 'A350-900',
            'manufacturer' => 'Airbus',
            'capacity_pax' => 300,
            'aircraft_status' => 'Active',
        ]);

        \DB::table('flight_status')->insert([
            'id' => 1,
            'status_code' => 'SCH',
            'status_name' => 'Scheduled',
            'id_status_code' => '1-SCH',
        ]);

        // Create initial flight via POST (exercise same controller path as UI)
        $payload = [
            'flight_number' => 'PR1000',
            'airline_code' => 'PR',
            'origin_code' => 'MNL',
            'destination_code' => 'SIN',
            'aircraft_icao_code' => 'A359',
            'scheduled_departure_time' => '2025-11-20 10:00:00',
            'scheduled_arrival_time' => '2025-11-20 14:00:00',
            'fk_id_status_code' => '1-SCH',
            'fk_id_gate_code' => '1-A2',
            'fk_id_belt_code' => '1-A3',
            'fk_id_terminal_code' => '1-T3',
        ];

        $createResp = $this->post('/flights/management', $payload);
        $createResp->assertStatus(302);

        $flight = \DB::table('flights')->where('flight_number', 'PR1000')->first();
        $this->assertNotNull($flight, 'Expected flight to be created before update test');

        // Perform update: change flight number and arrival time
        $updatePayload = [
            'flight_number' => 'PR2000',
            'airline_code' => 'PR',
            'origin_code' => 'MNL',
            'destination_code' => 'SIN',
            'aircraft_icao_code' => 'A359',
            'scheduled_departure_time' => '2025-11-20 10:00:00',
            'scheduled_arrival_time' => '2025-11-20 16:00:00',
            'fk_id_status_code' => '1-SCH',
            'fk_id_gate_code' => '1-A2',
            'fk_id_belt_code' => '1-A3',
            'fk_id_terminal_code' => '1-T3',
        ];

        $resp = $this->put("/flights/management/{$flight->id}", $updatePayload);
        $resp->assertStatus(302);

        $this->assertDatabaseHas('flights', [
            'id' => $flight->id,
            'flight_number' => 'PR2000',
            'scheduled_arrival_time' => '2025-11-20 16:00:00',
        ]);
    }
}
