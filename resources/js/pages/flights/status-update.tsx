import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Search, Plane, MapPin } from 'lucide-react';
import { Head, router, Link } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { useState } from 'react';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface FlightStatus {
    id: number;
    code: string;
    name: string;
}

interface Gate {
    id: number;
    code: string;
    terminal: string;
    display: string;
}

interface BaggageBelt {
    id: number;
    code: string;
    status: string;
    terminal: string;
}

interface FlightData {
    id: number;
    flight_number: string;
    airline: string;
    route: string;
    scheduled_departure: string;
    status: FlightStatus;
    gate: {
        id: number | null;
        code: string | null;
        terminal: string | null;
    };
    baggage_belt: {
        id: number | null;
        code: string | null;
        status: string | null;
    };
}

interface PaginatedFlights {
    data: FlightData[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Props {
    flights: PaginatedFlights;
    options: {
        statuses: FlightStatus[];
        gates: Gate[];
        baggageBelts: BaggageBelt[];
    };
}

export default function StatusUpdate({ flights, options }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredFlights, setFilteredFlights] = useState(flights.data);
    const [flightStatuses, setFlightStatuses] = useState<Record<number, number>>(
        flights.data.reduce((acc, flight) => ({ ...acc, [flight.id]: flight.status.id }), {})
    );
    const [flightGates, setFlightGates] = useState<Record<number, number | null>>(
        flights.data.reduce((acc, flight) => ({ ...acc, [flight.id]: flight.gate.id }), {})
    );
    const [flightBaggageBelts, setFlightBaggageBelts] = useState<Record<number, number | null>>(
        flights.data.reduce((acc, flight) => ({ ...acc, [flight.id]: flight.baggage_belt.id }), {})
    );

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Quick Flight Update', href: '/flights/status-update' },
    ];

