import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { Head, router, useForm } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import React, { useMemo, useState } from 'react';

interface AirportOption {
    iata_code: string;
    airport_name: string;
}

interface Gate {
    id: number;
    gate_code: string;
}

interface BaggageBelt {
    id: number;
    belt_code: string;
}

interface TerminalRecord {
    id: number;
    terminal_code: string;
    airport: AirportOption;
    gates_count: number;
    baggage_belts_count: number;
    gates?: Gate[];
    baggage_belts?: BaggageBelt[];
}

interface PaginatedTerminals {
    data: TerminalRecord[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number;
    to?: number;
}

interface StatsSummary {
    total: number;
    with_gates: number;
    with_belts: number;
}

interface FiltersState {
    search?: string;
    airport?: string;
    letter?: string;
    per_page?: number;
}

interface Props {
    terminals: PaginatedTerminals;
    airports: AirportOption[];
    airportsWithoutTerminals?: AirportOption[];
    filters: FiltersState;
    stats: StatsSummary;
}

export default function TerminalManagement({ terminals, airports, airportsWithoutTerminals = [], filters, stats }: Props) {
    const [selectedTerminal, setSelectedTerminal] = useState<TerminalRecord | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);

    const terminalsList = terminals.data || [];

    const [searchTerm, setSearchTerm] = useState('');
    const [airportFilter, setAirportFilter] = useState(filters.airport ?? '');
    const [perPage, setPerPage] = useState(String(filters.per_page ?? terminals.per_page ?? 10));
    const [filterAirportLetter, setFilterAirportLetter] = useState<string | null>(null);
    const [createAirportLetter, setCreateAirportLetter] = useState<string | null>(null);
    const [editAirportLetter, setEditAirportLetter] = useState<string | null>(null);

    const createForm = useForm({
        iata_code: '',
        terminal_code: '',
    });

