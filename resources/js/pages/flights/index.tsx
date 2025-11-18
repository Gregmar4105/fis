import AppLayout from '@/layouts/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Search, 
    Pencil, 
    Trash2,
    PlaneTakeoff,
    PlaneLanding,
    Plane,
    Clock,
    MapPin,
    Radio,
    Route as RouteIcon,
    AlertCircle,
    CheckCircle2,
    X,
    Plus,
    Calendar
} from 'lucide-react';
import { Link, Head, usePage } from '@inertiajs/react';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import FlightModal from '@/components/flights/FlightModal';

// Define comprehensive flight data structure from Laravel
interface FlightStatus {
    id: number;
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
    country: string;
}

interface Terminal {
    terminal_name: string;
}

interface Gate {
    gate_number?: string;
    gate_code?: string;
    terminal?: Terminal;
}

interface BaggageBelt {
    belt_code: string;
}

interface FlightConnection {
    id: number;
    arrival_flight_id: number;
    departure_flight_id: number;
    minimum_connection_time: number;
}

interface Flight {
    id: number;
    flight_number: string;
    airline_code: string;
    origin_code: string;
    destination_code: string;
    aircraft_icao_code?: string | null;
    scheduled_departure_time: string;
    scheduled_arrival_time: string | null;
    status_id: number;
    type?: 'Arrival' | 'Departure';
    
    // Relationships
    status: FlightStatus;
    airline: Airline;
    aircraft?: {
        icao_code: string;
        manufacturer?: string;
        model_name?: string;
    };
    origin: Airport;
    destination: Airport;
    terminal?: {
        id: number;
        terminal_code: string;
        name?: string;
    };
    departure?: {
        gate?: Gate;
    };
    arrival?: {
        baggage_belt?: BaggageBelt;
    };
    gate?: Gate & {
        terminal?: {
            id: number;
            terminal_code: string;
            name?: string;
        };
    };
    baggageBelt?: BaggageBelt & {
        terminal?: {
            id: number;
            terminal_code: string;
            name?: string;
        };
    };
    
    // Connection info
    inbound_connections?: FlightConnection[];
    outbound_connections?: FlightConnection[];
    has_connections?: boolean;
}

