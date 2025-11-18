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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import FlightModal from '@/components/flights/FlightModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Search,
    Plus,
    Pencil,
    Trash2,
    Plane,
    Filter,
    Calendar,
    X,
    Clock,
    Route as RouteIcon
} from 'lucide-react';
import { Link, Head, router, usePage } from '@inertiajs/react';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { format } from 'date-fns';
import { useState } from 'react';

interface FlightStatus {
    id: number;
    status_code: string;
    id_status_code?: string;
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
    terminal: Terminal;
}

interface BaggageBelt {
    id: number;
    belt_code: string;
    status: string;
    terminal: Terminal;
}

interface Terminal {
    id: number;
    terminal_code: string;
    name: string;
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
    has_connections?: boolean;
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
    airlines: Airline[];
    airports: Airport[];
    aircraft: Aircraft[];
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

export default function FlightManagement({ flights, filters, options }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
    
    // (create form removed) Using `FlightModal` for create/edit lifecycle

    // Airline suggestions based on flight number prefix
    const [airlineSuggestions, setAirlineSuggestions] = useState<string[]>([]);
    const [originLetter, setOriginLetter] = useState<string | null>(null);
    const [destinationLetter, setDestinationLetter] = useState<string | null>(null);
    
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Manage Flights', href: '/flights/management' },
    ];

    const handleSearch = (value: string) => {
        setSearchQuery(value);
        router.get('/flights/management', { ...filters, search: value || undefined }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleFilterChange = (key: string, value: string) => {
        router.get('/flights/management', { ...filters, [key]: value || undefined }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setSearchQuery('');
        router.get('/flights/management', {}, { preserveState: true });
    };

    const handleDelete = (flight: Flight) => {
        setSelectedFlight(flight);
        setShowDeleteDialog(true);
    };

    const confirmDelete = () => {
        if (selectedFlight) {
            router.delete(`/flights/management/${selectedFlight.id}`, {
                onSuccess: () => {
                    setShowDeleteDialog(false);
                    setSelectedFlight(null);
                },
            });
        }
    };

    const getStatusColor = (statusCode: string) => {
        switch (statusCode) {
            case 'SCH': return 'bg-blue-500/20 text-blue-400 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30';
            case 'BRD': return 'bg-green-500/20 text-green-400 border-green-500/30 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30';
            case 'DEP': return 'bg-green-600/20 text-green-600 border-green-600/30 dark:bg-green-600/20 dark:text-green-500 dark:border-green-600/30';
            case 'ARR': return 'bg-purple-500/20 text-purple-400 border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30';
            case 'DLY': return 'bg-orange-500/20 text-orange-400 border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30';
            case 'CNL': return 'bg-red-500/20 text-red-400 border-red-500/30 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Flight Management" />

            <div className="space-y-6 py-6 px-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Plane className="w-8 h-8 text-primary" />
                            Flight Management
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Create, view, update, and manage flight operations globally
                        </p>
                    </div>
                    <Button onClick={() => setShowCreateDialog(true)} size="lg">
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Flight
                    </Button>
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
                                        <TableHead className="font-semibold text-center w-20">Gate</TableHead>
                                        <TableHead className="font-semibold text-center w-20">Belt</TableHead>
                                        <TableHead className="font-semibold text-center w-28">Departure</TableHead>
                                        <TableHead className="font-semibold text-center w-28">Arrival</TableHead>
                                        <TableHead className="font-semibold text-center w-24">Status</TableHead>
                                        <TableHead className="font-semibold text-center w-20">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {flights.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                                No flights found. Try adjusting your filters or create a new flight.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        flights.data.map((flight) => (
                                            <TableRow key={flight.id} className="hover:bg-muted/50 transition-colors">
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
                                                <TableCell className="text-center w-20">
                                                    {flight.gate ? (
                                                        <span className="font-medium text-sm truncate">
                                                            {flight.gate.gate_code || 'N/A'}
                                                        </span>
                                                    ) : (
                                                        <span className="font-bold text-sm">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center w-20">
                                                    {flight.baggage_belt ? (
                                                        <span className="font-medium text-sm truncate">
                                                            {flight.baggage_belt.belt_code || 'N/A'}
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
                                                    <Badge className={`${getStatusColor(flight.status.status_code)} border`}>
                                                        {flight.status.status_name}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center w-20">
                                                    <div className="flex justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                                            onClick={() => {
                                                                setSelectedFlight(flight);
                                                                setShowEditDialog(true);
                                                            }}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            onClick={() => handleDelete(flight)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {flights.data.length > 0 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t">
                                <div className="text-sm text-muted-foreground">
                                    Showing {((flights.current_page - 1) * flights.per_page) + 1} to {Math.min(flights.current_page * flights.per_page, flights.total)} of {flights.total} entries
                                </div>
                                <div className="flex gap-1">
                                    {flights.current_page > 1 && (
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => router.get(`/flights/management`, { ...filters, page: flights.current_page - 1 })}
                                        >
                                            ← Previous
                                        </Button>
                                    )}
                                    {Array.from({ length: Math.min(5, flights.last_page) }, (_, i) => {
                                        let page = i + 1;
                                        // Show pages around current page
                                        if (flights.last_page > 5) {
                                            if (flights.current_page <= 3) {
                                                page = i + 1;
                                            } else if (flights.current_page >= flights.last_page - 2) {
                                                page = flights.last_page - 4 + i;
                                            } else {
                                                page = flights.current_page - 2 + i;
                                            }
                                        }
                                        return page;
                                    }).map(page => (
                                        <Button 
                                            key={page}
                                            variant={page === flights.current_page ? 'default' : 'outline'}
                                            size="sm"
                                            className="w-8"
                                            onClick={() => router.get(`/flights/management`, { ...filters, page })}
                                        >
                                            {page}
                                        </Button>
                                    ))}
                                    {flights.current_page < flights.last_page && (
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => router.get(`/flights/management`, { ...filters, page: flights.current_page + 1 })}
                                        >
                                            Next →
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Delete Confirmation Dialog */}
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Flight</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete flight {selectedFlight?.flight_number}?
                                This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={confirmDelete}>
                                Delete Flight
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Reusable Flight modals: Create + Edit */}
                <FlightModal open={showCreateDialog} onOpenChange={(open: boolean) => {
                    setShowCreateDialog(open);
                }} options={options} initialData={{}} />

                <FlightModal open={showEditDialog} onOpenChange={(open: boolean) => {
                    setShowEditDialog(open);
                    if (!open) {
                        setSelectedFlight(null);
                    }
                }} options={options} initialData={selectedFlight ?? {}} />
            </div>
        </AppLayout>
    );
}

