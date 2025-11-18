<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (Schema::hasTable('flights') && !Schema::hasColumn('flights', 'deleted_at')) {
            Schema::table('flights', function (Blueprint $table) {
                $table->timestamp('deleted_at')->nullable()->after('updated_at')->index();
            });
        }
    }

    public function down()
    {
        if (Schema::hasTable('flights') && Schema::hasColumn('flights', 'deleted_at')) {
            Schema::table('flights', function (Blueprint $table) {
                $table->dropIndex(['deleted_at']);
                $table->dropColumn('deleted_at');
            });
        }
    }
};
