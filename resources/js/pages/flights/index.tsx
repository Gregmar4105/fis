import AppLayout from '@/layouts/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Search, 
    Eye, 
    Pencil, 
    Trash2,
    PlaneTakeoff,
    PlaneLanding,
    Clock,
    MapPin,
    Radio,
    Route as RouteIcon,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { Link, Head } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';

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
    gate_number: string;
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
    scheduled_departure_time: string;
    scheduled_arrival_time: string | null;
    status_id: number;
    type?: 'Arrival' | 'Departure';
    
    // Relationships
    status: FlightStatus;
    airline: Airline;
    origin: Airport;
    destination: Airport;
    departure?: {
        gate?: Gate;
    };
    arrival?: {
        baggage_belt?: BaggageBelt;
    };
    gate?: Gate;
    baggageBelt?: BaggageBelt;
    
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

interface FlightsIndexProps {
    flights: PaginatedFlights;
    scheduleType: 'all' | 'arrivals' | 'departures';
    localAirport: string;
}

const getStatusColor = (statusCode: string): string => {
    switch (statusCode) {
        case 'SCH': return 'bg-blue-500 hover:bg-blue-600'; // Scheduled
        case 'BRD': return 'bg-green-500 hover:bg-green-600'; // Boarding
        case 'DEP': return 'bg-gray-500 hover:bg-gray-600'; // Departed
        case 'ARR': return 'bg-gray-500 hover:bg-gray-600'; // Arrived
        case 'DLY': return 'bg-yellow-500 hover:bg-yellow-600'; // Delayed
        case 'CNX': return 'bg-red-500 hover:bg-red-600'; // Cancelled
        case 'DIV': return 'bg-orange-500 hover:bg-orange-600'; // Diverted
        default: return 'bg-gray-400 hover:bg-gray-500';
    }
};

const formatTime = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
        return format(new Date(dateString), 'HH:mm');
    } catch {
        return 'N/A';
    }
};

const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
        return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
        return 'N/A';
    }
};


