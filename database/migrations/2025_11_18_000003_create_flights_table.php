<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('flights', function (Blueprint $table) {
            // Match production dump engine/charset/collation
            $table->engine = 'InnoDB';
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_0900_ai_ci';
            $table->bigIncrements('id');
            $table->string('flight_number')->nullable();
            $table->string('airline_code')->nullable();
            $table->string('aircraft_icao_code', 4)->nullable();
            $table->unsignedInteger('fk_id_status_code')->nullable();
            $table->string('origin_code')->nullable();
            $table->string('destination_code')->nullable();
            // Use MySQL TIMESTAMP (conversion-aware) to match fis.sql dump
            $table->timestamp('scheduled_departure_time')->nullable();
            $table->timestamp('scheduled_arrival_time')->nullable();
            $table->string('fk_id_gate_code')->nullable();
            $table->string('fk_id_belt_code')->nullable();
            $table->string('fk_id_terminal_code')->nullable();
            $table->timestamps();

            // Add commonly-used indexes (non-destructive)
            $table->index('flight_number');
            $table->index('airline_code');
            $table->index('aircraft_icao_code');
            $table->index('fk_id_status_code');
            $table->index('origin_code');
            $table->index('destination_code');
            $table->index('fk_id_gate_code');
            $table->index('fk_id_belt_code');
            $table->index('fk_id_terminal_code');
            $table->index('scheduled_departure_time');
            $table->index('scheduled_arrival_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('flights');
    }
};
