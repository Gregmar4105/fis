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
import { Luggage, Plus, Pencil, Trash2, Plane, Search } from 'lucide-react';
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

interface BaggageClaim {
    id: number;
    claim_area: string;
    terminal: Terminal;
    current_flights: CurrentFlight[];
    is_active: boolean;
}

interface PaginatedBaggageClaims {
    data: BaggageClaim[];
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
}

interface Props {
    baggageClaims: PaginatedBaggageClaims;
    terminals?: Terminal[];
    filters?: FiltersState;
    stats?: StatsSummary;
}

export default function BaggageClaimManagement({ baggageClaims, terminals = [], filters = {}, stats = { total: baggageClaims.total || 0, active: 0 } }: Props) {
    const [selectedClaim, setSelectedClaim] = useState<BaggageClaim | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    
    const claimsList = baggageClaims.data || [];

    const [searchTerm, setSearchTerm] = useState(filters.search ?? '');
    const [terminalFilter, setTerminalFilter] = useState(filters.terminal ?? '');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? '');
    const [perPage, setPerPage] = useState(String(filters.per_page ?? baggageClaims.per_page ?? 10));

    const createForm = useForm({ terminal_id: '', claim_area: '', is_active: true });
    const editForm = useForm({ terminal_id: '', claim_area: '', is_active: true });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Airport Resources', href: '#' },
        { title: 'Baggage Claims', href: '/management/baggage-claims' },
    ];

    const handleDelete = (claim: BaggageClaim) => {
        setSelectedClaim(claim);
        setShowDeleteDialog(true);
    };

    const confirmDelete = () => {
        if (selectedClaim) {
            router.delete(`/management/baggage-claims/${selectedClaim.id}`, {
                onSuccess: () => {
                    setShowDeleteDialog(false);
                    setSelectedClaim(null);
                },
            });
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
        router.get('/management/baggage-claims', params, { preserveState: true, replace: true, preserveScroll: true });
    };

    const resetFilters = () => {
        setSearchTerm('');
        setTerminalFilter('');
        setStatusFilter('');
        setPerPage('10');
        router.get('/management/baggage-claims', {}, { replace: true });
    };

    const openCreateDialog = () => { createForm.reset(); setShowCreateDialog(true); };

    const openEditDialog = (claim: BaggageClaim) => {
        setSelectedClaim(claim);
        editForm.setData({ terminal_id: String(claim.terminal.id), claim_area: claim.claim_area, is_active: claim.is_active });
        setShowEditDialog(true);
    };

    const paginationLabel = useMemo(() => {
        const from = baggageClaims.from ?? ((baggageClaims.current_page - 1) * baggageClaims.per_page) + 1;
        const to = baggageClaims.to ?? Math.min(baggageClaims.current_page * baggageClaims.per_page, baggageClaims.total);
        return `Showing ${from} to ${to} of ${baggageClaims.total} entries`;
    }, [baggageClaims.from, baggageClaims.to, baggageClaims.current_page, baggageClaims.per_page, baggageClaims.total]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Baggage Claim Management" />

            <div className="space-y-6 py-6 px-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Luggage className="w-8 h-8 text-primary" />
                            Baggage Claim Management
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage baggage claim areas and flight assignments
                        </p>
                    </div>
                    <Button 
                        className="gap-2"
                        onClick={() => alert('Baggage claim creation form coming soon')}
                    >
                        <Plus className="w-4 h-4" />
                        Add Baggage Claim
                    </Button>
                </div>

                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.total ?? baggageClaims.total}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Active</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500 dark:text-green-400">
                                {stats?.active ?? claimsList.filter((c: BaggageClaim) => c.is_active).length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-4 mb-4">
                            <div className="space-y-2">
                                <Label htmlFor="claim-search">Search</Label>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input id="claim-search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" placeholder="Claim area or flight" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="claim-terminal">Terminal</Label>
                                <Select value={terminalFilter || 'all'} onValueChange={(v) => setTerminalFilter(v === 'all' ? '' : v)}>
                                    <SelectTrigger id="claim-terminal"><SelectValue placeholder="All" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        {terminals.map(t => <SelectItem key={`terminal-${t.id}`} value={String(t.id)}>{t.name} • {t.code}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="claim-status">Status</Label>
                                <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                                    <SelectTrigger id="claim-status"><SelectValue placeholder="Any" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Any</SelectItem>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Idle">Idle</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="claim-per-page">Per Page</Label>
                                <Select value={perPage} onValueChange={(v) => { setPerPage(v); const params = buildParams(); params.per_page = Number(v); router.get('/management/baggage-claims', params, { preserveState: true, replace: true, preserveScroll: true }); }}>
                                    <SelectTrigger id="claim-per-page"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <Button onClick={() => applyFilters()}>Apply</Button>
                            <Button variant="outline" onClick={() => resetFilters()}>Reset</Button>
                            <Button className="ml-auto" onClick={() => setShowCreateDialog(true)}>
                                <Plus className="w-4 h-4" /> Add Baggage Claim
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Claim Area</TableHead>
                                    <TableHead>Terminal</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Current Arrivals</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {claimsList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No baggage claim areas found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    claimsList.map((claim) => (
                                        <TableRow key={`claim-${claim.id}`}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Luggage className="w-4 h-4 text-muted-foreground" />
                                                    {claim.claim_area}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{claim.terminal.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {claim.terminal.code}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={claim.is_active ? 'default' : 'secondary'}>
                                                    {claim.is_active ? 'Active' : 'Idle'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {claim.current_flights.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {claim.current_flights.map((flight, idx) => (
                                                            <div key={idx} className="text-sm flex items-center gap-2">
                                                                <Plane className="w-3 h-3 text-muted-foreground" />
                                                                <span className="font-medium">{flight.flight_number}</span>
                                                                <span className="text-muted-foreground">from {flight.origin}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">No active flights</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        className="h-8 w-8 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                                        onClick={() => openEditDialog(claim)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        onClick={() => handleDelete(claim)}
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
                        {claimsList.length > 0 && (
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pt-4">
                                <div className="text-sm text-muted-foreground">{paginationLabel}</div>
                                <div className="flex gap-1">
                                    {baggageClaims.current_page > 1 && (
                                        <Button variant="outline" size="sm" onClick={() => applyFilters(baggageClaims.current_page - 1)}>
                                            ← Previous
                                        </Button>
                                    )}
                                    {Array.from({ length: Math.min(5, baggageClaims.last_page) }, (_, i) => i + 1).map(page => (
                                        <Button key={page} variant={page === baggageClaims.current_page ? 'default' : 'outline'} size="sm" className="w-8" onClick={() => applyFilters(page)}>
                                            {page}
                                        </Button>
                                    ))}
                                    {baggageClaims.current_page < baggageClaims.last_page && (
                                        <Button variant="outline" size="sm" onClick={() => applyFilters(baggageClaims.current_page + 1)}>
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
                            <DialogTitle>Delete Baggage Claim</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete baggage claim area {selectedClaim?.claim_area}?
                                This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={confirmDelete}>
                                Delete Claim Area
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                {/* Create Dialog */}
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Baggage Claim</DialogTitle>
                            <DialogDescription>Create a new baggage claim area.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); createForm.post('/management/baggage-claims', { onSuccess: () => setShowCreateDialog(false) }); }} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-terminal">Terminal *</Label>
                                <Select value={createForm.data.terminal_id || 'none'} onValueChange={(v) => createForm.setData('terminal_id', v === 'none' ? '' : v)}>
                                    <SelectTrigger id="create-terminal"><SelectValue placeholder="Select terminal" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Select terminal</SelectItem>
                                        {terminals.map(t => <SelectItem key={`terminal-${t.id}`} value={String(t.id)}>{t.name} • {t.code}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-claim-area">Claim Area *</Label>
                                <Input id="create-claim-area" value={createForm.data.claim_area} onChange={(e) => createForm.setData('claim_area', e.target.value)} required />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" type="button" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                                <Button type="submit" disabled={createForm.processing}>Create</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Baggage Claim</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); if (!selectedClaim) return; editForm.put(`/management/baggage-claims/${selectedClaim.id}`, { onSuccess: () => setShowEditDialog(false) }); }} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-terminal">Terminal</Label>
                                <Select value={editForm.data.terminal_id || 'none'} onValueChange={(v) => editForm.setData('terminal_id', v === 'none' ? '' : v)}>
                                    <SelectTrigger id="edit-terminal"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No change</SelectItem>
                                        {terminals.map(t => <SelectItem key={`terminal-${t.id}`} value={String(t.id)}>{t.name} • {t.code}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-claim-area">Claim Area</Label>
                                <Input id="edit-claim-area" value={editForm.data.claim_area} onChange={(e) => editForm.setData('claim_area', e.target.value)} />
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
