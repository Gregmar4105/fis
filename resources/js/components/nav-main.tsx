import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { 
    LayoutDashboard, 
    PlaneLanding, 
    PlaneTakeoff, 
    Calendar,
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
                                <LayoutDashboard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span>Dashboard</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>

            {/* Flight Tracking Section */}
            <SidebarGroup>
                <SidebarGroupLabel>Flight Tracking</SidebarGroupLabel>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            asChild 
                            isActive={currentUrl.includes('/schedule/all')}
                            tooltip="Flight Schedules"
                        >
                            <Link href={schedule.url('all')}>
                                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span>Flight Schedules</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            asChild 
                            isActive={currentUrl.includes('/schedule/arrivals')}
                            tooltip="Flight Arrivals"
                        >
                            <Link href={schedule.url('arrivals')}>
                                <PlaneLanding className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <span>Flight Arrivals</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            asChild 
                            isActive={currentUrl.includes('/schedule/departures')}
                            tooltip="Flight Departures"
                        >
                            <Link href={schedule.url('departures')}>
                                <PlaneTakeoff className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <span>Flight Departures</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            asChild 
                            isActive={currentUrl.includes('/connections')}
                            tooltip="Flight Connections"
                        >
                            <Link href={connections.url()}>
                                <RouteIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span>Flight Connections</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>

            {/* Flight Operations Section */}
            <SidebarGroup>
                <SidebarGroupLabel>Flight Operations</SidebarGroupLabel>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            asChild 
                            isActive={currentUrl.includes('/flights/management')}
                            tooltip="Flight Management"
                        >
                            <Link href="/flights/management">
                                <Edit3 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                <span>Flight Management</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            asChild 
                            isActive={currentUrl.includes('/flights/status-update')}
                            tooltip="Quick Flight Update"
                        >
                            <Link href="/flights/status-update">
                                <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                <span>Quick Flight Update</span>
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
                                <Building2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
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
                                <DoorOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
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
                                <Luggage className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <span>Baggage Belts</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
        </>
    );
}