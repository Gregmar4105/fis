import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { 
    LayoutDashboard, 
    PlaneLanding, 
    PlaneTakeoff, 
    ListFilter,
    Route as RouteIcon,
    Edit3,
    Zap,
    Building2,
    DoorOpen,
    Luggage
} from 'lucide-react';
import { schedule, connections } from '@/routes/flights';
import { 
    SidebarGroup, 
    SidebarGroupLabel, 
    SidebarMenu, 
    SidebarMenuItem, 
    SidebarMenuButton 
} from '@/components/ui/sidebar';

export function NavMain() {
    const { url: currentUrl } = usePage();
    const localAirport = 'MNL';

    const isActive = (href: string) => {
        return currentUrl === href || currentUrl.startsWith(href + '/');
    };

    return (
        <>
            {/* Platform Section */}
            <SidebarGroup>
                <SidebarGroupLabel>Platform</SidebarGroupLabel>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            asChild 
                            isActive={isActive('/dashboard')}
                            tooltip="Dashboard"
                        >
                            <Link href="/dashboard">
                                <LayoutDashboard className="w-4 h-4" />
                                <span>Dashboard</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>

            {/* Flight Management Section */}
            <SidebarGroup>
                <SidebarGroupLabel>Flight Management</SidebarGroupLabel>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            asChild 
                            isActive={currentUrl.includes('/schedule/all')}
                            tooltip="All Schedules"
                        >
                            <Link href={schedule.url('all')}>
                                <ListFilter className="w-4 h-4" />
                                <span>All Schedules</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            asChild 
                            isActive={currentUrl.includes('/schedule/arrivals')}
                            tooltip={`Arrivals - ${localAirport}`}
                        >
                            <Link href={schedule.url('arrivals')}>
                                <PlaneLanding className="w-4 h-4" />
                                <span>Arrivals ({localAirport})</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            asChild 
                            isActive={currentUrl.includes('/schedule/departures')}
                            tooltip={`Departures - ${localAirport}`}
                        >
                            <Link href={schedule.url('departures')}>
                                <PlaneTakeoff className="w-4 h-4" />
                                <span>Departures ({localAirport})</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            asChild 
                            isActive={currentUrl.includes('/connections')}
                            tooltip="Connecting Flights"
                        >
                            <Link href={connections.url()}>
                                <RouteIcon className="w-4 h-4" />
                                <span>Connections</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            asChild 
                            isActive={currentUrl.includes('/flights/management')}
                            tooltip="Manage Flights"
                        >
                            <Link href="/flights/management">
                                <Edit3 className="w-4 h-4" />
                                <span>Manage Flights</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            asChild 
                            isActive={currentUrl.includes('/flights/status-update')}
                            tooltip="Status Update"
                        >
                            <Link href="/flights/status-update">
                                <Zap className="w-4 h-4" />
                                <span>Status Update</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>

            {/* Airport Resources Section */}
            <SidebarGroup>
                <SidebarGroupLabel>Airport Resources</SidebarGroupLabel>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            asChild 
                            isActive={currentUrl.includes('/management/terminals')}
                            tooltip="Terminal Management"
                        >
                            <Link href="/management/terminals">
                                <Building2 className="w-4 h-4" />
                                <span>Terminals</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            asChild 
                            isActive={currentUrl.includes('/management/gates')}
                            tooltip="Gate Management"
                        >
                            <Link href="/management/gates">
                                <DoorOpen className="w-4 h-4" />
                                <span>Gates</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            asChild 
                            isActive={currentUrl.includes('/management/baggage-belts')}
                            tooltip="Baggage Belt Management"
                        >
                            <Link href="/management/baggage-belts">
                                <Luggage className="w-4 h-4" />
                                <span>Baggage Belts</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
        </>
    );
}