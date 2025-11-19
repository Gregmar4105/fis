import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { connections } from '@/routes/flights';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    PlaneTakeoff, 
    PlaneLanding, 
    Clock, 
    AlertCircle,
    Route as RouteIcon,
    XCircle as XCircleIcon,
    AlertTriangle,
    Info,
    XCircle,
    LayoutDashboard,
    Calendar,
    MapPin
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { schedule } from '@/routes/flights';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

interface DashboardStats {
    totalFlights: number;
    arrivals: number;
    departures: number;
    delayed: number;
    cancelled: number;
    connections: number;
}

interface DashboardFlight {
    id: number;
    flight_number: string;
    airline: string;
    airline_code?: string;
    origin: string;
    destination: string;
    scheduled_departure: string;
    scheduled_arrival: string | null;
    status: string;
    status_code: string;
    gate: string | null;
    terminal: string | null;
    baggage_belt: string | null;
    aircraft?: {
        icao_code: string;
        manufacturer?: string;
        model_name?: string;
    } | null;
}

// Format time with timezone conversion
const formatTime = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return format(date, 'HH:mm');
    } catch {
        return 'N/A';
    }
};

// Format date with timezone conversion
const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return format(date, 'MMM dd, yyyy');
    } catch {
        return 'N/A';
    }
};

interface SystemAlert {
    type: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: string;
    details?: any;
    count?: number;
}

interface DashboardProps {
    stats?: DashboardStats;
    activeFlights?: DashboardFlight[];
    systemAlerts?: SystemAlert[];
}

