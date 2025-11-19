import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { DoorOpen, Plus, Pencil, Trash2, Plane, Search } from 'lucide-react';
import { Head, router, useForm } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type BreadcrumbItem } from '@/types';
import { useMemo, useState } from 'react';

interface Terminal {
    id: number;
    code: string;
    name: string;
    airport: string;
}

interface CurrentFlight {
    flight_number: string;
    airline: string;
    status: string;
    scheduled_departure: string;
}

interface Gate {
    id: number;
    gate_code: string;
    gate_status?: string;
    terminal: Terminal;
    current_flights: CurrentFlight[];
    authorized_airlines: string[];
    is_occupied: boolean;
}

interface PaginatedGates {
    data: Gate[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number;
    to?: number;
}

interface FiltersState {
    search?: string;
    terminal?: string;
    status?: string;
    per_page?: number;
}

interface StatsSummary {
    total: number;
    occupied: number;
    available: number;
}

interface Props {
    gates: PaginatedGates;
    terminals?: Terminal[];
    terminalsWithoutGates?: Terminal[];
    filters?: FiltersState;
    stats?: StatsSummary;
    airlines?: { airline_code: string; airline_name: string }[];
}

export default function GateManagement({ gates, terminals = [], terminalsWithoutGates = [], filters = {}, stats = { total: gates.total || 0, occupied: 0, available: 0 }, airlines = [] }: Props) {
    const [selectedGate, setSelectedGate] = useState<Gate | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    
    const gatesList = gates.data || [];

    const [searchTerm, setSearchTerm] = useState(filters.search ?? '');
    const [terminalFilter, setTerminalFilter] = useState(filters.terminal ?? '');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? '');
    const [perPage, setPerPage] = useState(String(filters.per_page ?? gates.per_page ?? 10));

    const createForm = useForm({
        terminal_id: '',
        gate_code: '',
        airline_codes: [] as string[],
        is_occupied: false,
    });

