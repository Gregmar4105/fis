import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    PlaneTakeoff, 
    PlaneLanding, 
    Clock, 
    AlertCircle,
    TrendingUp,
    Users,
    AlertTriangle,
    Info,
    XCircle
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
    onTime: number;
    boarding: number;
}

interface DashboardFlight {
    id: number;
    flight_number: string;
    airline: string;
    origin: string;
    destination: string;
    scheduled_departure: string;
    scheduled_arrival: string;
    status: string;
    status_code: string;
    gate: string | null;
    terminal: string | null;
    baggage_belt: string | null;
}

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
    activeFlights?: ActiveFlight[];
    systemAlerts?: SystemAlert[];
}

export default function Dashboard({ stats, activeFlights = [], systemAlerts = [] }: DashboardProps) {
    // Default stats if not provided
    const dashboardStats = stats || {
        totalFlights: 0,
        arrivals: 0,
        departures: 0,
        delayed: 0,
        onTime: 0,
        boarding: 0,
    };

    const getStatusBadgeColor = (statusCode: string) => {
        switch (statusCode) {
            case 'SCH': return 'bg-blue-500';
            case 'BRD': return 'bg-purple-500';
            case 'DLY': return 'bg-yellow-500';
            case 'DEP': return 'bg-green-500';
            case 'ARR': return 'bg-gray-500';
            case 'CNX': return 'bg-red-500';
            default: return 'bg-gray-500';
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
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Active Flights</CardTitle>
                            <Clock className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{dashboardStats.totalFlights}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Currently being tracked
                            </p>
                        </CardContent>
                    </Card>

                    {/* Arrivals */}
                    <Link href="/schedule/arrivals">
                        <Card className="hover:shadow-lg transition-shadow hover:border-blue-500 cursor-pointer">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Arrivals</CardTitle>
                                <PlaneLanding className="h-5 w-5 text-blue-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-blue-600">{dashboardStats.arrivals}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Expected incoming flights
                                </p>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Departures */}
                    <Link href="/schedule/departures">
                        <Card className="hover:shadow-lg transition-shadow hover:border-green-500 cursor-pointer">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Departures</CardTitle>
                                <PlaneTakeoff className="h-5 w-5 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-green-600">{dashboardStats.departures}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Scheduled outgoing flights
                                </p>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Delayed Flights */}
                    <Card className="hover:shadow-lg transition-shadow border-yellow-200 dark:border-yellow-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Delayed</CardTitle>
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-yellow-600">{dashboardStats.delayed}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Flights experiencing delays
                            </p>
                        </CardContent>
                    </Card>

                    {/* On-Time Performance */}
                    <Card className="hover:shadow-lg transition-shadow border-green-200 dark:border-green-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">On-Time</CardTitle>
                            <TrendingUp className="h-5 w-5 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">{dashboardStats.onTime}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Operating as scheduled
                            </p>
                        </CardContent>
                    </Card>

                    {/* Boarding */}
                    <Card className="hover:shadow-lg transition-shadow border-purple-200 dark:border-purple-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Boarding</CardTitle>
                            <Users className="h-5 w-5 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-purple-600">{dashboardStats.boarding}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Currently boarding passengers
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Active Flights Table */}
                {activeFlights.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Flights</CardTitle>
                            <CardDescription>Next 10 flights in the system (next 24 hours)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Flight</TableHead>
                                        <TableHead>Airline</TableHead>
                                        <TableHead>Route</TableHead>
                                        <TableHead>Departure</TableHead>
                                        <TableHead>Arrival</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Gate</TableHead>
                                        <TableHead>Baggage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activeFlights.map((flight) => (
                                        <TableRow key={flight.id}>
                                            <TableCell className="font-medium">{flight.flight_number}</TableCell>
                                            <TableCell>{flight.airline}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm">{flight.origin}</span>
                                                    <span className="text-muted-foreground">→</span>
                                                    <span className="font-mono text-sm">{flight.destination}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{flight.scheduled_departure}</TableCell>
                                            <TableCell>{flight.scheduled_arrival || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Badge className={getStatusBadgeColor(flight.status_code)}>
                                                    {flight.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {flight.gate ? (
                                                    <span className="font-mono text-sm">
                                                        {flight.terminal && `${flight.terminal}-`}{flight.gate}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">Not assigned</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {flight.baggage_belt ? (
                                                    <span className="font-mono text-sm">{flight.baggage_belt}</span>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">N/A</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Navigate to key flight management areas</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <Link href="/schedule/all">
                            <Card className="hover:bg-accent cursor-pointer transition-colors">
                                <CardContent className="flex items-center justify-between p-4">
                                    <div>
                                        <p className="font-medium">All Schedules</p>
                                        <p className="text-sm text-muted-foreground">View all flights</p>
                                    </div>
                                    <Badge>View</Badge>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/schedule/arrivals">
                            <Card className="hover:bg-accent cursor-pointer transition-colors">
                                <CardContent className="flex items-center justify-between p-4">
                                    <div>
                                        <p className="font-medium">Arrivals</p>
                                        <p className="text-sm text-muted-foreground">Incoming flights</p>
                                    </div>
                                    <Badge className="bg-blue-500">View</Badge>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/schedule/departures">
                            <Card className="hover:bg-accent cursor-pointer transition-colors">
                                <CardContent className="flex items-center justify-between p-4">
                                    <div>
                                        <p className="font-medium">Departures</p>
                                        <p className="text-sm text-muted-foreground">Outgoing flights</p>
                                    </div>
                                    <Badge className="bg-green-500">View</Badge>
                                </CardContent>
                            </Card>
                        </Link>
                    </CardContent>
                </Card>

                {/* System Info */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">System Integration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">ARS (Airline Reservation)</span>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Connected</Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">ATC (Air Traffic Control)</span>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Connected</Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">PMS (Passenger Management)</span>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Connected</Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">BHS (Baggage Handling)</span>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Connected</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {activeFlights.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">No recent flight activity</p>
                            ) : (
                                activeFlights.slice(0, 3).map((flight, index) => (
                                    <div key={flight.id} className="flex items-start gap-3">
                                        <div className={`h-2 w-2 rounded-full mt-1.5 ${
                                            flight.status_code === 'BRD' ? 'bg-purple-500' :
                                            flight.status_code === 'DLY' ? 'bg-yellow-500' :
                                            flight.status_code === 'SCH' ? 'bg-blue-500' :
                                            'bg-green-500'
                                        }`} />
                                        <div>
                                            <p className="font-medium">{flight.flight_number} - {flight.status}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {flight.origin} → {flight.destination} • {flight.scheduled_departure}
                                                {flight.gate && ` • Gate ${flight.gate}`}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