    const handleSearch = () => {
        if (searchQuery.trim()) {
            const filtered = flights.data.filter(f => 
                f.flight_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (f.airline || '').toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredFlights(filtered);
        } else {
            setFilteredFlights(flights.data);
        }
    };

    // Update filtered flights when flights data changes (pagination)
    React.useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredFlights(flights.data);
            setFlightStatuses(flights.data.reduce((acc, flight) => ({ ...acc, [flight.id]: flight.status.id }), {}));
            setFlightGates(flights.data.reduce((acc, flight) => ({ ...acc, [flight.id]: flight.gate.id }), {}));
            setFlightBaggageBelts(flights.data.reduce((acc, flight) => ({ ...acc, [flight.id]: flight.baggage_belt.id }), {}));
        }
    }, [flights.data, searchQuery]);

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleStatusUpdate = (flightId: number, statusId: string) => {
        router.post(`/flights/status-update/${flightId}/status`, {
            status_id: parseInt(statusId),
        }, {
            preserveScroll: true,
        });
    };

    const handleGateUpdate = (flightId: number, gateId: string) => {
        router.post(`/flights/status-update/${flightId}/gate`, {
            gate_id: gateId === 'none' ? null : parseInt(gateId),
        }, {
            preserveScroll: true,
        });
    };

    const handleBaggageBeltUpdate = (flightId: number, beltId: string) => {
        router.post(`/flights/status-update/${flightId}/baggage-claim`, {
            baggage_belt_id: beltId === 'none' ? null : parseInt(beltId),
        }, {
            preserveScroll: true,
        });
    };

    const getStatusColor = (code: string) => {
        switch (code) {
            case 'SCH': return 'bg-blue-500';
            case 'BRD': return 'bg-green-500';
            case 'DEP': return 'bg-gray-500';
            case 'ARR': return 'bg-gray-500';
            case 'DLY': return 'bg-yellow-500';
            case 'CNX': return 'bg-red-500';
            case 'DIV': return 'bg-orange-500';
            default: return 'bg-gray-400';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Quick Flight Update" />

            <div className="space-y-6 py-6 px-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <RefreshCw className="w-8 h-8 text-primary" />
                            Quick Flight Update
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Quick interface to update flight status, gate, or baggage claim
                        </p>
                    </div>
                </div>

                <Separator />

                <Card>
                    <CardHeader>
                        <CardTitle>Search Flight</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    type="text"
                                    placeholder="Enter flight number or airline..."
                                    className="pl-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                />
                            </div>
                            <Button onClick={handleSearch}>Search</Button>
                            {searchQuery && (
                                <Button variant="outline" onClick={() => { setSearchQuery(''); setFilteredFlights(flights); }}>
                                    Clear
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>All Flights ({flights.total})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Flight</TableHead>
                                    <TableHead>Route</TableHead>
                                    <TableHead>Departure</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Gate</TableHead>
                                    <TableHead>Baggage Belt</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredFlights.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No flights found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredFlights.map((flight) => (
                                        <TableRow key={`flight-${flight.id}`} className="hover:bg-accent/50 dark:hover:bg-accent/30 transition-colors">
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium flex items-center gap-2">
                                                        <Plane className="w-4 h-4 text-muted-foreground" />
                                                        {flight.flight_number}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{flight.airline}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3 text-muted-foreground" />
                                                    <span className="text-sm">{flight.route}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{new Date(flight.scheduled_departure).toLocaleString()}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={flightStatuses[flight.id]?.toString()}
                                                    onValueChange={(value) => {
                                                        setFlightStatuses(prev => ({ ...prev, [flight.id]: parseInt(value) }));
                                                        handleStatusUpdate(flight.id, value);
                                                    }}
                                                >
                                                    <SelectTrigger className="w-[140px]">
                                                        <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {options.statuses.map((status) => (
                                                            <SelectItem key={`status-${status.id}`} value={status.id.toString()}>
                                                                {status.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={flightGates[flight.id]?.toString() || 'none'}
                                                    onValueChange={(value) => {
                                                        setFlightGates(prev => ({ ...prev, [flight.id]: value === 'none' ? null : parseInt(value) }));
                                                        handleGateUpdate(flight.id, value);
                                                    }}
                                                >
                                                    <SelectTrigger className="w-[120px]">
                                                        <SelectValue placeholder="Select gate" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">No Gate</SelectItem>
                                                        {options.gates.map((gate) => (
                                                            <SelectItem key={`gate-${gate.id}-${gate.code ?? ''}`} value={gate.id.toString()}>
                                                                {gate.display}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={flightBaggageBelts[flight.id]?.toString() || 'none'}
                                                    onValueChange={(value) => {
                                                        setFlightBaggageBelts(prev => ({ ...prev, [flight.id]: value === 'none' ? null : parseInt(value) }));
                                                        handleBaggageBeltUpdate(flight.id, value);
                                                    }}
                                                >
                                                    <SelectTrigger className="w-[120px]">
                                                        <SelectValue placeholder="Select belt" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">No Belt</SelectItem>
                                                        {options.baggageBelts.map((belt) => (
                                                            <SelectItem key={`belt-${belt.id}-${belt.code ?? ''}`} value={belt.id.toString()}>
                                                                {belt.code} • {belt.terminal ?? 'T?'} — #{belt.id} ({belt.status})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    {/* Pagination */}
                    {flights.total > 0 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t">
                            <div className="text-sm text-muted-foreground">
                                Showing {(flights.current_page - 1) * flights.per_page + 1} to {Math.min(flights.current_page * flights.per_page, flights.total)} of {flights.total} entries
                            </div>
                            <div className="flex gap-1">
                                {flights.current_page > 1 && (
                                    <Link href={`/flights/status-update?page=${flights.current_page - 1}`} preserveState>
                                        <Button variant="outline" size="sm">← Previous</Button>
                                    </Link>
                                )}
                                {Array.from({ length: Math.min(5, flights.last_page) }, (_, i) => {
                                    const page = i + 1;
                                    return (
                                        <Link key={page} href={`/flights/status-update?page=${page}`} preserveState>
                                            <Button 
                                                variant={page === flights.current_page ? 'default' : 'outline'}
                                                size="sm"
                                                className={`w-8 ${page === flights.current_page ? 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600' : ''}`}
                                            >
                                                {page}
                                            </Button>
                                        </Link>
                                    );
                                })}
                                {flights.current_page < flights.last_page && (
                                    <Link href={`/flights/status-update?page=${flights.current_page + 1}`} preserveState>
                                        <Button variant="outline" size="sm">Next →</Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
