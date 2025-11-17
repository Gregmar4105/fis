<?php

namespace App\Contracts; // Product Interface

use App\Models\BaggageBelt;
use App\Models\Flight;
use App\Models\FlightStatus;
use App\Models\Gate;
use Carbon\Carbon;

/**
 * Defines the contract for a service that handles flight status changes.
 * This is the "Abstract Product" in your Factory pattern.
 *
 * It is used by:
 * 1. FlightIntegrationController (INBOUND): To process webhook data.
 * 2. FlightOperationsService (OUTBOUND): To notify external systems.
 */
interface StatusUpdater
{
    /**
     * INBOUND: Processes an incoming payload and updates the flight status and history.
     *
     * @param array $payload The incoming data payload from N8n.
     * @return \App\Models\Flight The updated Flight model instance.
     */
    public function updateStatus(array $payload): Flight;

    /**
     * OUTBOUND: Update an external system (n8n) about a new gate assignment.
     */
    public function updateGate(Flight $flight, Gate $newGate): bool;

    /**
     * OUTBOUND: Update an external system (n8n) about a new baggage belt assignment.
     */
    public function updateBaggageBelt(Flight $flight, BaggageBelt $newBelt): bool;

    /**
     * OUTBOUND: Update an external system (n8n) about a change in a flight's time.
     */
    public function updateTime(Flight $flight, string $timeType, Carbon $newTime): bool;

    /**
     * OUTBOUND: Notify external systems (n8n) of an actual departure event.
     */
    public function notifyActualDeparture(Flight $flight): bool;

    /**
     * OUTBOUND: Notify external systems (n8n) of an actual arrival event.
     */
    public function notifyActualArrival(Flight $flight): bool;

    /**
     * OUTBOUND: Notify external systems (n8n) of a general status change (e.g., Delayed, Cancelled).
     */
    public function notifyStatusChange(Flight $flight, FlightStatus $newStatus): bool;
}