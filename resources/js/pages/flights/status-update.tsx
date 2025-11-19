import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Search, Plane, Filter, X, Clock, Route as RouteIcon } from 'lucide-react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface FlightStatus {
    id: number;
    id_status_code?: string;
    status_code: string;
    status_name: string;
}

interface Airline {
    airline_code: string;
    airline_name: string;
}

interface Airport {
    iata_code: string;
    airport_name: string;
    city: string;
}

interface Aircraft {
    icao_code: string;
    manufacturer: string;
    model_name: string;
}

interface Terminal {
    id: number;
    terminal_code: string;
    name: string;
}

interface Gate {
    id: number;
    gate_code: string;
    status?: string;
    terminal: Terminal;
}

interface BaggageBelt {
    id: number;
    belt_code: string;
    status: string;
    terminal: Terminal;
}

interface Flight {
    id: number;
    flight_number: string;
    airline_code: string;
    airline: Airline;
    origin_code: string;
    origin: Airport;
    destination_code: string;
    destination: Airport;
    aircraft_icao_code: string | null;
    aircraft: Aircraft | null;
    scheduled_departure_time: string;
    scheduled_arrival_time: string;
    status_id: number;
    status: FlightStatus;
    gate: Gate | null;
    baggage_belt: BaggageBelt | null;
    terminal?: Terminal;
}