interface PaginatedFlights {
    data: Flight[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Options {
    statuses?: any[];
    airlines?: any[];
    airports?: any[];
    aircraft?: any[];
    gates?: any[];
    baggageBelts?: any[];
}

interface FlightsIndexProps {
    flights: PaginatedFlights;
    scheduleType: 'all' | 'arrivals' | 'departures';
    localAirport: string;
    options?: Options;
}

const getStatusColor = (statusCode: string): string => {
    switch (statusCode) {
        case 'SCH': return 'bg-blue-500/20 text-blue-400 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30'; // Scheduled
        case 'BRD': return 'bg-green-500/20 text-green-400 border-green-500/30 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30'; // Boarding
        case 'DEP': return 'bg-green-600/20 text-green-600 border-green-600/30 dark:bg-green-600/20 dark:text-green-500 dark:border-green-600/30'; // Departed - Less Bright Green
        case 'ARR': return 'bg-purple-500/20 text-purple-400 border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30'; // Arrived - Purple
        case 'DLY': return 'bg-orange-500/20 text-orange-400 border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30'; // Delayed
        case 'CNX': return 'bg-red-500/20 text-red-400 border-red-500/30 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30'; // Cancelled
        case 'DIV': return 'bg-orange-500/20 text-orange-400 border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30'; // Diverted
        default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30';
    }
};

// Format time with timezone conversion
const formatTime = (dateString: string | null, timezone?: string): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (timezone) {
            // Use Intl.DateTimeFormat to format in the specified timezone
            return new Intl.DateTimeFormat('en-GB', {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(date);
        }
        return format(date, 'HH:mm');
    } catch {
        return 'N/A';
    }
};

// Format date with timezone conversion
const formatDate = (dateString: string | null, timezone?: string): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (timezone) {
            // Use Intl.DateTimeFormat to format in the specified timezone
            return new Intl.DateTimeFormat('en-GB', {
                timeZone: timezone,
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).format(date);
        }
        return format(date, 'MMM dd, yyyy');
    } catch {
        return 'N/A';
    }
};


export default function FlightsIndex({ flights, scheduleType, localAirport, options = {} }: FlightsIndexProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isLive, setIsLive] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [showFlightModal, setShowFlightModal] = useState(false);
    const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
    const page = usePage<SharedData>();
    const userTimezone = (page.props as any).user_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    // Simulate live updates indicator
    useEffect(() => {
        const interval = setInterval(() => {
            setLastUpdate(new Date());
        }, 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, []);

    const getPageTitle = () => {
        switch (scheduleType) {
            case 'arrivals': return 'Arrivals';
            case 'departures': return 'Departures';
            default: return 'All Flight Schedules';
        }
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Flight Schedules', href: '/schedule/all' },
        { title: getPageTitle(), href: '#' },
    ];

    const filteredFlights = flights.data.filter(flight => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            flight.flight_number.toLowerCase().includes(query) ||
            flight.airline?.airline_name.toLowerCase().includes(query) ||
            flight.origin?.city.toLowerCase().includes(query) ||
            flight.destination?.city.toLowerCase().includes(query) ||
            flight.origin_code.toLowerCase().includes(query) ||
            flight.destination_code.toLowerCase().includes(query)
        );
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={getPageTitle()} />
            <div className="space-y-6 py-6 px-4">
                
                {/* Header Section with Live Indicator */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                {scheduleType === 'arrivals' && <PlaneLanding className="w-8 h-8 text-blue-600 dark:text-blue-400" />}
                                {scheduleType === 'departures' && <PlaneTakeoff className="w-8 h-8 text-green-600 dark:text-green-400" />}
                                {scheduleType === 'all' && <Calendar className="w-8 h-8 text-purple-600 dark:text-purple-400" />}
                                <h2 className="text-3xl font-bold tracking-tight">{getPageTitle()}</h2>
                            </div>
                            <p className="text-muted-foreground mt-1 flex items-center gap-2">
                                {scheduleType === 'all' && `All active flights • ${flights.total} total`}
                                {scheduleType === 'arrivals' && `Incoming flights • ${flights.total} expected`}
                                {scheduleType === 'departures' && `Outgoing flights • ${flights.total} scheduled`}
                                <span className="flex items-center gap-1 text-xs">
                                    {isLive ? (
                                        <>
                                            <Radio className="w-3 h-3 text-green-500 dark:text-green-400 animate-pulse" />
                                            <span className="text-green-600 dark:text-green-400 font-medium">LIVE</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-3 h-3 text-yellow-500 dark:text-yellow-400" />
                                            <span className="text-yellow-600 dark:text-yellow-400">OFFLINE</span>
                                        </>
                                    )}
                                    <span className="text-muted-foreground ml-2">
                                        Updated {new Intl.DateTimeFormat('en-GB', {
                                            timeZone: 'UTC',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                            hour12: false
                                        }).format(lastUpdate)}
                                    </span>
                                </span>
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <Badge 
                            variant={scheduleType === 'all' ? 'default' : 'outline'}
                            className="cursor-pointer hover:bg-primary/80 min-w-[120px] justify-center"
                        >
                            <Link href="/schedule/all" className="px-3 py-1 flex items-center justify-center gap-1.5">
                                <Calendar className="w-3 h-3" />
                                All Flights
                            </Link>
                        </Badge>
                        <Badge 
                            variant={scheduleType === 'arrivals' ? 'default' : 'outline'}
                            className="cursor-pointer hover:bg-primary/80 min-w-[120px] justify-center"
                        >
                            <Link href="/schedule/arrivals" className="px-3 py-1 flex items-center justify-center gap-1.5">
                                <PlaneLanding className="w-3 h-3" />
                                Arrivals
                            </Link>
                        </Badge>
                        <Badge 
                            variant={scheduleType === 'departures' ? 'default' : 'outline'}
                            className="cursor-pointer hover:bg-primary/80 min-w-[120px] justify-center"
                        >
                            <Link href="/schedule/departures" className="px-3 py-1 flex items-center justify-center gap-1.5">
                                <PlaneTakeoff className="w-3 h-3" />
                                Departures
                            </Link>
                        </Badge>
                        <Badge 
                            variant="outline"
                            className="cursor-pointer hover:bg-primary/80 min-w-[120px] justify-center"
                        >
                            <Link href="/connections" className="px-3 py-1 flex items-center justify-center gap-1.5">
                                <RouteIcon className="w-3 h-3" />
                                Connections
                            </Link>
                        </Badge>
                    </div>
                </div>

                <Separator />
                
                {/* Success/Info Message */}
                {flights.data && flights.data.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                        <p className="text-sm text-green-800 dark:text-green-200">
                            {filteredFlights.length} flight(s) displayed
                            {flights.data.some(f => f.has_connections) && (
                                <span className="ml-2 inline-flex items-center gap-1">
                                    <RouteIcon className="w-3 h-3" />
                                    Including connecting flights
                                </span>
                            )}
                        </p>
                    </div>
                )}

                {/* Search and Table Card */}
                <Card>
                    <CardContent className="pt-6">
                        {/* Search Bar */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by flight number, airline, or destination..."
                                    className="pl-10 pr-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            <Button variant="outline" className="gap-2">
                                <Clock className="w-4 h-4" />
                                Refresh
                            </Button>
                        </div>

                        {/* Flight Table */}
                        <div className="rounded-lg border">
                            <Table className="table-fixed">
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold text-center w-24">Flight #</TableHead>
                                        <TableHead className="font-semibold text-center w-32">Route</TableHead>
                                        <TableHead className="font-semibold text-center w-28">Airline</TableHead>
                                        <TableHead className="font-semibold text-center w-28">Aircraft</TableHead>
                                        <TableHead className="font-semibold text-center w-24">Terminal</TableHead>
                                        <TableHead className="font-semibold text-center w-20">Gate</TableHead>
                                        <TableHead className="font-semibold text-center w-20">Belt</TableHead>
                                        <TableHead className="font-semibold text-center w-28">Departure</TableHead>
                                        <TableHead className="font-semibold text-center w-28">Arrival</TableHead>
                                        <TableHead className="font-semibold text-center w-24">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredFlights && filteredFlights.length > 0 ? (
                                        filteredFlights.map((flight) => (
                                            <TableRow key={flight.id} className="hover:bg-accent/50 dark:hover:bg-accent/30 transition-colors">
                                                <TableCell className="font-bold text-primary w-24">
                                                    <div className="flex items-center gap-2">
                                                        <span className="truncate">{flight.flight_number}</span>
                                                        {flight.has_connections ? (
                                                            <Badge variant="outline" className="gap-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800 inline-flex items-center justify-center h-5 px-1.5 shrink-0">
                                                                <RouteIcon className="w-3 h-3" />
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="gap-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 inline-flex items-center justify-center h-5 px-1.5 shrink-0">
                                                                <Plane className="w-3 h-3" />
                                                            </Badge>
                                                        )}
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
                                                    ) : (flight.gate?.terminal || flight.baggageBelt?.terminal) ? (
                                                        <div className="flex flex-col items-center text-center">
                                                            <span className="font-medium text-sm truncate w-full">
                                                                {(flight.gate?.terminal || flight.baggageBelt?.terminal)?.terminal_code || 'N/A'}
                                                            </span>
                                                            {(flight.gate?.terminal || flight.baggageBelt?.terminal)?.name && (
                                                                <span className="text-xs text-muted-foreground truncate w-full">
                                                                    {(flight.gate?.terminal || flight.baggageBelt?.terminal)?.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="font-bold text-sm text-center">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center w-20">
                                                    {(flight.departure?.gate || flight.gate) ? (
                                                        <span className="font-medium text-sm truncate">
                                                            {(flight.departure?.gate || flight.gate)?.gate_number || (flight.departure?.gate || flight.gate)?.gate_code || 'N/A'}
                                                        </span>
                                                    ) : (
                                                        <span className="font-bold text-sm">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center w-20">
                                                    {(flight.arrival?.baggage_belt || flight.baggageBelt) ? (
                                                        <span className="font-medium text-sm truncate">
                                                            {(flight.arrival?.baggage_belt || flight.baggageBelt)?.belt_code || 'N/A'}
                                                        </span>
                                                    ) : (
                                                        <span className="font-bold text-sm">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="w-28">
                                                    <div className="flex flex-col items-center text-center">
                                                        <span className="font-medium flex items-center gap-1 text-sm">
                                                            <Clock className="w-3 h-3 shrink-0" />
                                                            <span className="truncate">{formatTime(flight.scheduled_departure_time, userTimezone)}</span>
                                                        </span>
                                                        <span className="text-xs text-muted-foreground text-center truncate w-full">
                                                            {formatDate(flight.scheduled_departure_time, userTimezone)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="w-28">
                                                    <div className="flex flex-col items-center text-center">
                                                        <span className="font-medium flex items-center gap-1 text-sm">
                                                            <Clock className="w-3 h-3 shrink-0" />
                                                            <span className="truncate">{formatTime(flight.scheduled_arrival_time, userTimezone)}</span>
                                                        </span>
                                                        <span className="text-xs text-muted-foreground text-center truncate w-full">
                                                            {formatDate(flight.scheduled_arrival_time, userTimezone)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center w-24">
                                                    <Badge className={getStatusColor(flight.status?.status_code || 'SCH')}>
                                                        {flight.status?.status_name || 'Scheduled'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
                                                    <p>No flights found matching your search criteria</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        
                        {/* Pagination */}
                        {filteredFlights && filteredFlights.length > 0 && (
                            <div className="flex items-center justify-between pt-4">
                                <div className="text-sm text-muted-foreground">
                                    Showing {((flights.current_page - 1) * flights.per_page) + 1} to {Math.min(flights.current_page * flights.per_page, flights.total)} of {flights.total} entries
                                </div>
                                <div className="flex gap-1">
                                    {flights.current_page > 1 && (
                                        <Link href={`/schedule/${scheduleType}?page=${flights.current_page - 1}`} preserveState>
                                            <Button variant="outline" size="sm">← Previous</Button>
                                        </Link>
                                    )}
                                    {Array.from({ length: Math.min(5, flights.last_page) }, (_, i) => {
                                        const page = i + 1;
                                        return (
                                            <Link key={page} href={`/schedule/${scheduleType}?page=${page}`} preserveState>
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
                                        <Link href={`/schedule/${scheduleType}?page=${flights.current_page + 1}`} preserveState>
                                            <Button variant="outline" size="sm">Next →</Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
                {/* Flight modal for Create/Edit */}
                <FlightModal open={showFlightModal} onOpenChange={(open: boolean) => {
                    setShowFlightModal(open);
                    if (!open) setSelectedFlight(null);
                }} options={options} initialData={selectedFlight ?? {}} />
            </div>
        </AppLayout>
    );
}