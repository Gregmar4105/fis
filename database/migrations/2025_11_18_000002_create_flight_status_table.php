<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('flight_status')) {
            Schema::create('flight_status', function (Blueprint $table) {
                // Match production dump engine/charset/collation
                $table->engine = 'InnoDB';
                $table->charset = 'utf8mb4';
                $table->collation = 'utf8mb4_0900_ai_ci';

                $table->increments('id');
                $table->string('status_code', 15);
                $table->string('status_name', 50);
                $table->string('id_status_code', 25)->unique();
                $table->index('status_code');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('flight_status');
    }
};
