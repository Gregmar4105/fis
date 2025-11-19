import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Luggage, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Head, router, useForm } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Terminal {
    id: number;
    code: string;
    name: string;
    airport: string;
}

interface CurrentFlight {
    flight_number: string;
    airline: string;
    origin: string;
    status: string;
    scheduled_arrival: string;
}

interface BaggageBelt {
    id: number;
    belt_code: string;
    status: string;
    terminal: Terminal;
    current_flights: CurrentFlight[];
    is_active: boolean;
}

interface PaginatedBaggageBelts {
    data: BaggageBelt[];
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
    active: number;
    maintenance: number;
}

interface AirportWithTerminals {
    iata_code: string;
    airport_name: string;
    terminals: Terminal[];
}

interface Props {
    baggageBelts: PaginatedBaggageBelts;
    terminals?: Terminal[];
    terminalsByAirport?: AirportWithTerminals[];
    terminalsWithoutBelts?: Terminal[];
    filters?: FiltersState;
    stats?: StatsSummary;
}

export default function BaggageBeltManagement({ baggageBelts, terminals = [], terminalsByAirport = [], terminalsWithoutBelts = [], filters = {}, stats = { total: baggageBelts.total || 0, active: 0, maintenance: 0 } }: Props) {
    const [selectedBelt, setSelectedBelt] = useState<BaggageBelt | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    
    const beltsList = baggageBelts.data || [];

    const [searchTerm, setSearchTerm] = useState(filters.search ?? '');
    const [terminalFilter, setTerminalFilter] = useState(filters.terminal ?? '');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? '');
    const [perPage, setPerPage] = useState(String(filters.per_page ?? baggageBelts.per_page ?? 10));
    const [createTerminalSearch, setCreateTerminalSearch] = useState('');
    const [createTerminalLetter, setCreateTerminalLetter] = useState<string | null>(null);
    const [editTerminalSearch, setEditTerminalSearch] = useState('');
    const [editTerminalLetter, setEditTerminalLetter] = useState<string | null>(null);

    const createForm = useForm({
        terminal_id: '',
        belt_code: '',
        status: 'Active',
    });

    const editForm = useForm({
        terminal_id: '',
        belt_code: '',
        status: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Airport Resources', href: '#' },
        { title: 'Baggage Belts', href: '/management/baggage-belts' },
    ];

    const handleDelete = (belt: BaggageBelt) => {
        setSelectedBelt(belt);
        setShowDeleteDialog(true);
    };

    const confirmDelete = () => {
        if (selectedBelt) {
            router.delete(`/management/baggage-belts/${selectedBelt.id}`, {
                onSuccess: () => {
                    setShowDeleteDialog(false);
                    setSelectedBelt(null);
                },
                onError: (errors) => {
                    console.error('Delete error:', errors);
                },
                preserveState: false,
                preserveScroll: false,
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active':
                return 'bg-green-600/20 text-green-600 border-green-600/30 dark:bg-green-600/20 dark:text-green-500 dark:border-green-600/30';
            case 'Maintenance':
                return 'bg-orange-500/20 text-orange-400 border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30';
            case 'Closed':
                return 'bg-red-500/20 text-red-400 border-red-500/30 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30';
            case 'Scheduled':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30';
        }
    };

    const buildParams = (overrides: Record<string, number | string> = {}) => {
        const params: Record<string, number | string> = { ...overrides };
        if (searchTerm) params.search = searchTerm;
        if (terminalFilter) params.terminal = terminalFilter;
        if (statusFilter) params.status = statusFilter;
        if (perPage) params.per_page = Number(perPage);
        return params;
    };

    const applyFilters = (page?: number) => {
        const params = buildParams(page ? { page } : {});
        router.get('/management/baggage-belts', params, { preserveState: true, replace: true, preserveScroll: true });
    };

    const resetFilters = () => {
        setSearchTerm('');
        setTerminalFilter('');
        setStatusFilter('');
        setPerPage('10');
        router.get('/management/baggage-belts', {}, { replace: true });
    };

    const openCreateDialog = () => { 
        createForm.reset(); 
        setCreateTerminalSearch('');
        setCreateTerminalLetter(null);
        setShowCreateDialog(true); 
    };

    const openEditDialog = (belt: BaggageBelt) => {
        setSelectedBelt(belt);
        // Reset form first to clear any previous values
        editForm.reset();
        // Then set all the current values from the belt
        editForm.setData({ 
            terminal_id: String(belt.terminal?.id || ''), 
            belt_code: belt.belt_code || '', 
            status: belt.status || 'Active' 
        });
        setEditTerminalSearch('');
        setEditTerminalLetter(null);
        setShowEditDialog(true);
    };

    const paginationLabel = useMemo(() => {
        const from = baggageBelts.from ?? ((baggageBelts.current_page - 1) * baggageBelts.per_page) + 1;
        const to = baggageBelts.to ?? Math.min(baggageBelts.current_page * baggageBelts.per_page, baggageBelts.total);
        return `Showing ${from} to ${to} of ${baggageBelts.total} results`;
    }, [baggageBelts.from, baggageBelts.to, baggageBelts.current_page, baggageBelts.per_page, baggageBelts.total]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Baggage Belt Management" />

            <div className="space-y-6 py-6 px-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Luggage className="w-8 h-8 text-primary" />
                            Baggage Belt Management
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage baggage belt areas and flight assignments
                        </p>
                    </div>
                    <Button 
                        className="gap-2"
                        onClick={() => {
                            createForm.reset();
                            setCreateTerminalSearch('');
                            setCreateTerminalLetter(null);
                            setShowCreateDialog(true);
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        Add Baggage Belt
                    </Button>
                </div>

                <Separator />

                <Card>
                    <CardHeader>
                        <CardTitle>Baggage Belts ({beltsList.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-5">
                            <div className="space-y-2">
                                <Label htmlFor="belt-search">Search</Label>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input 
                                        id="belt-search" 
                                        value={searchTerm} 
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                applyFilters();
                                            }
                                        }}
                                        className="pl-9" 
                                        placeholder="Belt code or flight" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="belt-terminal">Terminal</Label>
                                <Select value={terminalFilter || 'all'} onValueChange={(v) => setTerminalFilter(v === 'all' ? '' : v)}>
                                    <SelectTrigger id="belt-terminal"><SelectValue placeholder="All" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        {terminals.map(t => <SelectItem key={`terminal-${t.id}`} value={String(t.id)}>{t.name} • {t.code}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="belt-status">Status</Label>
                                <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                                    <SelectTrigger id="belt-status"><SelectValue placeholder="Any" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Any</SelectItem>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                                        <SelectItem value="Closed">Closed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="belt-per-page">Per Page</Label>
                                <Select value={perPage} onValueChange={(v) => { setPerPage(v); const params = buildParams(); params.per_page = Number(v); router.get('/management/baggage-belts', params, { preserveState: true, replace: true, preserveScroll: true }); }}>
                                    <SelectTrigger id="belt-per-page"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2 items-end">
                                <Button onClick={() => applyFilters()}>Apply</Button>
                                <Button variant="outline" onClick={() => resetFilters()}>Clear</Button>
                            </div>
                        </div>

                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Belt Code</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Terminal</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {beltsList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No baggage belts found. Add one to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    beltsList.map((belt) => (
                                        <TableRow key={`belt-${belt.id}`} className="hover:bg-accent/50 dark:hover:bg-accent/30 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Luggage className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-medium">{belt.belt_code}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getStatusColor(belt.status)}>
                                                    {belt.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{belt.terminal.code}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {belt.terminal.name}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        className="h-8 w-8 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                                        onClick={() => openEditDialog(belt)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        onClick={() => handleDelete(belt)}
                                                        disabled={belt.is_active}
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
                        {baggageBelts.last_page > 1 && (
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between px-6 py-4 border-t">
                                <div className="text-sm text-muted-foreground">{paginationLabel}</div>
                                <div className="flex gap-2">
                                    {baggageBelts.current_page > 1 && (
                                        <Button variant="outline" size="sm" onClick={() => applyFilters(baggageBelts.current_page - 1)}>
                                            Previous
                                        </Button>
                                    )}
                                    {Array.from({ length: Math.min(5, baggageBelts.last_page) }, (_, i) => i + 1).map(page => (
                                        <Button key={page} variant={page === baggageBelts.current_page ? 'default' : 'outline'} size="sm" className="w-8" onClick={() => applyFilters(page)}>
                                            {page}
                                        </Button>
                                    ))}
                                    {baggageBelts.current_page < baggageBelts.last_page && (
                                        <Button variant="outline" size="sm" onClick={() => applyFilters(baggageBelts.current_page + 1)}>
                                            Next
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
                            <DialogTitle>Delete Baggage Belt</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete belt <strong>{selectedBelt?.belt_code}</strong>?
                                This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={confirmDelete}>
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                {/* Create Dialog */}
                <Dialog open={showCreateDialog} onOpenChange={(open) => {
                    setShowCreateDialog(open);
                    if (!open) {
                        createForm.reset();
                        setCreateTerminalSearch('');
                        setCreateTerminalLetter(null);
                    }
                }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Baggage Belt</DialogTitle>
                            <DialogDescription>Create a new baggage belt.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); createForm.post('/management/baggage-belts', { onSuccess: () => setShowCreateDialog(false) }); }} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-terminal">Terminal *</Label>
                                <Select value={createForm.data.terminal_id || 'none'} onValueChange={(v) => createForm.setData('terminal_id', v === 'none' ? '' : v)}>
                                    <SelectTrigger id="create-terminal"><SelectValue placeholder="Select terminal" /></SelectTrigger>
                                    <SelectContent className="max-h-72 overflow-auto">
                                        <div className="p-2 border-b space-y-2">
                                            <div className="relative">
                                                <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search airport or terminal"
                                                    value={createTerminalSearch}
                                                    onChange={(e) => setCreateTerminalSearch(e.target.value)}
                                                    className="pl-8 h-8 text-sm"
                                                    onKeyDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <div className="px-1 flex gap-1 flex-wrap">
                                                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((ch) => (
                                                    <button
                                                        key={`create-terminal-letter-${ch}`}
                                                        type="button"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => setCreateTerminalLetter(createTerminalLetter === ch ? null : ch)}
                                                        className={`text-xs px-1 ${createTerminalLetter === ch ? 'underline font-semibold' : ''}`}
                                                    >{ch}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <SelectItem value="none">Select terminal</SelectItem>
                                        {terminalsByAirport.length > 0 ? terminalsByAirport.filter((airport) => {
                                            const matchesSearch = !createTerminalSearch || 
                                                (airport.iata_code || '').toLowerCase().includes(createTerminalSearch.toLowerCase()) ||
                                                (airport.airport_name || '').toLowerCase().includes(createTerminalSearch.toLowerCase()) ||
                                                airport.terminals.some(t => 
                                                    (t.code || '').toLowerCase().includes(createTerminalSearch.toLowerCase())
                                                );
                                            const matchesLetter = !createTerminalLetter || 
                                                (airport.iata_code || '').startsWith(createTerminalLetter) ||
                                                (airport.airport_name || '').toLowerCase().startsWith(createTerminalLetter.toLowerCase());
                                            return matchesSearch && matchesLetter;
                                        }).map((airport) => (
                                            <div key={`airport-${airport.iata_code}`}>
                                                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-t">
                                                    {airport.iata_code} - {airport.airport_name}
                                                </div>
                                                {airport.terminals.map(t => {
                                                    const hasNoBelt = terminalsWithoutBelts.some(nt => nt.id === t.id);
                                                    return (
                                                        <SelectItem key={`terminal-${t.id}`} value={String(t.id)}>
                                                            {t.code}
                                                            {hasNoBelt && <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(suggested)</span>}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </div>
                                        )) : terminals.filter((t) => {
                                            const matchesSearch = !createTerminalSearch || 
                                                (t.code || '').toLowerCase().includes(createTerminalSearch.toLowerCase()) ||
                                                (t.airport || '').toLowerCase().includes(createTerminalSearch.toLowerCase());
                                            const matchesLetter = !createTerminalLetter || 
                                                (t.code || '').startsWith(createTerminalLetter) ||
                                                (t.airport || '').startsWith(createTerminalLetter);
                                            return matchesSearch && matchesLetter;
                                        }).map(t => {
                                            const hasNoBelt = terminalsWithoutBelts.some(nt => nt.id === t.id);
                                            return (
                                                <SelectItem key={`terminal-${t.id}`} value={String(t.id)}>
                                                    {t.code} • {t.airport}
                                                    {hasNoBelt && <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(suggested)</span>}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                                {createForm.errors.terminal_id && (
                                    <p className="text-sm text-destructive">{createForm.errors.terminal_id}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-belt-code">Belt Code *</Label>
                                <Input id="create-belt-code" value={createForm.data.belt_code} onChange={(e) => createForm.setData('belt_code', e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-status">Status</Label>
                                <Select value={createForm.data.status} onValueChange={(v) => createForm.setData('status', v)}>
                                    <SelectTrigger id="create-status"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                                        <SelectItem value="Closed">Closed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" type="button" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                                <Button type="submit" disabled={createForm.processing}>Create</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={showEditDialog} onOpenChange={(open) => {
                    setShowEditDialog(open);
                    if (!open) {
                        editForm.reset();
                        setEditTerminalSearch('');
                        setEditTerminalLetter(null);
                    }
                }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Baggage Belt</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); if (!selectedBelt) return; editForm.put(`/management/baggage-belts/${selectedBelt.id}`, { onSuccess: () => setShowEditDialog(false) }); }} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-terminal">Terminal</Label>
                                <Select value={editForm.data.terminal_id || 'none'} onValueChange={(v) => editForm.setData('terminal_id', v === 'none' ? '' : v)}>
                                    <SelectTrigger id="edit-terminal"><SelectValue /></SelectTrigger>
                                    <SelectContent className="max-h-72 overflow-auto">
                                        <div className="p-2 border-b space-y-2">
                                            <div className="relative">
                                                <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search airport or terminal"
                                                    value={editTerminalSearch}
                                                    onChange={(e) => setEditTerminalSearch(e.target.value)}
                                                    className="pl-8 h-8 text-sm"
                                                    onKeyDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <div className="px-1 flex gap-1 flex-wrap">
                                                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((ch) => (
                                                    <button
                                                        key={`edit-terminal-letter-${ch}`}
                                                        type="button"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => setEditTerminalLetter(editTerminalLetter === ch ? null : ch)}
                                                        className={`text-xs px-1 ${editTerminalLetter === ch ? 'underline font-semibold' : ''}`}
                                                    >{ch}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <SelectItem value="none">No change</SelectItem>
                                        {terminalsByAirport.length > 0 ? terminalsByAirport.filter((airport) => {
                                            const matchesSearch = !editTerminalSearch || 
                                                (airport.iata_code || '').toLowerCase().includes(editTerminalSearch.toLowerCase()) ||
                                                (airport.airport_name || '').toLowerCase().includes(editTerminalSearch.toLowerCase()) ||
                                                airport.terminals.some(t => 
                                                    (t.code || '').toLowerCase().includes(editTerminalSearch.toLowerCase())
                                                );
                                            const matchesLetter = !editTerminalLetter || 
                                                (airport.iata_code || '').startsWith(editTerminalLetter) ||
                                                (airport.airport_name || '').toLowerCase().startsWith(editTerminalLetter.toLowerCase());
                                            return matchesSearch && matchesLetter;
                                        }).map((airport) => (
                                            <div key={`airport-${airport.iata_code}`}>
                                                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-t">
                                                    {airport.iata_code} - {airport.airport_name}
                                                </div>
                                                {airport.terminals.map(t => (
                                                    <SelectItem key={`terminal-${t.id}`} value={String(t.id)}>
                                                        {t.code}
                                                    </SelectItem>
                                                ))}
                                            </div>
                                        )) : terminals.filter((t) => {
                                            const matchesSearch = !editTerminalSearch || 
                                                (t.code || '').toLowerCase().includes(editTerminalSearch.toLowerCase()) ||
                                                (t.airport || '').toLowerCase().includes(editTerminalSearch.toLowerCase());
                                            const matchesLetter = !editTerminalLetter || 
                                                (t.code || '').startsWith(editTerminalLetter) ||
                                                (t.airport || '').startsWith(editTerminalLetter);
                                            return matchesSearch && matchesLetter;
                                        }).map(t => (
                                            <SelectItem key={`terminal-${t.id}`} value={String(t.id)}>
                                                {t.code} • {t.airport}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {editForm.errors.terminal_id && (
                                    <p className="text-sm text-destructive">{editForm.errors.terminal_id}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-belt-code">Belt Code</Label>
                                <Input id="edit-belt-code" value={editForm.data.belt_code} onChange={(e) => editForm.setData('belt_code', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-status">Status</Label>
                                <Select value={editForm.data.status || 'Active'} onValueChange={(v) => editForm.setData('status', v)}>
                                    <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                                        <SelectItem value="Closed">Closed</SelectItem>
                                    </SelectContent>
                                </Select>
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