export default function Dashboard({ stats, activeFlights = [], systemAlerts = [] }: DashboardProps) {
    // Default stats if not provided
    const dashboardStats = stats || {
        totalFlights: 0,
        arrivals: 0,
        departures: 0,
        delayed: 0,
        cancelled: 0,
        connections: 0,
    };

    const getStatusBadgeColor = (statusCode: string) => {
        switch (statusCode) {
            case 'SCH': return 'bg-blue-500/20 text-blue-400 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30';
            case 'BRD': return 'bg-green-500/20 text-green-400 border-green-500/30 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30';
            case 'DLY': return 'bg-orange-500/20 text-orange-400 border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30';
            case 'DEP': return 'bg-green-600/20 text-green-600 border-green-600/30 dark:bg-green-600/20 dark:text-green-500 dark:border-green-600/30';
            case 'ARR': return 'bg-purple-500/20 text-purple-400 border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30';
            case 'CNX': return 'bg-red-500/20 text-red-400 border-red-500/30 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30';
        }
    };

    const getAlertIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return <XCircle className="h-4 w-4" />;
            case 'warning': return <AlertTriangle className="h-4 w-4" />;
            case 'info': return <Info className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    const getAlertVariant = (severity: string): 'default' | 'destructive' => {
        return severity === 'critical' ? 'destructive' : 'default';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard - Flight Information System" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                
                {/* Page Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Flight Information System</h1>
                    <p className="text-muted-foreground mt-1">Real-time flight tracking and management dashboard</p>
                </div>

                {/* System Alerts */}
                {systemAlerts.length > 0 && (
                    <div className="space-y-2">
                        {systemAlerts.map((alert, index) => (
                            <Alert key={index} variant={getAlertVariant(alert.severity)}>
                                {getAlertIcon(alert.severity)}
                                <AlertTitle className="ml-2">
                                    {alert.severity === 'critical' ? 'Critical Alert' : 
                                     alert.severity === 'warning' ? 'Warning' : 'Information'}
                                </AlertTitle>
                                <AlertDescription className="ml-2">
                                    {alert.message} - {alert.timestamp}
                                </AlertDescription>
                            </Alert>
                        ))}
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Total Flights */}
                    <Card className="hover:shadow-xl transition-all duration-300 border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 dark:hover:border-indigo-400 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold">Total Flights</CardTitle>
                            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                                <LayoutDashboard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">{dashboardStats.totalFlights}</div>
                            <p className="text-xs text-muted-foreground font-medium">
                                Currently being tracked
                            </p>
                        </CardContent>
                    </Card>

                    {/* Delayed Flights */}
                    <Card className="hover:shadow-xl transition-all duration-300 border-2 border-yellow-200 dark:border-yellow-800 hover:border-yellow-500 dark:hover:border-yellow-400 bg-gradient-to-br from-yellow-50/50 to-white dark:from-yellow-950/20 dark:to-slate-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold">Delayed</CardTitle>
                            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">{dashboardStats.delayed}</div>
                            <p className="text-xs text-muted-foreground font-medium">
                                Flights experiencing delays
                            </p>
                        </CardContent>
                    </Card>

                    {/* Cancelled Flights */}
                    <Card className="hover:shadow-xl transition-all duration-300 border-2 border-red-200 dark:border-red-800 hover:border-red-500 dark:hover:border-red-400 bg-gradient-to-br from-red-50/50 to-white dark:from-red-950/20 dark:to-slate-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold">Cancelled</CardTitle>
                            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                                <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-red-600 dark:text-red-400 mb-1">{dashboardStats.cancelled}</div>
                            <p className="text-xs text-muted-foreground font-medium">
                                Flights that have been cancelled
                            </p>
                        </CardContent>
                    </Card>

                    {/* Arrivals */}
                    <Card className="hover:shadow-xl transition-all duration-300 border-2 border-green-200 dark:border-green-800 hover:border-green-500 dark:hover:border-green-400 bg-gradient-to-br from-green-50/50 to-white dark:from-green-950/20 dark:to-slate-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold">Arrivals</CardTitle>
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                <PlaneLanding className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-1">{dashboardStats.arrivals}</div>
                            <p className="text-xs text-muted-foreground font-medium">
                                Expected incoming flights
                            </p>
                        </CardContent>
                    </Card>

                    {/* Departures */}
                    <Card className="hover:shadow-xl transition-all duration-300 border-2 border-purple-200 dark:border-purple-800 hover:border-purple-500 dark:hover:border-purple-400 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-slate-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold">Departures</CardTitle>
                            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                <PlaneTakeoff className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-1">{dashboardStats.departures}</div>
                            <p className="text-xs text-muted-foreground font-medium">
                                Scheduled outgoing flights
                            </p>
                        </CardContent>
                    </Card>

                    {/* Connections */}
                    <Link href={connections.url()}>
                        <Card className="hover:shadow-xl transition-all duration-300 border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 dark:hover:border-indigo-400 cursor-pointer bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-semibold">Connections</CardTitle>
                                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                                    <RouteIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">{dashboardStats.connections}</div>
                                <p className="text-xs text-muted-foreground font-medium">
                                    Flights with connections
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Flight Schedules */}
                {activeFlights.length > 0 && (
                    <Card className="shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                        <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">Flight Schedules</CardTitle>
                                        <CardDescription className="text-sm mt-1">
                                            All active flights in the system ({activeFlights.length} total)
                                        </CardDescription>
                                    </div>
                                </div>
                                <Link href={schedule.url('all')}>
                                    <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-4 py-2">
                                        View Full Schedule
                                    </Badge>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
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
                                        {activeFlights.map((flight) => (
                                            <TableRow key={flight.id} className="hover:bg-accent/50 dark:hover:bg-accent/30 transition-colors">
                                                <TableCell className="font-bold text-primary w-24 text-center">
                                                    {flight.flight_number}
                                                </TableCell>
                                                <TableCell className="text-left w-32">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-medium text-sm text-right flex-1 truncate">{flight.origin}</span>
                                                            <span className="text-muted-foreground text-xs shrink-0">→</span>
                                                            <span className="font-medium text-sm text-left flex-1 truncate">{flight.destination}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="w-28 text-center">
                                                    <div className="flex flex-col items-center text-center">
                                                        <span className="font-medium text-sm truncate w-full">{flight.airline || 'N/A'}</span>
                                                        {flight.airline_code && (
                                                            <span className="text-xs text-muted-foreground">{flight.airline_code}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="w-28 text-center">
                                                    {flight.aircraft ? (
                                                        <div className="flex flex-col items-center text-center">
                                                            <span className="font-medium text-sm truncate w-full">{flight.aircraft.icao_code || 'N/A'}</span>
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
                                                <TableCell className="w-24 text-center">
                                                    <span className="font-medium text-sm">{flight.terminal || 'N/A'}</span>
                                                </TableCell>
                                                <TableCell className="text-center w-20">
                                                    {flight.gate ? (
                                                        <span className="font-medium text-sm">{flight.gate}</span>
                                                    ) : (
                                                        <span className="font-bold text-sm">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center w-20">
                                                    {flight.baggage_belt && flight.baggage_belt !== 'UNASSIGNED' ? (
                                                        <span className="font-medium text-sm">{flight.baggage_belt}</span>
                                                    ) : (
                                                        <span className="font-bold text-sm">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="w-28">
                                                    <div className="flex flex-col items-center text-center">
                                                        <span className="font-medium flex items-center gap-1 text-sm">
                                                            <Clock className="w-3 h-3 shrink-0" />
                                                            <span className="truncate">{formatTime(flight.scheduled_departure)}</span>
                                                        </span>
                                                        <span className="text-xs text-muted-foreground text-center truncate w-full">
                                                            {formatDate(flight.scheduled_departure)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="w-28">
                                                    <div className="flex flex-col items-center text-center">
                                                        <span className="font-medium flex items-center gap-1 text-sm">
                                                            <Clock className="w-3 h-3 shrink-0" />
                                                            <span className="truncate">{formatTime(flight.scheduled_arrival)}</span>
                                                        </span>
                                                        <span className="text-xs text-muted-foreground text-center truncate w-full">
                                                            {formatDate(flight.scheduled_arrival)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center w-24">
                                                    <Badge className={getStatusBadgeColor(flight.status_code)}>
                                                        {flight.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Navigate to key flight tracking areas</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Link href={schedule.url('all')}>
                            <Card className="hover:bg-accent cursor-pointer transition-colors">
                                <CardContent className="flex items-center justify-between p-4">
                                    <div>
                                        <p className="font-medium">Schedules</p>
                                        <p className="text-sm text-muted-foreground">View all flights</p>
                                    </div>
                                    <Badge className="bg-blue-500 dark:bg-blue-600 text-white">View</Badge>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href={schedule.url('arrivals')}>
                            <Card className="hover:bg-accent cursor-pointer transition-colors">
                                <CardContent className="flex items-center justify-between p-4">
                                    <div>
                                        <p className="font-medium">Arrivals</p>
                                        <p className="text-sm text-muted-foreground">Incoming flights</p>
                                    </div>
                                    <Badge className="bg-green-500 dark:bg-green-600 text-white">View</Badge>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href={schedule.url('departures')}>
                            <Card className="hover:bg-accent cursor-pointer transition-colors">
                                <CardContent className="flex items-center justify-between p-4">
                                    <div>
                                        <p className="font-medium">Departures</p>
                                        <p className="text-sm text-muted-foreground">Outgoing flights</p>
                                    </div>
                                    <Badge className="bg-purple-500 dark:bg-purple-600 text-white">View</Badge>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href={connections.url()}>
                            <Card className="hover:bg-accent cursor-pointer transition-colors">
                                <CardContent className="flex items-center justify-between p-4">
                                    <div>
                                        <p className="font-medium">Connections</p>
                                        <p className="text-sm text-muted-foreground">Connecting flights</p>
                                    </div>
                                    <Badge className="bg-indigo-500 dark:bg-indigo-600 text-white">View</Badge>
                                </CardContent>
                            </Card>
                        </Link>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Recent Activity</CardTitle>
                        <CardDescription>Latest flight updates and changes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {activeFlights.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">No recent flight activity</p>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {activeFlights.slice(0, 6).map((flight) => {
                                    const statusColors = {
                                        'BRD': 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20',
                                        'DLY': 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20',
                                        'SCH': 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20',
                                        'CNX': 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20',
                                        'DEP': 'bg-green-600/10 border-green-600/30 hover:bg-green-600/20',
                                        'ARR': 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20',
                                    };
                                    const cardColor = statusColors[flight.status_code as keyof typeof statusColors] || 'bg-gray-500/10 border-gray-500/30 hover:bg-gray-500/20';
                                    
                                    return (
                                        <div key={flight.id} className={`p-4 rounded-lg border transition-all cursor-pointer ${cardColor}`}>
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className={`h-3 w-3 rounded-full shrink-0 mt-1 ${
                                                    flight.status_code === 'BRD' ? 'bg-green-500' :
                                                    flight.status_code === 'DLY' ? 'bg-orange-500' :
                                                    flight.status_code === 'SCH' ? 'bg-blue-500' :
                                                    flight.status_code === 'CNX' ? 'bg-red-500' :
                                                    flight.status_code === 'DEP' ? 'bg-green-600' :
                                                    flight.status_code === 'ARR' ? 'bg-purple-500' :
                                                    'bg-gray-500'
                                                }`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-base">{flight.flight_number}</span>
                                                        <Badge className={cn(getStatusBadgeColor(flight.status_code), "text-xs")} variant="outline">
                                                            {flight.status}
                                                        </Badge>
                                                    </div>
                                                    {flight.airline && (
                                                        <p className="text-xs text-muted-foreground truncate">{flight.airline}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                    <span className="font-medium truncate">{flight.origin} → {flight.destination}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                    <span>{formatTime(flight.scheduled_departure)}</span>
                                                </div>
                                                {(flight.gate || flight.terminal) && (
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        {flight.terminal && <span>Terminal: {flight.terminal}</span>}
                                                        {flight.gate && <span>• Gate: {flight.gate}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
