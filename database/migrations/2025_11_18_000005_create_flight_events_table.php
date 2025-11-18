<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('flight_events')) {
            Schema::create('flight_events', function (Blueprint $table) {
                // Match production dump engine/charset/collation
                $table->engine = 'InnoDB';
                $table->charset = 'utf8mb4';
                $table->collation = 'utf8mb4_0900_ai_ci';

                $table->increments('id');
                $table->unsignedBigInteger('flight_id');
                $table->string('event_type', 50);
                // Match fis.sql: description and values stored as TEXT
                $table->text('description')->nullable()->after('event_type');
                $table->text('old_value')->nullable();
                $table->text('new_value')->nullable();
                $table->integer('old_fk_id')->nullable();
                $table->integer('new_fk_id')->nullable();
                $table->timestamp('timestamp')->nullable()->useCurrent();

                // Add indexes commonly expected in the dump
                $table->index('flight_id');
                $table->index('timestamp');

                // No foreign key constraints to avoid test migration ordering issues
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('flight_events');
    }
};
