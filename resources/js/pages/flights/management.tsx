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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Search,
    Plus,
    Pencil,
    Trash2,
    Eye,
    Plane,
    Filter,
    Calendar,
    X
} from 'lucide-react';
import { Link, Head, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { format } from 'date-fns';
import { useState } from 'react';

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

interface BaggageClaim {
    id: number;
    claim_area: string;
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
    baggage_claim: BaggageClaim | null;
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
    baggageClaims: BaggageClaim[];
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
    
    // Form state for create dialog
    const [formData, setFormData] = useState({
        flight_number: '',
        airline_code: '',
        aircraft_icao_code: '',
        origin_code: '',
        destination_code: '',
        scheduled_departure_time: '',
        scheduled_arrival_time: '',
        status_id: '1',
        gate_id: '',
        baggage_claim_id: '',
    });
    
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
            case 'SCH': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'BRD': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'DEP': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'ARR': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'DLY': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'CNL': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="search">Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <Input
                                        id="search"
                                        placeholder="Flight #, airline, airport..."
                                        className="pl-10"
                                        value={searchQuery}
                                        onChange={(e) => handleSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={filters.status || 'all'}
                                    onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
                                >
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        {options.statuses.map((status) => (
                                            <SelectItem key={status.id} value={status.id.toString()}>
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
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    Clear Filters
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Showing {flights.from}-{flights.to} of {flights.total} flights
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Flights Table Card */}
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Flight #</TableHead>
                                        <TableHead>Airline</TableHead>
                                        <TableHead>Route</TableHead>
                                        <TableHead>Aircraft</TableHead>
                                        <TableHead>Departure</TableHead>
                                        <TableHead>Arrival</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Gate/Claim</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {flights.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                                No flights found. Try adjusting your filters or create a new flight.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        flights.data.map((flight) => (
                                            <TableRow key={flight.id}>
                                                <TableCell className="font-medium">
                                                    {flight.flight_number}
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{flight.airline.airline_name}</div>
                                                        <div className="text-xs text-muted-foreground">{flight.airline_code}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <span className="font-medium">{flight.origin_code}</span>
                                                        <span className="text-muted-foreground">→</span>
                                                        <span className="font-medium">{flight.destination_code}</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {flight.origin.city} to {flight.destination.city}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {flight.aircraft ? (
                                                        <div>
                                                            <div className="text-sm">{flight.aircraft.model_name}</div>
                                                            <div className="text-xs text-muted-foreground">{flight.aircraft_icao_code}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {format(new Date(flight.scheduled_departure_time), 'HH:mm')}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {format(new Date(flight.scheduled_departure_time), 'MMM dd, yyyy')}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {format(new Date(flight.scheduled_arrival_time), 'HH:mm')}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {format(new Date(flight.scheduled_arrival_time), 'MMM dd, yyyy')}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={`${getStatusColor(flight.status.status_code)} border`}>
                                                        {flight.status.status_name}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        {flight.gate && (
                                                            <div className="text-xs flex items-center gap-1">
                                                                <span className="text-muted-foreground">Gate:</span>
                                                                <span className="font-medium">{flight.gate.gate_code}</span>
                                                            </div>
                                                        )}
                                                        {flight.baggage_claim && (
                                                            <div className="text-xs flex items-center gap-1">
                                                                <span className="text-muted-foreground">Claim:</span>
                                                                <span className="font-medium">{flight.baggage_claim.claim_area}</span>
                                                            </div>
                                                        )}
                                                        {!flight.gate && !flight.baggage_claim && (
                                                            <span className="text-xs text-muted-foreground">Not assigned</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            asChild
                                                        >
                                                            <Link href={`/flights/management/${flight.id}`}>
                                                                <Eye className="w-4 h-4" />
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setSelectedFlight(flight);
                                                                setShowEditDialog(true);
                                                            }}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(flight)}
                                                        >
                                                            <Trash2 className="w-4 h-4 text-destructive" />
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

                {/* Create Flight Dialog */}
                <Dialog open={showCreateDialog} onOpenChange={(open) => {
                    setShowCreateDialog(open);
                    if (!open) {
                        // Reset form when closing
                        setFormData({
                            flight_number: '',
                            airline_code: '',
                            aircraft_icao_code: '',
                            origin_code: '',
                            destination_code: '',
                            scheduled_departure_time: '',
                            scheduled_arrival_time: '',
                            status_id: '1',
                            gate_id: '',
                            baggage_claim_id: '',
                        });
                    }
                }}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create New Flight</DialogTitle>
                            <DialogDescription>
                                Add a new flight to the FIS system. All fields marked with * are required.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const submitData: any = { ...formData };
                            // Remove empty optional fields
                            if (!submitData.aircraft_icao_code) delete submitData.aircraft_icao_code;
                            if (!submitData.gate_id) delete submitData.gate_id;
                            if (!submitData.baggage_claim_id) delete submitData.baggage_claim_id;
                            
                            router.post('/flights/management', submitData, {
                                onSuccess: () => setShowCreateDialog(false),
                            });
                        }}>
                            <div className="grid gap-4 py-4">
                                {/* Flight Number */}
                                <div className="grid gap-2">
                                    <Label htmlFor="flight_number">Flight Number *</Label>
                                    <Input
                                        id="flight_number"
                                        value={formData.flight_number}
                                        onChange={(e) => setFormData({ ...formData, flight_number: e.target.value })}
                                        placeholder="e.g., PR104"
                                        required
                                    />
                                </div>

                                {/* Airline */}
                                <div className="grid gap-2">
                                    <Label htmlFor="airline_code">Airline *</Label>
                                    <Select 
                                        value={formData.airline_code} 
                                        onValueChange={(value) => setFormData({ ...formData, airline_code: value })}
                                        required
                                    >
                                        <SelectTrigger id="airline_code">
                                            <SelectValue placeholder="Select airline" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {options.airlines.map((airline) => (
                                                <SelectItem key={airline.airline_code} value={airline.airline_code}>
                                                    {airline.airline_code} - {airline.airline_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Aircraft */}
                                <div className="grid gap-2">
                                    <Label htmlFor="aircraft_icao_code">Aircraft (Optional)</Label>
                                    <Select 
                                        value={formData.aircraft_icao_code || 'none'} 
                                        onValueChange={(value) => setFormData({ ...formData, aircraft_icao_code: value === 'none' ? '' : value })}
                                    >
                                        <SelectTrigger id="aircraft_icao_code">
                                            <SelectValue placeholder="Select aircraft (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Aircraft</SelectItem>
                                            {options.aircraft.map((aircraft) => (
                                                <SelectItem key={aircraft.icao_code} value={aircraft.icao_code}>
                                                    {aircraft.icao_code} - {aircraft.manufacturer} {aircraft.model_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Route */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="origin_code">Origin Airport *</Label>
                                        <Select 
                                            value={formData.origin_code} 
                                            onValueChange={(value) => setFormData({ ...formData, origin_code: value })}
                                            required
                                        >
                                            <SelectTrigger id="origin_code">
                                                <SelectValue placeholder="Select origin" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.airports.map((airport) => (
                                                    <SelectItem key={airport.iata_code} value={airport.iata_code}>
                                                        {airport.iata_code} - {airport.city}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="destination_code">Destination Airport *</Label>
                                        <Select 
                                            value={formData.destination_code} 
                                            onValueChange={(value) => setFormData({ ...formData, destination_code: value })}
                                            required
                                        >
                                            <SelectTrigger id="destination_code">
                                                <SelectValue placeholder="Select destination" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.airports.map((airport) => (
                                                    <SelectItem key={airport.iata_code} value={airport.iata_code}>
                                                        {airport.iata_code} - {airport.city}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Schedule Times */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="scheduled_departure_time">Scheduled Departure *</Label>
                                        <Input
                                            id="scheduled_departure_time"
                                            value={formData.scheduled_departure_time}
                                            onChange={(e) => setFormData({ ...formData, scheduled_departure_time: e.target.value })}
                                            type="datetime-local"
                                            required
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="scheduled_arrival_time">Scheduled Arrival *</Label>
                                        <Input
                                            id="scheduled_arrival_time"
                                            value={formData.scheduled_arrival_time}
                                            onChange={(e) => setFormData({ ...formData, scheduled_arrival_time: e.target.value })}
                                            type="datetime-local"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="grid gap-2">
                                    <Label htmlFor="status_id">Initial Status *</Label>
                                    <Select 
                                        value={formData.status_id} 
                                        onValueChange={(value) => setFormData({ ...formData, status_id: value })}
                                    >
                                        <SelectTrigger id="status_id">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {options.statuses.map((status) => (
                                                <SelectItem key={status.id} value={status.id.toString()}>
                                                    {status.status_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Optional: Gate */}
                                <div className="grid gap-2">
                                    <Label htmlFor="gate_id">Gate (Optional)</Label>
                                    <Select 
                                        value={formData.gate_id || 'none'} 
                                        onValueChange={(value) => setFormData({ ...formData, gate_id: value === 'none' ? '' : value })}
                                    >
                                        <SelectTrigger id="gate_id">
                                            <SelectValue placeholder="Assign gate later" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Gate</SelectItem>
                                            {options.gates.map((gate) => (
                                                <SelectItem key={gate.id} value={gate.id.toString()}>
                                                    {gate.terminal.terminal_code}-{gate.gate_code}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Optional: Baggage Claim */}
                                <div className="grid gap-2">
                                    <Label htmlFor="baggage_claim_id">Baggage Claim (Optional)</Label>
                                    <Select 
                                        value={formData.baggage_claim_id || 'none'} 
                                        onValueChange={(value) => setFormData({ ...formData, baggage_claim_id: value === 'none' ? '' : value })}
                                    >
                                        <SelectTrigger id="baggage_claim_id">
                                            <SelectValue placeholder="Assign later" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Baggage Claim</SelectItem>
                                            {options.baggageClaims.map((claim) => (
                                                <SelectItem key={claim.id} value={claim.id.toString()}>
                                                    {claim.claim_area} ({claim.terminal.terminal_code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    Create Flight
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