export default function FlightsIndex({ flights, scheduleType, localAirport }: FlightsIndexProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isLive, setIsLive] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // Simulate live updates indicator
    useEffect(() => {
        const interval = setInterval(() => {
            setLastUpdate(new Date());
        }, 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, []);

    const getPageTitle = () => {
        switch (scheduleType) {
            case 'arrivals': return `Arrivals - ${localAirport}`;
            case 'departures': return `Departures - ${localAirport}`;
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
                                {scheduleType === 'arrivals' && <PlaneLanding className="w-8 h-8 text-blue-600" />}
                                {scheduleType === 'departures' && <PlaneTakeoff className="w-8 h-8 text-green-600" />}
                                {scheduleType === 'all' && <RouteIcon className="w-8 h-8 text-purple-600" />}
                                <h2 className="text-3xl font-bold tracking-tight">{getPageTitle()}</h2>
                            </div>
                            <p className="text-muted-foreground mt-1 flex items-center gap-2">
                                {scheduleType === 'all' && `All active flights • ${flights.total} total`}
                                {scheduleType === 'arrivals' && `Incoming flights to ${localAirport} • ${flights.total} expected`}
                                {scheduleType === 'departures' && `Outgoing flights from ${localAirport} • ${flights.total} scheduled`}
                                <span className="flex items-center gap-1 text-xs">
                                    {isLive ? (
                                        <>
                                            <Radio className="w-3 h-3 text-green-500 animate-pulse" />
                                            <span className="text-green-600 font-medium">LIVE</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-3 h-3 text-yellow-500" />
                                            <span className="text-yellow-600">OFFLINE</span>
                                        </>
                                    )}
                                    <span className="text-muted-foreground ml-2">
                                        Updated {format(lastUpdate, 'HH:mm:ss')}
                                    </span>
                                </span>
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <Badge 
                            variant={scheduleType === 'all' ? 'default' : 'outline'}
                            className="cursor-pointer hover:bg-primary/80"
                        >
                            <Link href="/schedule/all" className="px-3 py-1">All Flights</Link>
                        </Badge>
                        <Badge 
                            variant={scheduleType === 'arrivals' ? 'default' : 'outline'}
                            className="cursor-pointer hover:bg-primary/80"
                        >
                            <Link href="/schedule/arrivals" className="px-3 py-1">
                                <PlaneLanding className="w-3 h-3 inline mr-1" />
                                Arrivals
                            </Link>
                        </Badge>
                        <Badge 
                            variant={scheduleType === 'departures' ? 'default' : 'outline'}
                            className="cursor-pointer hover:bg-primary/80"
                        >
                            <Link href="/schedule/departures" className="px-3 py-1">
                                <PlaneTakeoff className="w-3 h-3 inline mr-1" />
                                Departures
                            </Link>
                        </Badge>
                    </div>
                </div>

                <Separator />
                
                {/* Success/Info Message */}
                {flights.data && flights.data.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
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
                                    className="pl-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" className="gap-2">
                                <Clock className="w-4 h-4" />
                                Refresh
                            </Button>
                        </div>

                        {/* Flight Table */}
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold">Flight #</TableHead>
                                        <TableHead className="font-semibold">Airline</TableHead>
                                        <TableHead className="font-semibold">Route</TableHead>
                                        <TableHead className="font-semibold">Departure</TableHead>
                                        <TableHead className="font-semibold">Arrival</TableHead>
                                        <TableHead className="font-semibold">Gate/Claim</TableHead>
                                        <TableHead className="font-semibold text-center">Status</TableHead>
                                        <TableHead className="font-semibold text-center">Connection</TableHead>
                                        <TableHead className="font-semibold text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredFlights && filteredFlights.length > 0 ? (
                                        filteredFlights.map((flight) => (
                                            <TableRow key={flight.id} className="hover:bg-muted/50 transition-colors">
                                                <TableCell className="font-bold text-primary">
                                                    {flight.flight_number}
                                                    {flight.has_connections && (
                                                        <RouteIcon className="w-3 h-3 inline ml-1 text-purple-500" />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{flight.airline?.airline_name || 'N/A'}</span>
                                                        <span className="text-xs text-muted-foreground">{flight.airline_code}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-sm">
                                                            <div className="font-medium">{flight.origin?.iata_code || flight.origin_code}</div>
                                                            <div className="text-xs text-muted-foreground truncate max-w-[80px]">
                                                                {flight.origin?.city}
                                                            </div>
                                                        </div>
                                                        <span className="text-muted-foreground text-xs">→</span>
                                                        <div className="text-sm">
                                                            <div className="font-medium">{flight.destination?.iata_code || flight.destination_code}</div>
                                                            <div className="text-xs text-muted-foreground truncate max-w-[80px]">
                                                                {flight.destination?.city}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatTime(flight.scheduled_departure_time)}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatDate(flight.scheduled_departure_time)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatTime(flight.scheduled_arrival_time)}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatDate(flight.scheduled_arrival_time)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {flight.type === 'Departure' && (flight.departure?.gate || flight.gate) ? (
                                                            <div className="flex items-center gap-1">
                                                                <MapPin className="w-3 h-3 text-green-600" />
                                                                <div>
                                                                    <span className="font-medium">
                                                                        Gate {(flight.departure?.gate || flight.gate)?.gate_number}
                                                                    </span>
                                                                    {(flight.departure?.gate || flight.gate)?.terminal && (
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {(flight.departure?.gate || flight.gate)?.terminal?.terminal_name}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : flight.type === 'Arrival' && (flight.arrival?.baggage_belt || flight.baggageBelt) ? (
                                                            <div className="flex items-center gap-1">
                                                                <MapPin className="w-3 h-3 text-blue-600" />
                                                                <span className="font-medium">
                                                                    Belt {(flight.arrival?.baggage_belt || flight.baggageBelt)?.belt_code}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">TBA</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={getStatusColor(flight.status?.status_code || 'SCH')}>
                                                        {flight.status?.status_name || 'Scheduled'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {flight.has_connections ? (
                                                        <Badge variant="outline" className="gap-1 bg-purple-50 text-purple-700 border-purple-200">
                                                            <RouteIcon className="w-3 h-3" />
                                                            {(flight.inbound_connections?.length || 0) + (flight.outbound_connections?.length || 0)}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">Direct</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            title="View Details"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                            title="Edit Flight"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            title="Delete Flight"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
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
                                        <Button variant="outline" size="sm">← Previous</Button>
                                    )}
                                    {Array.from({ length: Math.min(5, flights.last_page) }, (_, i) => i + 1).map(page => (
                                        <Button 
                                            key={page}
                                            variant={page === flights.current_page ? 'default' : 'outline'}
                                            size="sm"
                                            className="w-8"
                                        >
                                            {page}
                                        </Button>
                                    ))}
                                    {flights.current_page < flights.last_page && (
                                        <Button variant="outline" size="sm">Next →</Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}