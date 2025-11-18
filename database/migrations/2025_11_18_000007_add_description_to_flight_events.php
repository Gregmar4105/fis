<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('flight_events')) {
            // If table doesn't exist, skip — other migrations will create it.
            return;
        }

        if (!Schema::hasColumn('flight_events', 'description')) {
            Schema::table('flight_events', function (Blueprint $table) {
                $table->text('description')->nullable()->after('event_type');
            });
        }

        if (!Schema::hasColumn('flight_events', 'new_value')) {
            Schema::table('flight_events', function (Blueprint $table) {
                $table->text('new_value')->nullable()->after('description');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('flight_events')) return;

        Schema::table('flight_events', function (Blueprint $table) {
            if (Schema::hasColumn('flight_events', 'new_value')) $table->dropColumn('new_value');
            if (Schema::hasColumn('flight_events', 'description')) $table->dropColumn('description');
        });
    }
};