    const editForm = useForm({
        iata_code: '',
        terminal_code: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Airport Resources', href: '#' },
        { title: 'Terminals', href: '/management/terminals' },
    ];

    const handleDelete = (terminal: TerminalRecord) => {
        setSelectedTerminal(terminal);
        setShowDeleteDialog(true);
    };

    const confirmDelete = () => {
        if (selectedTerminal) {
            router.delete(`/management/terminals/${selectedTerminal.id}`, {
                onSuccess: () => {
                    setShowDeleteDialog(false);
                    setSelectedTerminal(null);
                },
            });
        }
    };

    const hasActiveFilters = useMemo(() => {
        return !!airportFilter;
    }, [airportFilter]);

    const buildParams = (overrides: Record<string, number | string> = {}) => {
        const params: Record<string, number | string> = { ...overrides };
        if (airportFilter) params.airport = airportFilter;
        if (perPage) params.per_page = Number(perPage);
        return params;
    };

    const applyFilters = (page?: number) => {
        const params = buildParams(page ? { page } : {});
        router.get('/management/terminals', params, {
            preserveState: true,
            replace: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFilterAirportLetter(null);
        setAirportFilter('');
        router.get('/management/terminals', {}, { replace: true });
    };

    const openCreateDialog = () => {
        createForm.reset();
        setShowCreateDialog(true);
    };

    const openEditDialog = (terminal: TerminalRecord) => {
        setSelectedTerminal(terminal);
        // Reset form first to clear any previous values
        editForm.reset();
        // Then set all the current values from the terminal
        editForm.setData({
            iata_code: terminal.airport?.iata_code ?? '',
            terminal_code: terminal.terminal_code ?? '',
        });
        setShowEditDialog(true);
    };


    const paginationLabel = useMemo(() => {
        const from = terminals.from ?? 0;
        const to = terminals.to ?? terminalsList.length;
        return `Showing ${from} to ${to} of ${terminals.total} entries`;
    }, [terminals.from, terminals.to, terminals.total, terminalsList.length]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Terminal Management" />

            <div className="space-y-6 py-6 px-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Building2 className="w-8 h-8 text-primary" />
                            Terminal Management
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage airport terminals
                        </p>
                    </div>
                    <Button className="gap-2" onClick={openCreateDialog}>
                        <Plus className="w-4 h-4" />
                        Add Terminal
                    </Button>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Total Terminals</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">With Gates</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-primary">{stats.with_gates}</div>
                        </CardContent>
                    </Card>
                
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">With Baggage Belts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-black dark:text-gray-300">{stats.with_belts}</div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="terminal-airport">Airport</Label>
                                <Select value={airportFilter || 'all'} onValueChange={(value) => setAirportFilter(value === 'all' ? '' : value)}>
                                    <SelectTrigger id="terminal-airport">
                                        <SelectValue placeholder="All airports" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-72 overflow-auto">
                                        <div className="p-2 border-b space-y-2">
                                            <div className="relative">
                                                <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search airport or IATA code"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="pl-8 h-8 text-sm"
                                                    onKeyDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <div className="px-1 flex gap-1 flex-wrap">
                                                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((ch) => (
                                                    <button
                                                        key={`filter-airport-letter-${ch}`}
                                                        type="button"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => setFilterAirportLetter(filterAirportLetter === ch ? null : ch)}
                                                        className={`text-xs px-1 ${filterAirportLetter === ch ? 'underline font-semibold' : ''}`}
                                                    >{ch}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <SelectItem value="all">All</SelectItem>
                                        {airports.filter((airport) => {
                                            const matchesSearch = !searchTerm || 
                                                (airport.iata_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                (airport.airport_name || '').toLowerCase().includes(searchTerm.toLowerCase());
                                            const matchesLetter = !filterAirportLetter || (airport.iata_code || '').startsWith(filterAirportLetter);
                                            return matchesSearch && matchesLetter;
                                        }).map((airport) => {
                                            const hasNoTerminal = airportsWithoutTerminals.some(a => a.iata_code === airport.iata_code);
                                            return (
                                                <SelectItem key={`airport-${airport.iata_code}`} value={airport.iata_code}>
                                                    {airport.iata_code} - {airport.airport_name}
                                                    {hasNoTerminal && <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(suggested)</span>}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="terminal-per-page">Per Page</Label>
                                <Select
                                    value={perPage}
                                    onValueChange={(value) => {
                                        setPerPage(value);
                                        const params = buildParams();
                                        params.per_page = Number(value);
                                        router.get('/management/terminals', params, {
                                            preserveState: true,
                                            replace: true,
                                            preserveScroll: true,
                                        });
                                    }}
                                >
                                    <SelectTrigger id="terminal-per-page">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end gap-2">
                                <Button 
                                    className={hasActiveFilters ? "flex-1" : "w-full"} 
                                    onClick={() => applyFilters()}
                                >
                                    {hasActiveFilters ? 'Apply' : 'Apply Filters'}
                                </Button>
                                {hasActiveFilters && (
                                    <Button variant="outline" onClick={clearFilters} className="gap-2">
                                        <X className="w-4 h-4" />
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>All Terminals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Terminal Code</TableHead>
                                    <TableHead>Airport</TableHead>
                                    <TableHead>Assignments</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {terminalsList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No terminals found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    terminalsList.map((terminal) => {
                                        return (
                                            <TableRow key={`terminal-${terminal.id}`} className="hover:bg-accent/50 dark:hover:bg-accent/30 transition-colors">
                                                <TableCell className="font-medium">
                                                    {terminal.terminal_code}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{terminal.airport.iata_code}</div>
                                                    <div className="text-xs text-muted-foreground">{terminal.airport.airport_name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        {terminal.gates_count > 0 && (
                                                            <div className="text-sm">
                                                                <span className="font-medium">{terminal.gates_count}</span> gate{terminal.gates_count !== 1 ? 's' : ''}
                                                            </div>
                                                        )}
                                                        {terminal.baggage_belts_count > 0 && (
                                                            <div className="text-sm text-black dark:text-gray-300">
                                                                <span className="font-medium">{terminal.baggage_belts_count}</span> belt{terminal.baggage_belts_count !== 1 ? 's' : ''}
                                                            </div>
                                                        )}
                                                        {(terminal.gates_count === 0 && terminal.baggage_belts_count === 0) && (
                                                            <div className="text-sm text-muted-foreground">No assignments</div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                                            onClick={() => openEditDialog(terminal)}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            onClick={() => handleDelete(terminal)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                        
                        {terminalsList.length > 0 && (
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pt-4">
                                <div className="text-sm text-muted-foreground">{paginationLabel}</div>
                                <div className="flex gap-1">
                                    {terminals.current_page > 1 && (
                                        <Button variant="outline" size="sm" onClick={() => applyFilters(terminals.current_page - 1)}>
                                            ← Previous
                                        </Button>
                                    )}
                                    {Array.from({ length: Math.min(5, terminals.last_page) }, (_, i) => i + 1).map(page => (
                                        <Button
                                            key={page}
                                            variant={page === terminals.current_page ? 'default' : 'outline'}
                                            size="sm"
                                            className="w-8"
                                            onClick={() => applyFilters(page)}
                                        >
                                            {page}
                                        </Button>
                                    ))}
                                    {terminals.current_page < terminals.last_page && (
                                        <Button variant="outline" size="sm" onClick={() => applyFilters(terminals.current_page + 1)}>
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
                            <DialogTitle>Delete Terminal</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete terminal {selectedTerminal?.terminal_code}?
                                This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={confirmDelete}>
                                Delete Terminal
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Terminal</DialogTitle>
                            <DialogDescription>Create a new terminal for the selected airport.</DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                createForm.post('/management/terminals', {
                                    onSuccess: () => {
                                        setShowCreateDialog(false);
                                        createForm.reset();
                                    },
                                });
                            }}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="create-airport">Airport *</Label>
                                <Select
                                    value={createForm.data.iata_code || 'none'}
                                    onValueChange={(value) => createForm.setData('iata_code', value === 'none' ? '' : value)}
                                >
                                    <SelectTrigger id="create-airport">
                                        <SelectValue placeholder="Select airport" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-72 overflow-auto">
                                        <div className="px-2 py-1 flex gap-1 flex-wrap border-b">
                                            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((ch) => (
                                                <button
                                                    key={`create-airport-letter-${ch}`}
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => setCreateAirportLetter(createAirportLetter === ch ? null : ch)}
                                                    className={`text-xs px-1 ${createAirportLetter === ch ? 'underline font-semibold' : ''}`}
                                                >{ch}</button>
                                            ))}
                                        </div>
                                        <SelectItem value="none">Select airport</SelectItem>
                                        {airports.filter((airport) => !createAirportLetter || (airport.iata_code || '').startsWith(createAirportLetter)).map((airport) => {
                                            const hasNoTerminal = airportsWithoutTerminals.some(a => a.iata_code === airport.iata_code);
                                            return (
                                                <SelectItem key={`airport-${airport.iata_code}`} value={airport.iata_code}>
                                                    {airport.iata_code} - {airport.airport_name}
                                                    {hasNoTerminal && <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(suggested)</span>}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                                {createForm.errors.iata_code && (
                                    <p className="text-sm text-destructive">{createForm.errors.iata_code}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-terminal-code">Terminal Code *</Label>
                                <Input
                                    id="create-terminal-code"
                                    value={createForm.data.terminal_code}
                                    onChange={(e) => createForm.setData('terminal_code', e.target.value)}
                                    required
                                />
                                {createForm.errors.terminal_code && (
                                    <p className="text-sm text-destructive">{createForm.errors.terminal_code}</p>
                                )}
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createForm.processing}>
                                    Create Terminal
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Terminal</DialogTitle>
                            <DialogDescription>Update terminal information.</DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!selectedTerminal) return;
                                editForm.put(`/management/terminals/${selectedTerminal.id}`, {
                                    onSuccess: () => setShowEditDialog(false),
                                });
                            }}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="edit-airport">Airport</Label>
                                <Select
                                    value={editForm.data.iata_code || 'none'}
                                    onValueChange={(value) => editForm.setData('iata_code', value === 'none' ? '' : value)}
                                >
                                    <SelectTrigger id="edit-airport">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-72 overflow-auto">
                                        <div className="px-2 py-1 flex gap-1 flex-wrap border-b">
                                            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((ch) => (
                                                <button
                                                    key={`edit-airport-letter-${ch}`}
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => setEditAirportLetter(editAirportLetter === ch ? null : ch)}
                                                    className={`text-xs px-1 ${editAirportLetter === ch ? 'underline font-semibold' : ''}`}
                                                >{ch}</button>
                                            ))}
                                        </div>
                                        <SelectItem value="none">No change</SelectItem>
                                        {airports.filter((airport) => !editAirportLetter || (airport.iata_code || '').startsWith(editAirportLetter)).map((airport) => (
                                            <SelectItem key={`airport-${airport.iata_code}`} value={airport.iata_code}>
                                                {airport.iata_code} - {airport.airport_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {editForm.errors.iata_code && (
                                    <p className="text-sm text-destructive">{editForm.errors.iata_code}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-terminal-code">Terminal Code</Label>
                                <Input
                                    id="edit-terminal-code"
                                    value={editForm.data.terminal_code}
                                    onChange={(e) => editForm.setData('terminal_code', e.target.value)}
                                />
                                {editForm.errors.terminal_code && (
                                    <p className="text-sm text-destructive">{editForm.errors.terminal_code}</p>
                                )}
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={editForm.processing}>
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
