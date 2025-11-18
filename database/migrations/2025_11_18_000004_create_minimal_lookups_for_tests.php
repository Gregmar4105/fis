<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('airports')) {
            Schema::create('airports', function (Blueprint $table) {
            $table->string('iata_code', 3)->primary();
            $table->string('airport_name', 100);
            $table->string('city', 50);
            $table->string('country', 50)->nullable();
            $table->string('airport_status', 50)->default('Active');
            $table->string('timezone', 50)->default('UTC');
            });
        }

        if (!Schema::hasTable('airlines')) {
            Schema::create('airlines', function (Blueprint $table) {
            $table->string('airline_code', 2)->primary();
            $table->string('airline_name', 100);
            $table->string('airline_status', 20)->default('Active');
            });
        }

        if (!Schema::hasTable('aircrafts')) {
            Schema::create('aircrafts', function (Blueprint $table) {
                $table->string('icao_code', 4)->primary();
                $table->string('model_name', 100);
                $table->string('manufacturer', 50);
                $table->integer('capacity_pax')->nullable();
                $table->string('aircraft_status', 10)->default('Active');
            });
        }

        if (!Schema::hasTable('terminals')) {
            Schema::create('terminals', function (Blueprint $table) {
            $table->integer('id')->primary();
            $table->string('iata_code', 3);
            $table->string('terminal_code', 5);
            $table->string('id_terminal_code', 25)->unique();
            });
        }

        if (!Schema::hasTable('gates')) {
            Schema::create('gates', function (Blueprint $table) {
            $table->bigInteger('id')->unsigned()->primary();
            $table->integer('terminal_id');
            $table->string('gate_code', 10);
            $table->string('gate_status', 50)->default('Open');
            $table->string('id_gate_code', 25)->unique();
            });
        }

        if (!Schema::hasTable('baggage_belts')) {
            Schema::create('baggage_belts', function (Blueprint $table) {
            $table->bigInteger('id')->unsigned()->primary();
            $table->integer('terminal_id');
            $table->string('status', 20)->default('Active');
            $table->string('belt_code', 10);
            $table->string('id_belt_code', 25)->unique();
            });
        }

        if (!Schema::hasTable('flight_status')) {
            Schema::create('flight_status', function (Blueprint $table) {
            $table->increments('id');
            $table->string('status_code', 15);
            $table->string('status_name', 50);
            $table->string('description', 255)->nullable();
            $table->string('id_status_code', 25)->unique();
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('flight_status');
        Schema::dropIfExists('baggage_belts');
        Schema::dropIfExists('gates');
        Schema::dropIfExists('terminals');
        Schema::dropIfExists('airlines');
        Schema::dropIfExists('airports');
    }
};