interface PaginatedFlights {
    data: Flight[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

interface Options {
    statuses: FlightStatus[];
    gates: Gate[];
    baggageBelts: BaggageBelt[];
}

interface Props {
    flights: PaginatedFlights;
    filters: {
        search?: string;
        status?: string;
        date_from?: string;
        date_to?: string;
        order?: string;
    };
    options: Options;
}

export default function StatusUpdate({ flights, filters, options }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const page = usePage<SharedData>();
    const userTimezone = (page.props as any).user_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    
    // Format time with timezone conversion
    const formatTime = (dateString: string | null): string => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('en-GB', {
                timeZone: userTimezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(date);
        } catch {
            return 'N/A';
        }
    };
    
    // Format date with timezone conversion
    const formatDate = (dateString: string | null): string => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('en-GB', {
                timeZone: userTimezone,
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).format(date);
        } catch {
            return 'N/A';
        }
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Quick Flight Update', href: '/flights/status-update' },
    ];

    const handleSearch = (value: string) => {
        setSearchQuery(value);
        router.get('/flights/status-update', { ...filters, search: value || undefined }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleFilterChange = (key: string, value: string) => {
        router.get('/flights/status-update', { ...filters, [key]: value || undefined }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setSearchQuery('');
        router.get('/flights/status-update', {}, { preserveState: true });
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

    const handleGateStatusUpdate = (flightId: number, gateStatus: string) => {
        router.post(`/flights/status-update/${flightId}/gate-status`, {
            gate_status: gateStatus,
        }, {
            preserveScroll: true,
        });
    };

    const handleBeltStatusUpdate = (flightId: number, beltStatus: string) => {
        router.post(`/flights/status-update/${flightId}/belt-status`, {
            belt_status: beltStatus,
        }, {
            preserveScroll: true,
        });
    };

    const getStatusColor = (statusCode: string) => {
        // Extract just the code part (e.g., 'SCH' from '1-SCH' or 'SCH')
        const code = statusCode.includes('-') ? statusCode.split('-')[1] : statusCode;
        switch (code) {
            case 'SCH': return 'bg-blue-500/20 text-blue-400 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30';
            case 'BRD': return 'bg-green-500/20 text-green-400 border-green-500/30 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30';
            case 'DEP': return 'bg-green-600/20 text-green-600 border-green-600/30 dark:bg-green-600/20 dark:text-green-500 dark:border-green-600/30';
            case 'ARR': return 'bg-purple-500/20 text-purple-400 border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30';
            case 'DLY': return 'bg-orange-500/20 text-orange-400 border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30';
            case 'CNX': return 'bg-red-500/20 text-red-400 border-red-500/30 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30';
            case 'CNL': return 'bg-red-500/20 text-red-400 border-red-500/30 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30';
        }
    };

    // Get gate status color - Open = Available (green), Closed = Occupied (red)
    const getGateStatusColor = (status: string | undefined): string => {
        if (!status) return 'text-muted-foreground';
        switch (status.toUpperCase()) {
            case 'OPEN': return 'text-green-600 dark:text-green-400';
            case 'CLOSED': return 'text-red-600 dark:text-red-400';
            case 'AVAILABLE': return 'text-green-600 dark:text-green-400';
            case 'OCCUPIED': return 'text-red-600 dark:text-red-400';
            case 'MAINTENANCE': return 'text-orange-600 dark:text-orange-400';
            default: return 'text-muted-foreground';
        }
    };

    // Convert gate status for display - Open = Available, Closed = Occupied
    const getGateStatusDisplay = (status: string | undefined): string => {
        if (!status) return 'N/A';
        switch (status.toUpperCase()) {
            case 'OPEN': return 'Available';
            case 'CLOSED': return 'Occupied';
            default: return status;
        }
    };

    // Get belt status color
    const getBeltStatusColor = (status: string | undefined): string => {
        if (!status) return 'text-muted-foreground';
        switch (status.toUpperCase()) {
            case 'AVAILABLE': return 'text-green-600 dark:text-green-400';
            case 'OCCUPIED': return 'text-red-600 dark:text-red-400';
            case 'MAINTENANCE': return 'text-orange-600 dark:text-orange-400';
            default: return 'text-muted-foreground';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Quick Flight Update" />

            <div className="space-y-6 py-6 px-4">
                {/* Header */}
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

                {/* Filters Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Filters & Search
                        </CardTitle>
                        <CardDescription>
                            Filter flights by search terms, status, or date range
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-end gap-4">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="search">Search</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                        <Input
                                            id="search"
                                            placeholder="Flight #, airline, airport..."
                                            className="pl-10 pr-10"
                                            value={searchQuery}
                                            onChange={(e) => handleSearch(e.target.value)}
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => handleSearch('')}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={filters.status || 'all'}
                                        onValueChange={(value) => handleFilterChange('status', (value === 'all' ? undefined : value) as any)}
                                    >
                                        <SelectTrigger id="status">
                                            <SelectValue placeholder="All Status" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60 overflow-auto">
                                            <SelectItem value="all">All Status</SelectItem>
                                            {options.statuses.map((status) => (
                                                <SelectItem key={`status-${status.id}`} value={(status.id_status_code ?? String(status.id)).toString()}>
                                                    {status.status_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="date_from">From Date</Label>
                                    <Input
                                        id="date_from"
                                        type="date"
                                        value={filters.date_from || ''}
                                        onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="date_to">To Date</Label>
                                    <Input
                                        id="date_to"
                                        type="date"
                                        value={filters.date_to || ''}
                                        onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                    />
                                </div>
                            </div>
                            {(filters.search || filters.status || filters.date_from || filters.date_to) && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                        {(filters.search || filters.status || filters.date_from || filters.date_to) && (
                            <div className="text-sm text-muted-foreground">
                                Showing {flights.from}-{flights.to} of {flights.total} flights
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Flights Table Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>All Flights</CardTitle>
                        <CardDescription>
                            Quick update flight status, gate assignments, and baggage belt assignments
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table className="table-fixed">
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold text-center w-24">Flight #</TableHead>
                                        <TableHead className="font-semibold text-center w-32">Route</TableHead>
                                        <TableHead className="font-semibold text-center w-28">Airline</TableHead>
                                        <TableHead className="font-semibold text-center w-28">Aircraft</TableHead>
                                        <TableHead className="font-semibold text-center w-24">Terminal</TableHead>
                                        <TableHead className="font-semibold text-center w-24">Gate</TableHead>
                                        <TableHead className="font-semibold text-center w-24">Gate Status</TableHead>
                                        <TableHead className="font-semibold text-center w-24">Belt</TableHead>
                                        <TableHead className="font-semibold text-center w-24">Belt Status</TableHead>
                                        <TableHead className="font-semibold text-center w-28">Departure</TableHead>
                                        <TableHead className="font-semibold text-center w-28">Arrival</TableHead>
                                        <TableHead className="font-semibold text-center w-32">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {flights.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                                                No flights found. Try adjusting your filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        flights.data.map((flight) => (
                                            <TableRow key={flight.id} className="hover:bg-accent/50 dark:hover:bg-accent/30 transition-colors">
                                                <TableCell className="font-bold text-primary w-24">
                                                    <div className="flex items-center gap-2">
                                                        <span className="truncate">{flight.flight_number}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-left w-32">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-medium text-sm text-right flex-1 truncate">{flight.origin?.iata_code || flight.origin_code}</span>
                                                            <span className="text-muted-foreground text-xs shrink-0">→</span>
                                                            <span className="font-medium text-sm text-left flex-1 truncate">{flight.destination?.iata_code || flight.destination_code}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs text-muted-foreground text-right flex-1 truncate">{flight.origin?.city || ''}</span>
                                                            <span className="text-muted-foreground text-xs shrink-0">→</span>
                                                            <span className="text-xs text-muted-foreground text-left flex-1 truncate">{flight.destination?.city || ''}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="w-28">
                                                    <div className="flex flex-col items-center text-center">
                                                        <span className="font-medium text-sm truncate w-full">{flight.airline?.airline_name || 'N/A'}</span>
                                                        <span className="text-xs text-muted-foreground">{flight.airline_code}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="w-28">
                                                    {flight.aircraft ? (
                                                        <div className="flex flex-col items-center text-center">
                                                            <span className="font-medium text-sm truncate w-full">{flight.aircraft.icao_code || flight.aircraft_icao_code || 'N/A'}</span>
                                                            {flight.aircraft.manufacturer && flight.aircraft.model_name && (
                                                                <span className="text-xs text-muted-foreground truncate w-full">
                                                                    {flight.aircraft.model_name.startsWith(flight.aircraft.manufacturer) 
                                                                        ? flight.aircraft.model_name 
                                                                        : `${flight.aircraft.manufacturer} ${flight.aircraft.model_name}`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="w-24">
                                                    {flight.terminal ? (
                                                        <div className="flex flex-col items-center text-center">
                                                            <span className="font-medium text-sm truncate w-full">{flight.terminal.terminal_code || flight.terminal.name || 'N/A'}</span>
                                                            {flight.terminal.name && flight.terminal.terminal_code && (
                                                                <span className="text-xs text-muted-foreground truncate w-full">{flight.terminal.name}</span>
                                                            )}
                                                        </div>
                                                    ) : (flight.gate?.terminal || flight.baggage_belt?.terminal) ? (
                                                        <div className="flex flex-col items-center text-center">
                                                            <span className="font-medium text-sm truncate w-full">
                                                                {(flight.gate?.terminal || flight.baggage_belt?.terminal)?.terminal_code || 'N/A'}
                                                            </span>
                                                            {(flight.gate?.terminal || flight.baggage_belt?.terminal)?.name && (
                                                                <span className="text-xs text-muted-foreground truncate w-full">
                                                                    {(flight.gate?.terminal || flight.baggage_belt?.terminal)?.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="font-bold text-sm text-center">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center w-24">
                                                    <Select
                                                        value={flight.gate?.id?.toString() || 'none'}
                                                        onValueChange={(value) => handleGateUpdate(flight.id, value)}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select gate" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">No Gate</SelectItem>
                                                            {options.gates.map((gate) => (
                                                                <SelectItem key={`gate-${gate.id}-${gate.gate_code ?? ''}`} value={String(gate.id)}>
                                                                    {gate.gate_code}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="text-center w-24">
                                                    {flight.gate ? (
                                                        <Select
                                                            value={flight.gate.status || 'Open'}
                                                            onValueChange={(value) => handleGateStatusUpdate(flight.id, value)}
                                                        >
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Open">Open</SelectItem>
                                                                <SelectItem value="Closed">Closed</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <span className="text-sm font-medium text-muted-foreground">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center w-24">
                                                    <Select
                                                        value={flight.baggage_belt?.id?.toString() || 'none'}
                                                        onValueChange={(value) => handleBaggageBeltUpdate(flight.id, value)}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select belt" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">No Belt</SelectItem>
                                                            {options.baggageBelts.map((belt) => (
                                                                <SelectItem key={`belt-${belt.id}-${belt.belt_code ?? ''}`} value={String(belt.id)}>
                                                                    {belt.belt_code}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="text-center w-24">
                                                    {flight.baggage_belt ? (
                                                        <Select
                                                            value={flight.baggage_belt.status || 'Active'}
                                                            onValueChange={(value) => handleBeltStatusUpdate(flight.id, value)}
                                                        >
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Active">Active</SelectItem>
                                                                <SelectItem value="Maintenance">Maintenance</SelectItem>
                                                                <SelectItem value="Closed">Closed</SelectItem>
                                                                <SelectItem value="Scheduled">Scheduled</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <span className="text-sm font-medium text-muted-foreground">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="w-28">
                                                    <div className="flex flex-col items-center text-center">
                                                        <span className="font-medium flex items-center gap-1 text-sm">
                                                            <Clock className="w-3 h-3 shrink-0" />
                                                            <span className="truncate">{formatTime(flight.scheduled_departure_time)}</span>
                                                        </span>
                                                        <span className="text-xs text-muted-foreground text-center truncate w-full">
                                                            {formatDate(flight.scheduled_departure_time)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="w-28">
                                                    <div className="flex flex-col items-center text-center">
                                                        <span className="font-medium flex items-center gap-1 text-sm">
                                                            <Clock className="w-3 h-3 shrink-0" />
                                                            <span className="truncate">{formatTime(flight.scheduled_arrival_time)}</span>
                                                        </span>
                                                        <span className="text-xs text-muted-foreground text-center truncate w-full">
                                                            {formatDate(flight.scheduled_arrival_time)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center w-32">
                                                    <Select
                                                        value={(flight.status?.id_status_code ?? String(flight.status?.id)).toString()}
                                                        onValueChange={(value) => handleStatusUpdate(flight.id, value)}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {options.statuses.map((status) => (
                                                                <SelectItem key={`status-${status.id}`} value={(status.id_status_code ?? String(status.id)).toString()}>
                                                                    {status.status_name}
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
                        </div>
                    </CardContent>
                    {/* Pagination */}
                    {flights.total > 0 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t">
                            <div className="text-sm text-muted-foreground">
                                Showing {flights.from} to {flights.to} of {flights.total} entries
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
