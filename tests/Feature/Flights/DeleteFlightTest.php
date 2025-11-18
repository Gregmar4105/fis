<?php

namespace Tests\Feature\Flights;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Flight;

class DeleteFlightTest extends TestCase
{
    use RefreshDatabase;

    public function test_flight_is_soft_deleted_when_destroy_called()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        // Ensure migrations have been run in the test database
        $this->artisan('migrate');

        // Seed minimal lookup tables required for creating a flight
        \DB::table('airports')->insert([
            'iata_code' => 'MNL',
            'airport_name' => 'Ninoy Aquino Intl',
            'city' => 'Manila',
            'country' => 'Philippines',
            'airport_status' => 'Active',
            'timezone' => 'Asia/Manila',
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

        $flight = Flight::create([
            'flight_number' => 'PR101',
            'airline_code' => 'PR',
            'origin_code' => 'MNL',
            'destination_code' => 'MNL',
            'scheduled_departure_time' => '2025-11-20 10:00:00',
            'scheduled_arrival_time' => '2025-11-20 12:00:00',
            'fk_id_status_code' => '1-SCH',
            'fk_id_gate_code' => '1-A2',
            'fk_id_belt_code' => '1-A3',
        ]);

        $response = $this->delete('/flights/management/' . $flight->id);

        $response->assertStatus(302);
        $response->assertSessionHas('success');

        // The flight should still exist in DB but with deleted_at set (soft deleted)
        $this->assertDatabaseHas('flights', [
            'id' => $flight->id,
            'flight_number' => 'PR101',
        ]);

        $trashed = Flight::withTrashed()->find($flight->id);
        $this->assertNotNull($trashed->deleted_at, 'Expected deleted_at to be set after soft delete');
    }
}