    const editForm = useForm({
        terminal_id: '',
        gate_code: '',
        gate_status: '',
        airline_codes: [] as string[],
        is_occupied: false,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Airport Resources', href: '#' },
        { title: 'Gates', href: '/management/gates' },
    ];

    const handleDelete = (gate: Gate) => {
        setSelectedGate(gate);
        setShowDeleteDialog(true);
    };

    const confirmDelete = () => {
        if (selectedGate) {
            router.delete(`/management/gates/${selectedGate.id}`, {
                onSuccess: () => {
                    setShowDeleteDialog(false);
                    setSelectedGate(null);
                },
            });
        }
    };

    const buildParams = (page?: number) => {
        const params: any = {};
        if (searchTerm) params.search = searchTerm;
        if (terminalFilter) params.terminal = terminalFilter;
        if (statusFilter) params.status = statusFilter;
        if (perPage) params.per_page = Number(perPage);
        if (page) params.page = page;
        return params;
    };

    const applyFilters = (page?: number) => {
        const params = buildParams(page);
        router.get('/management/gates', params, { preserveState: true, replace: true, preserveScroll: true });
    };

    const resetFilters = () => {
        setSearchTerm('');
        setTerminalFilter('');
        setStatusFilter('');
        setPerPage(String(gates.per_page || 10));
        router.get('/management/gates', {}, { preserveState: true, replace: true, preserveScroll: true });
    };

    const openEditDialog = (gate: Gate) => {
        setSelectedGate(gate);
        editForm.setData('gate_code', gate.gate_code);
        editForm.setData('terminal_id', String(gate.terminal.id));
        editForm.setData('gate_status', gate.gate_status || 'Open');
        editForm.setData('airline_codes', gate.authorized_airlines || []);
        setShowEditDialog(true);
    };

    const paginationLabel = gates && gates.data && gates.data.length > 0 ? `Showing ${(gates.current_page - 1) * gates.per_page + 1} to ${Math.min(gates.current_page * gates.per_page, gates.total)} of ${gates.total}` : 'No entries';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gate Management" />

            <div className="space-y-6 py-6 px-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <DoorOpen className="w-8 h-8 text-primary" />
                            Gate Management
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage airport gates and flight assignments
                        </p>
                    </div>
                    <Button 
                        className="gap-2"
                        onClick={() => setShowCreateDialog(true)}
                    >
                        <Plus className="w-4 h-4" />
                        Add New Gate
                    </Button>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Total Gates</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.total ?? gates.total}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500 dark:text-green-400">
                                {stats?.occupied ?? gatesList.filter((g: Gate) => g.is_occupied).length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Available</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">
                                {stats?.available ?? gatesList.filter((g: Gate) => !g.is_occupied).length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="space-y-2">
                                <Label htmlFor="gate-search">Search</Label>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input 
                                        id="gate-search" 
                                        value={searchTerm} 
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                applyFilters();
                                            }
                                        }}
                                        className="pl-9" 
                                        placeholder="Gate code or flight" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gate-terminal">Terminal</Label>
                                <Select value={terminalFilter || 'all'} onValueChange={(v) => {
                                    if (v === 'all') {
                                        setTerminalFilter('');
                                        applyFilters();
                                    } else {
                                        setTerminalFilter(v);
                                    }
                                }}>
                                    <SelectTrigger id="gate-terminal">
                                        <SelectValue placeholder="All terminals" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        {terminals.map((t) => (
                                            <SelectItem key={`terminal-${t.id}`} value={String(t.id)}>{t.code} • {t.airport}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gate-status">Status</Label>
                                <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                                    <SelectTrigger id="gate-status">
                                        <SelectValue placeholder="Any" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Any</SelectItem>
                                        <SelectItem value="occupied">Occupied</SelectItem>
                                        <SelectItem value="available">Available</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gate-per-page">Per Page</Label>
                                <Select value={perPage} onValueChange={(v) => { setPerPage(v); const params = buildParams(); params.per_page = Number(v); router.get('/management/gates', params, { preserveState: true, replace: true, preserveScroll: true }); }}>
                                    <SelectTrigger id="gate-per-page">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <Button onClick={() => applyFilters()}>Apply</Button>
                            <Button variant="outline" onClick={() => resetFilters()}>Reset</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>All Gates</CardTitle>
                        <CardDescription>View and manage all airport gates</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Gate</TableHead>
                                        <TableHead>Terminal</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Current Flights</TableHead>
                                        <TableHead>Authorized Airlines</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {gatesList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No gates found. Add your first gate to get started.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        gatesList.map((gate) => (
                                            <TableRow key={`gate-${gate.id}`} className="hover:bg-accent/50 dark:hover:bg-accent/30 transition-colors">
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <DoorOpen className="w-4 h-4 text-muted-foreground" />
                                                        {gate.gate_code}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{gate.terminal.name}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {gate.terminal.code} • {gate.terminal.airport}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={gate.is_occupied ? 'destructive' : 'default'}>
                                                        {gate.is_occupied ? 'Occupied' : 'Available'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {gate.current_flights && gate.current_flights.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {gate.current_flights.map((flight: any, idx: number) => (
                                                                <div key={`gate-${gate.id}-flight-${idx}`} className="text-sm flex items-center gap-2">
                                                                    <Plane className="w-3 h-3 text-muted-foreground" />
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">{flight.flight_number}</span>
                                                                        {flight.airline && (
                                                                            <span className="text-xs text-muted-foreground">{flight.airline}</span>
                                                                        )}
                                                                        {flight.scheduled_departure && (
                                                                            <span className="text-xs text-muted-foreground">{flight.scheduled_departure}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">No active flights</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {gate.authorized_airlines.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                                                {gate.authorized_airlines.slice(0, 2).map((airline, idx) => (
                                                                                    <Badge key={`gate-${gate.id}-airline-${airline}-${idx}`} variant="outline" className="text-xs">
                                                                                        {airline}
                                                                                    </Badge>
                                                                                ))}
                                                            {gate.authorized_airlines.length > 2 && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    +{gate.authorized_airlines.length - 2}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">All airlines</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            className="h-8 w-8 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                                            onClick={() => openEditDialog(gate)}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            className="h-8 w-8 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            onClick={() => handleDelete(gate)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            
                            {/* Pagination */}
                            {gatesList.length > 0 && (
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pt-4">
                                    <div className="text-sm text-muted-foreground">{paginationLabel}</div>
                                    <div className="flex gap-1">
                                        {gates.current_page > 1 && (
                                            <Button variant="outline" size="sm" onClick={() => applyFilters(gates.current_page - 1)}>
                                                ← Previous
                                            </Button>
                                        )}
                                        {Array.from({ length: Math.min(5, gates.last_page) }, (_, i) => i + 1).map(page => (
                                            <Button 
                                                key={page}
                                                variant={page === gates.current_page ? 'default' : 'outline'}
                                                size="sm"
                                                className="w-8"
                                                onClick={() => applyFilters(page)}
                                            >
                                                {page}
                                            </Button>
                                        ))}
                                        {gates.current_page < gates.last_page && (
                                            <Button variant="outline" size="sm" onClick={() => applyFilters(gates.current_page + 1)}>
                                                Next →
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        
                            {/* Create Gate Dialog */}
                            <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) createForm.reset(); }}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create New Gate</DialogTitle>
                                        <DialogDescription>Add a gate and optionally authorize airlines.</DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        // Post using Inertia form helper (data already in createForm)
                                        createForm.post('/management/gates', {
                                            onSuccess: () => setShowCreateDialog(false),
                                        });
                                    }}>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="gate_code">Gate Code</Label>
                                                <Input id="gate_code" value={createForm.data.gate_code} onChange={(e) => createForm.setData('gate_code', e.target.value)} required />
                                                {createForm.errors.gate_code && <div className="text-destructive text-sm mt-1">{createForm.errors.gate_code}</div>}
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="terminal_id">Terminal</Label>
                                                <Select value={createForm.data.terminal_id || 'none'} onValueChange={(v) => createForm.setData('terminal_id', v === 'none' ? '' : v)} required>
                                                    <SelectTrigger id="terminal_id"><SelectValue placeholder="Select terminal" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">Select terminal</SelectItem>
                                                        {terminals.map(t => (
                                                            <SelectItem key={`terminal-${t.id}`} value={String(t.id)}>{t.code} • {t.airport}</SelectItem>
                                                        ))}
                                                        {terminalsWithoutGates.length > 0 && (
                                                            <>
                                                                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-t">Suggested (no gates yet)</div>
                                                                {terminalsWithoutGates.map(t => (
                                                                    <SelectItem key={`terminal-suggested-${t.id}`} value={String(t.id)}>
                                                                        {t.code} • {t.airport} <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(suggested)</span>
                                                                    </SelectItem>
                                                                ))}
                                                            </>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                {createForm.errors.terminal_id && <div className="text-destructive text-sm mt-1">{createForm.errors.terminal_id}</div>}
                                            </div>

                                            <div className="grid gap-2">
                                                <Label>Authorize Airlines (optional)</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    { (airlines || []).map((a: any) => {
                                                        const codes = [...(createForm.data.airline_codes as string[])];
                                                        const selected = codes.includes(a.airline_code);
                                                        return (
                                                                    <button type="button" key={`airline-${a.airline_code}`} className={`px-2 py-1 rounded ${selected ? 'bg-primary text-white' : 'bg-muted'}`} onClick={() => {
                                                                const next = [...codes];
                                                                const idx = next.indexOf(a.airline_code);
                                                                if (idx === -1) next.push(a.airline_code); else next.splice(idx, 1);
                                                                createForm.setData('airline_codes', next);
                                                            }}>{a.airline_code}</button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                                            <Button type="submit">Create Gate</Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                                {/* Edit Gate Dialog */}
                                <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) editForm.reset(); }}>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Edit Gate</DialogTitle>
                                            <DialogDescription>Edit gate details and authorized airlines.</DialogDescription>
                                        </DialogHeader>
                                        <form onSubmit={(e) => {
                                            e.preventDefault();
                                            if (!selectedGate) return;
                                            editForm.put(`/management/gates/${selectedGate.id}`, {
                                                onSuccess: () => setShowEditDialog(false),
                                            });
                                        }}>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="edit_gate_code">Gate Code</Label>
                                                    <Input id="edit_gate_code" value={editForm.data.gate_code} onChange={(e) => editForm.setData('gate_code', e.target.value)} required />
                                                    {editForm.errors.gate_code && <div className="text-destructive text-sm mt-1">{editForm.errors.gate_code}</div>}
                                                </div>

                                                <div className="grid gap-2">
                                                    <Label htmlFor="edit_terminal_id">Terminal</Label>
                                                    <Select value={editForm.data.terminal_id || 'none'} onValueChange={(v) => editForm.setData('terminal_id', v === 'none' ? '' : v)} required>
                                                        <SelectTrigger id="edit_terminal_id"><SelectValue placeholder="Select terminal" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">Select terminal</SelectItem>
                                                            {terminals.map(t => (
                                                                <SelectItem key={`terminal-${t.id}`} value={String(t.id)}>{t.code} • {t.airport}</SelectItem>
                                                            ))}
                                                            {terminalsWithoutGates.length > 0 && (
                                                                <>
                                                                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-t">Suggested (no gates yet)</div>
                                                                    {terminalsWithoutGates.map(t => (
                                                                        <SelectItem key={`terminal-suggested-${t.id}`} value={String(t.id)}>
                                                                            {t.code} • {t.airport} <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(suggested)</span>
                                                                        </SelectItem>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    {editForm.errors.terminal_id && <div className="text-destructive text-sm mt-1">{editForm.errors.terminal_id}</div>}
                                                </div>

                                                <div className="grid gap-2">
                                                    <Label htmlFor="edit_gate_status">Gate Status</Label>
                                                    <Select value={editForm.data.gate_status || 'Open'} onValueChange={(v) => editForm.setData('gate_status', v)}>
                                                        <SelectTrigger id="edit_gate_status"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Open">Open</SelectItem>
                                                            <SelectItem value="Closed">Closed</SelectItem>
                                                            <SelectItem value="Maintenance">Maintenance</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {editForm.errors.gate_status && <div className="text-destructive text-sm mt-1">{editForm.errors.gate_status}</div>}
                                                </div>

                                                <div className="grid gap-2">
                                                    <Label>Authorize Airlines (optional)</Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        { (airlines || []).map((a: any) => {
                                                            const codes = [...(editForm.data.airline_codes as string[])];
                                                            const selected = codes.includes(a.airline_code);
                                                            return (
                                                                <button type="button" key={a.airline_code} className={`px-2 py-1 rounded ${selected ? 'bg-primary text-white' : 'bg-muted'}`} onClick={() => {
                                                                    const next = [...codes];
                                                                    const idx = next.indexOf(a.airline_code);
                                                                    if (idx === -1) next.push(a.airline_code); else next.splice(idx, 1);
                                                                    editForm.setData('airline_codes', next);
                                                                }}>{a.airline_code}</button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                                                <Button type="submit">Save Changes</Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                        </div>
                    </CardContent>
                </Card>

                {/* Delete Confirmation Dialog */}
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Gate</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete gate {selectedGate?.gate_code}?
                                This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={confirmDelete}>
                                Delete Gate
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Create Dialog */}
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Gate</DialogTitle>
                            <DialogDescription>Create a new gate within a terminal.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); createForm.post('/management/gates', { onSuccess: () => setShowCreateDialog(false) }); }} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-terminal">Terminal *</Label>
                                <Select value={createForm.data.terminal_id || 'none'} onValueChange={(v) => createForm.setData('terminal_id', v === 'none' ? '' : v)}>
                                    <SelectTrigger id="create-terminal"><SelectValue placeholder="Select terminal" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Select terminal</SelectItem>
                                        {terminals.map(t => <SelectItem key={`terminal-${t.id}`} value={String(t.id)}>{t.code} • {t.airport}</SelectItem>)}
                                        {terminalsWithoutGates.length > 0 && (
                                            <>
                                                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-t">Suggested (no gates yet)</div>
                                                {terminalsWithoutGates.map(t => (
                                                    <SelectItem key={`terminal-suggested-${t.id}`} value={String(t.id)}>
                                                        {t.code} • {t.airport} <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(suggested)</span>
                                                    </SelectItem>
                                                ))}
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-gate-code">Gate Code *</Label>
                                <Input id="create-gate-code" value={createForm.data.gate_code} onChange={(e) => createForm.setData('gate_code', e.target.value)} required />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" type="button" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                                <Button type="submit" disabled={createForm.processing}>Create Gate</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Gate</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); if (!selectedGate) return; editForm.put(`/management/gates/${selectedGate.id}`, { onSuccess: () => setShowEditDialog(false) }); }} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-terminal">Terminal</Label>
                                <Select value={editForm.data.terminal_id || 'none'} onValueChange={(v) => editForm.setData('terminal_id', v === 'none' ? '' : v)}>
                                    <SelectTrigger id="edit-terminal"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No change</SelectItem>
                                        {terminals.map(t => <SelectItem key={`terminal-${t.id}`} value={String(t.id)}>{t.code} • {t.airport}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-gate-code">Gate Code</Label>
                                <Input id="edit-gate-code" value={editForm.data.gate_code} onChange={(e) => editForm.setData('gate_code', e.target.value)} />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" type="button" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                                <Button type="submit" disabled={editForm.processing}>Save</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
