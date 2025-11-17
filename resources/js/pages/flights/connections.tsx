import AppLayout from '@/layouts/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Search, 
    Eye, 
    Route as RouteIcon,
    ArrowRight,
    Clock,
    MapPin,
    Plane
} from 'lucide-react';
import { Link, Head } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';

// Reuse types from index.tsx
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
    connecting_from?: Flight;
    connecting_to?: Flight;
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
    type?: 'Arrival' | 'Departure' | 'Connection';
    
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

interface Props {
    flights: PaginatedFlights;
    title: string;
    type: string;
}

export default function FlightConnections({ flights, title }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredFlights, setFilteredFlights] = useState(flights.data);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // Live update indicator
    useEffect(() => {
        const timer = setInterval(() => {
            setLastUpdate(new Date());
        }, 30000); // Update every 30 seconds

        return () => clearInterval(timer);
    }, []);

    // Search functionality
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredFlights(flights.data);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = flights.data.filter(flight => 
            flight.flight_number.toLowerCase().includes(query) ||
            flight.airline.airline_name.toLowerCase().includes(query) ||
            flight.origin.city.toLowerCase().includes(query) ||
            flight.destination.city.toLowerCase().includes(query) ||
            flight.status.status_name.toLowerCase().includes(query)
        );
        setFilteredFlights(filtered);
    }, [searchQuery, flights.data]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Connecting Flights', href: '/connections' },
    ];

    const getStatusColor = (statusCode: string) => {
        switch (statusCode) {
            case 'SCH': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'BRD': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'DEP': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'ARR': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'DLY': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'CNX': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />

            <div className="space-y-6 py-6 px-4">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <RouteIcon className="w-8 h-8 text-primary" />
                            {title}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Flights requiring passenger transfers or connections
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Live • Updated {format(lastUpdate, 'HH:mm:ss')}
                            </span>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Main Content Card */}
                <Card>
                    <CardContent className="p-6">
                        {/* Search and Actions Bar */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    type="text"
                                    placeholder="Search by flight number, airline, city, or status..."
                                    className="pl-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Flights Table */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Flight</TableHead>
                                        <TableHead>Route</TableHead>
                                        <TableHead>Connection Type</TableHead>
                                        <TableHead>Schedule</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Gate</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredFlights.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                    <RouteIcon className="w-8 h-8 mb-2 opacity-50" />
                                                    <p>No connecting flights found</p>
                                                    {searchQuery && (
                                                        <p className="text-sm mt-1">Try adjusting your search</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredFlights.map((flight) => (
                                            <TableRow key={flight.id}>
                                                {/* Flight Number */}
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col">
                                                        <span className="text-base">{flight.flight_number}</span>
                                                        <span className="text-xs text-muted-foreground">{flight.airline.airline_name}</span>
                                                    </div>
                                                </TableCell>

                                                {/* Route */}
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-sm">
                                                            <div className="font-medium">{flight.origin.iata_code}</div>
                                                            <div className="text-xs text-muted-foreground">{flight.origin.city}</div>
                                                        </div>
                                                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                                        <div className="text-sm">
                                                            <div className="font-medium">{flight.destination.iata_code}</div>
                                                            <div className="text-xs text-muted-foreground">{flight.destination.city}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Connection Type */}
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        {flight.inbound_connections && flight.inbound_connections.length > 0 && (
                                                            <Badge variant="outline" className="w-fit text-xs">
                                                                <Plane className="w-3 h-3 mr-1 rotate-180" />
                                                                {flight.inbound_connections.length} Inbound
                                                            </Badge>
                                                        )}
                                                        {flight.outbound_connections && flight.outbound_connections.length > 0 && (
                                                            <Badge variant="outline" className="w-fit text-xs">
                                                                <Plane className="w-3 h-3 mr-1" />
                                                                {flight.outbound_connections.length} Outbound
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Schedule */}
                                                <TableCell>
                                                    <div className="flex flex-col gap-1 text-sm">
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                            <span className="text-xs text-muted-foreground">Dep:</span>
                                                            <span>{format(new Date(flight.scheduled_departure_time), 'HH:mm')}</span>
                                                        </div>
                                                        {flight.scheduled_arrival_time && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                                <span className="text-xs text-muted-foreground">Arr:</span>
                                                                <span>{format(new Date(flight.scheduled_arrival_time), 'HH:mm')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={`${getStatusColor(flight.status.status_code)} font-medium`}
                                                    >
                                                        {flight.status.status_name}
                                                    </Badge>
                                                </TableCell>

                                                {/* Gate */}
                                                <TableCell>
                                                    {flight.gate ? (
                                                        <div className="flex items-center gap-1.5 text-sm">
                                                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                                            <span>{flight.gate.gate_number}</span>
                                                            {flight.gate.terminal && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    ({flight.gate.terminal.terminal_name})
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">TBA</span>
                                                    )}
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {flights.data.length > 0 && (
                            <div className="flex items-center justify-between pt-4">
                                <div className="text-sm text-muted-foreground">
                                    Showing {(flights.current_page - 1) * flights.per_page + 1} to {Math.min(flights.current_page * flights.per_page, flights.total)} of {flights.total} entries
                                </div>
                                <div className="flex gap-1">
                                    {flights.current_page > 1 && (
                                        <Link href={`?page=${flights.current_page - 1}`}>
                                            <Button variant="outline" size="sm">Previous</Button>
                                        </Link>
                                    )}
                                    {flights.current_page < flights.last_page && (
                                        <Link href={`?page=${flights.current_page + 1}`}>
                                            <Button variant="outline" size="sm">Next</Button>
                                        </Link>
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
