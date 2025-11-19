import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type Options = {
    statuses?: any[];
    airlines?: any[];
    airports?: any[];
    aircraft?: any[];
    gates?: any[];
    baggageBelts?: any[];
    // optional lists used by the form when showing connecting-flight selectors
    connectingFlights?: any[];
    flights?: any[];
};

type Props<TForm> = {
    form: TForm & { data: any; setData: (k: string, v: any) => void; errors?: any };
    options: Options;
    initialData?: any;
};

export default function FlightForm<TForm extends { data: any; setData: (k: string, v: any) => void }>(props: Props<TForm>) {
    const { form, options } = props;
    const [showAdvanced, setShowAdvanced] = React.useState(false);
    const [originLetter, setOriginLetter] = React.useState<string | null>(null);
    const [destinationLetter, setDestinationLetter] = React.useState<string | null>(null);
    const [connectingLetter, setConnectingLetter] = React.useState<string | null>(null);
    const [airlineLetter, setAirlineLetter] = React.useState<string | null>(null);
    const [aircraftLetter, setAircraftLetter] = React.useState<string | null>(null);
    const [connectingSearch, setConnectingSearch] = React.useState<string>('');
    const [airlineSearch, setAirlineSearch] = React.useState<string>('');
    const [aircraftSearch, setAircraftSearch] = React.useState<string>('');
    const [originSearch, setOriginSearch] = React.useState<string>('');
    const [destinationSearch, setDestinationSearch] = React.useState<string>('');

    // Auto-select airline based on leading airline code in flight number
    const onFlightNumberChange = (value: string) => {
        form.setData('flight_number', value);
        // Airline codes are typically 2-3 letter prefixes; try 3 then 2
        const cleaned = (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!cleaned) return;
        const prefixes = [cleaned.slice(0, 3), cleaned.slice(0, 2)];
        for (const p of prefixes) {
            const match = (options.airlines || []).find((a: any) => String(a.airline_code).toUpperCase() === p);
            if (match) {
                form.setData('airline_code', match.airline_code);
                break;
            }
        }
    };

    // Helpers to filter gates/belts by airport code and terminal
    const gates = options.gates || [];
    const belts = options.baggageBelts || [];

    // Get all unique terminals from gates
    const allTerminals = React.useMemo(() => {
        const terminals = gates
            .filter((g: any) => g.terminal)
            .map((g: any) => g.terminal)
            .filter((v: any, i: number, a: any[]) => a.findIndex((x: any) => x.id === v.id) === i);
        return terminals;
    }, [gates]);

    const originTerminals = React.useMemo(() => {
        if (!form.data.origin_code) return [];
        const t = gates
            .filter((g: any) => g.terminal && g.terminal.airport && g.terminal.airport.iata_code === form.data.origin_code)
            .map((g: any) => g.terminal)
            .filter((v: any, i: number, a: any[]) => a.findIndex((x: any) => x.id === v.id) === i);
        return t;
    }, [form.data.origin_code, gates]);

    const destinationTerminals = React.useMemo(() => {
        if (!form.data.destination_code) return [];
        const t = gates
            .filter((g: any) => g.terminal && g.terminal.airport && g.terminal.airport.iata_code === form.data.destination_code)
            .map((g: any) => g.terminal)
            .filter((v: any, i: number, a: any[]) => a.findIndex((x: any) => x.id === v.id) === i);
        return t;
    }, [form.data.destination_code, gates]);

    const departureGates = React.useMemo(() => {
        if (!form.data.origin_code) return [];
        return gates.filter((g: any) => g.terminal && g.terminal.airport && g.terminal.airport.iata_code === form.data.origin_code && (!form.data.origin_terminal_id || g.terminal.id === Number(form.data.origin_terminal_id)));
    }, [form.data.origin_code, form.data.origin_terminal_id, gates]);

    const arrivalGates = React.useMemo(() => {
        if (!form.data.destination_code) return [];
        return gates.filter((g: any) => g.terminal && g.terminal.airport && g.terminal.airport.iata_code === form.data.destination_code && (!form.data.destination_terminal_id || g.terminal.id === Number(form.data.destination_terminal_id)));
    }, [form.data.destination_code, form.data.destination_terminal_id, gates]);

    const destinationBelts = React.useMemo(() => {
        // Determine which airport code to use for selecting belts.
        // If this is a connecting journey and a connecting departure flight is selected,
        // prefer the connecting flight's destination_code (last destination) as the source.
        let code: string | undefined = form.data.destination_code;
        if (form.data.journey_type === 'connecting' && form.data.connecting_departure_id) {
            const list = options.connectingFlights || options.flights || [];
            const sel = list.find((f: any) => String(f.id) === String(form.data.connecting_departure_id));
            if (sel && sel.destination_code) code = sel.destination_code;
        }
        if (!code) return [];
        return belts.filter((b: any) => b.terminal && b.terminal.airport && b.terminal.airport.iata_code === code);
    }, [form.data.destination_code, belts]);

    // Determine if this is an arrival flight (destination is local airport - MNL)
    const isArrivalFlight = React.useMemo(() => {
        // Check if destination is MNL (Manila) - you may need to adjust this based on your local airport code
        const localAirportCode = 'MNL'; // This should match your local airport
        return form.data.destination_code === localAirportCode;
    }, [form.data.destination_code]);

    // auto-default baggage belt when destination (or connecting selection) changes (only for arrivals)
    React.useEffect(() => {
        if (isArrivalFlight && !form.data.baggage_belt_id) {
            if (destinationBelts.length) {
                // Use the belt `id` as the canonical selected value (always a string)
                form.setData('baggage_belt_id', String(destinationBelts[0].id));
            }
        } else if (!isArrivalFlight && form.data.baggage_belt_id) {
            // Clear baggage belt if not an arrival flight
            form.setData('baggage_belt_id', '');
        }
    }, [destinationBelts, isArrivalFlight]);

    // Auto-calculate scheduled_departure_time when journey is connecting
    React.useEffect(() => {
        if (form.data.journey_type === 'connecting' && form.data.connecting_departure_id) {
            const list = options.connectingFlights || options.flights || [];
            const sel = list.find((f: any) => String(f.id) === String(form.data.connecting_departure_id));
            const minCt = Number(form.data.minimum_connecting_time || 0);
            if (sel && sel.scheduled_arrival_time && minCt && !form.data.scheduled_departure_time) {
                const arr = new Date(sel.scheduled_arrival_time);
                if (!isNaN(arr.getTime())) {
                    const dep = new Date(arr.getTime() + minCt * 60000);
                    // format as yyyy-MM-ddTHH:mm for datetime-local
                    const pad = (n: number) => String(n).padStart(2, '0');
                    const isoLocal = `${dep.getFullYear()}-${pad(dep.getMonth()+1)}-${pad(dep.getDate())}T${pad(dep.getHours())}:${pad(dep.getMinutes())}`;
                    form.setData('scheduled_departure_time', isoLocal);
                }
            }
        }
    }, [form.data.journey_type, form.data.connecting_departure_id, form.data.minimum_connecting_time, options]);

    // Track if initial data has been loaded to prevent overriding extracted values
    const [initialDataLoaded, setInitialDataLoaded] = React.useState(false);
    
    React.useEffect(() => {
        // Mark initial data as loaded after a short delay to allow FlightModal to set extracted values
        if (props.initialData?.id) {
            const timer = setTimeout(() => setInitialDataLoaded(true), 100);
            return () => clearTimeout(timer);
        } else {
            setInitialDataLoaded(true); // For new flights, we can default immediately
        }
    }, [props.initialData?.id]);

    React.useEffect(() => {
        // Only default values if initial data has been processed and fields are truly empty
        // This prevents overriding values extracted from relationships when editing
        if (!initialDataLoaded) return;
        
        const isNewFlight = !props.initialData?.id;
        
        // Default origin terminal and gate when origin changes (only for new flights or if truly empty)
        if (form.data.origin_code) {
            // Only default if field is empty AND (it's a new flight OR we've confirmed no initial data)
            if (originTerminals.length && !form.data.origin_terminal_id && (isNewFlight || !props.initialData?.id)) {
                form.setData('origin_terminal_id', String(originTerminals[0].id));
            }
            if (departureGates.length && !form.data.gate_id && (isNewFlight || !props.initialData?.id)) {
                form.setData('gate_id', String(departureGates[0].id));
            }
        }

        // Default destination terminal and arrival gate when destination changes (only for new flights or if truly empty)
        if (form.data.destination_code) {
            if (destinationTerminals.length && !form.data.destination_terminal_id && (isNewFlight || !props.initialData?.id)) {
                form.setData('destination_terminal_id', String(destinationTerminals[0].id));
            }
            if (arrivalGates.length && !form.data.arrival_gate_id && (isNewFlight || !props.initialData?.id)) {
                form.setData('arrival_gate_id', String(arrivalGates[0].id));
            }
            // Only set baggage belt for arrival flights (only for new flights or if truly empty)
            if (isArrivalFlight && destinationBelts.length && !form.data.baggage_belt_id && (isNewFlight || !props.initialData?.id)) {
                // Store the belt `id` consistently as a string to avoid controlled/uncontrolled warnings
                form.setData('baggage_belt_id', String(destinationBelts[0].id));
            }
        }
    }, [form.data.origin_code, form.data.destination_code, originTerminals, destinationTerminals, departureGates, arrivalGates, destinationBelts, isArrivalFlight, props.initialData?.id, initialDataLoaded]);

    return (
        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="flight_number">Flight Number *</Label>
                <Input id="flight_number" value={form.data.flight_number} onChange={(e: any) => onFlightNumberChange(e.target.value)} placeholder="Enter flight number" required />
                {form.errors?.flight_number && <div className="text-destructive text-sm mt-1">{form.errors.flight_number}</div>}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="airline_code">Airline *</Label>
                <Select value={form.data.airline_code ?? ''} onValueChange={(v: any) => form.setData('airline_code', v)}>
                    <SelectTrigger id="airline_code"><SelectValue placeholder="Select airline" /></SelectTrigger>
                    <SelectContent className="max-h-72 overflow-auto min-w-[var(--radix-select-trigger-width)] max-w-[90vw]">
                        <div className="px-2 py-2 border-b">
                            <Input
                                placeholder="Search airline..."
                                value={airlineSearch}
                                onChange={(e) => setAirlineSearch(e.target.value)}
                                className="h-8"
                                onKeyDown={(e) => e.stopPropagation()}
                            />
                        </div>
                        <div className="px-2 py-1 flex gap-1 flex-wrap border-b">
                            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((ch) => (
                                <button
                                    key={`airline-letter-${ch}`}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        setAirlineLetter(airlineLetter === ch ? null : ch);
                                    }}
                                    className={`text-xs px-1 ${airlineLetter === ch ? 'underline font-bold' : ''}`}
                                >{ch}</button>
                            ))}
                        </div>
                        {((options.airlines || []).filter((a: any) => {
                            const matchesSearch = !airlineSearch || 
                                (a.airline_code || '').toLowerCase().includes(airlineSearch.toLowerCase()) ||
                                (a.airline_name || '').toLowerCase().includes(airlineSearch.toLowerCase());
                            const matchesLetter = !airlineLetter || (a.airline_code || '').startsWith(airlineLetter);
                            return matchesSearch && matchesLetter;
                        })).map((a: any) => (
                            <SelectItem key={`airline-${a.airline_code}`} value={a.airline_code}>{a.airline_code} - {a.airline_name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="aircraft_icao_code">Aircraft</Label>
                <Select value={form.data.aircraft_icao_code || ''} onValueChange={(v: any) => form.setData('aircraft_icao_code', v || null)}>
                    <SelectTrigger id="aircraft_icao_code">
                        <SelectValue placeholder="Select aircraft" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 overflow-auto min-w-[var(--radix-select-trigger-width)] max-w-[90vw]">
                        <div className="px-2 py-2 border-b">
                            <Input
                                placeholder="Search aircraft..."
                                value={aircraftSearch}
                                onChange={(e) => setAircraftSearch(e.target.value)}
                                className="h-8"
                                onKeyDown={(e) => e.stopPropagation()}
                            />
                        </div>
                        <div className="px-2 py-1 flex gap-1 flex-wrap border-b">
                            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((ch) => (
                                <button
                                    key={`aircraft-letter-${ch}`}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        setAircraftLetter(aircraftLetter === ch ? null : ch);
                                    }}
                                    className={`text-xs px-1 ${aircraftLetter === ch ? 'underline font-bold' : ''}`}
                                >{ch}</button>
                            ))}
                        </div>
                        {((options.aircraft || []).filter((ac: any) => {
                            const matchesSearch = !aircraftSearch || 
                                (ac.icao_code || '').toLowerCase().includes(aircraftSearch.toLowerCase()) ||
                                (ac.manufacturer || '').toLowerCase().includes(aircraftSearch.toLowerCase()) ||
                                (ac.model_name || '').toLowerCase().includes(aircraftSearch.toLowerCase());
                            const matchesLetter = !aircraftLetter || (ac.icao_code || '').startsWith(aircraftLetter);
                            return matchesSearch && matchesLetter;
                        })).map((ac: any) => {
                            // Format aircraft name - avoid duplicates
                            let aircraftName = ac.model_name || '';
                            if (ac.manufacturer && aircraftName && !aircraftName.toLowerCase().startsWith(ac.manufacturer.toLowerCase())) {
                                aircraftName = `${ac.manufacturer} ${aircraftName}`;
                            } else if (ac.manufacturer && !aircraftName) {
                                aircraftName = ac.manufacturer;
                            }
                            return (
                                <SelectItem key={`aircraft-${ac.icao_code}`} value={ac.icao_code}>
                                    {ac.icao_code} - {aircraftName || 'N/A'}
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
                {form.errors?.aircraft_icao_code && <div className="text-destructive text-sm mt-1">{form.errors.aircraft_icao_code}</div>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="origin_code">Origin *</Label>
                    <Select value={form.data.origin_code ?? ''} onValueChange={(v: any) => form.setData('origin_code', v)}>
                        <SelectTrigger id="origin_code"><SelectValue placeholder="Select origin" /></SelectTrigger>
                        <SelectContent className="max-h-72 overflow-auto min-w-[var(--radix-select-trigger-width)] max-w-[90vw]">
                            <div className="px-2 py-2 border-b">
                                <Input
                                    placeholder="Search origin..."
                                    value={originSearch}
                                    onChange={(e) => setOriginSearch(e.target.value)}
                                    className="h-8"
                                    onKeyDown={(e) => e.stopPropagation()}
                                />
                            </div>
                            <div className="px-2 py-1 flex gap-1 flex-wrap border-b">
                                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((ch) => (
                                    <button
                                        key={`origin-letter-${ch}`}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            setOriginLetter(originLetter === ch ? null : ch);
                                        }}
                                        className={`text-xs px-1 ${originLetter === ch ? 'underline font-bold' : ''}`}
                                    >{ch}</button>
                                ))}
                            </div>
                            {((options.airports || []).filter((ap: any) => {
                                const matchesSearch = !originSearch || 
                                    (ap.iata_code || '').toLowerCase().includes(originSearch.toLowerCase()) ||
                                    (ap.city || '').toLowerCase().includes(originSearch.toLowerCase());
                                const matchesLetter = !originLetter || (ap.iata_code || '').startsWith(originLetter);
                                return matchesSearch && matchesLetter;
                            })).map((ap: any) => (
                                <SelectItem key={`airport-${ap.iata_code}`} value={ap.iata_code}>{ap.iata_code} - {ap.city}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="destination_code">Destination *</Label>
                    <Select value={form.data.destination_code ?? ''} onValueChange={(v: any) => form.setData('destination_code', v)}>
                        <SelectTrigger id="destination_code"><SelectValue placeholder="Select destination" /></SelectTrigger>
                        <SelectContent className="max-h-72 overflow-auto min-w-[var(--radix-select-trigger-width)] max-w-[90vw]">
                            <div className="px-2 py-2 border-b">
                                <Input
                                    placeholder="Search destination..."
                                    value={destinationSearch}
                                    onChange={(e) => setDestinationSearch(e.target.value)}
                                    className="h-8"
                                    onKeyDown={(e) => e.stopPropagation()}
                                />
                            </div>
                            <div className="px-2 py-1 flex gap-1 flex-wrap border-b">
                                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((ch) => (
                                    <button
                                        key={`destination-letter-${ch}`}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            setDestinationLetter(destinationLetter === ch ? null : ch);
                                        }}
                                        className={`text-xs px-1 ${destinationLetter === ch ? 'underline font-bold' : ''}`}
                                    >{ch}</button>
                                ))}
                            </div>
                            {((options.airports || []).filter((ap: any) => {
                                const matchesSearch = !destinationSearch || 
                                    (ap.iata_code || '').toLowerCase().includes(destinationSearch.toLowerCase()) ||
                                    (ap.city || '').toLowerCase().includes(destinationSearch.toLowerCase());
                                const matchesLetter = !destinationLetter || (ap.iata_code || '').startsWith(destinationLetter);
                                return matchesSearch && matchesLetter;
                            })).map((ap: any) => (
                                <SelectItem key={`airport-${ap.iata_code}`} value={ap.iata_code}>{ap.iata_code} - {ap.city}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="scheduled_departure_time">Scheduled Departure *</Label>
                    <Input 
                        id="scheduled_departure_time" 
                        type="datetime-local" 
                        value={form.data.scheduled_departure_time} 
                        onChange={(e: any) => form.setData('scheduled_departure_time', e.target.value)} 
                        required 
                        className="text-center"
                    />
                    {form.errors?.scheduled_departure_time && <div className="text-destructive text-sm mt-1">{form.errors.scheduled_departure_time}</div>}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="scheduled_arrival_time">Scheduled Arrival *</Label>
                    <Input 
                        id="scheduled_arrival_time" 
                        type="datetime-local" 
                        value={form.data.scheduled_arrival_time} 
                        onChange={(e: any) => form.setData('scheduled_arrival_time', e.target.value)} 
                        required 
                        className="text-center"
                    />
                    {form.errors?.scheduled_arrival_time && <div className="text-destructive text-sm mt-1">{form.errors.scheduled_arrival_time}</div>}
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="status">Initial Status *</Label>
                <Select value={form.data.status_id ?? ''} onValueChange={(v: any) => form.setData('status_id', v)}>
                    <SelectTrigger id="status"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                        {(options.statuses || []).map((s: any) => (
                            // Use the canonical `id_status_code` string as the value so backend receives the expected key
                            <SelectItem key={`status-${(s.id_status_code ?? s.id)}`} value={(s.id_status_code ?? s.id).toString()}>{s.status_name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="journey_type">Journey Type</Label>
                <Select value={form.data.journey_type || ''} onValueChange={(v: any) => form.setData('journey_type', v)}>
                    <SelectTrigger id="journey_type"><SelectValue placeholder="Select journey type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="direct">Direct</SelectItem>
                        <SelectItem value="connecting">Connecting</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Connecting options placed directly under journey type */}
            {form.data.journey_type === 'connecting' && (
                <div className="space-y-3">
                    <div className="grid gap-2">
                        <Label htmlFor="connecting_departure_id">Connecting From (Departure Flight)</Label>
                        {options.connectingFlights || options.flights ? (
                            <Select value={form.data.connecting_departure_id ?? ''} onValueChange={(v: any) => form.setData('connecting_departure_id', v)}>
                                <SelectTrigger id="connecting_departure_id"><SelectValue placeholder="Select connecting flight" /></SelectTrigger>
                                <SelectContent className="max-h-72 overflow-auto min-w-[var(--radix-select-trigger-width)] max-w-[90vw]">
                                    <div className="px-2 py-2 border-b">
                                        <Input
                                            placeholder="Search connecting flight..."
                                            value={connectingSearch}
                                            onChange={(e) => setConnectingSearch(e.target.value)}
                                            className="h-8"
                                            onKeyDown={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    <div className="px-2 py-1 flex gap-1 flex-wrap border-b">
                                        {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((ch) => (
                                            <button
                                                key={`connecting-letter-${ch}`}
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    setConnectingLetter(connectingLetter === ch ? null : ch);
                                                }}
                                                className={`text-xs px-1 ${connectingLetter === ch ? 'underline font-bold' : ''}`}
                                            >{ch}</button>
                                        ))}
                                    </div>
                                    {((options.connectingFlights || options.flights || []).filter((f: any) => {
                                        const matchesSearch = !connectingSearch || 
                                            (f.flight_number || '').toLowerCase().includes(connectingSearch.toLowerCase()) ||
                                            (f.origin_code || '').toLowerCase().includes(connectingSearch.toLowerCase()) ||
                                            (f.destination_code || '').toLowerCase().includes(connectingSearch.toLowerCase());
                                        const matchesLetter = !connectingLetter || (String(f.flight_number || '').startsWith(connectingLetter));
                                        return matchesSearch && matchesLetter;
                                    })).map((f: any) => (
                                        <SelectItem key={`connecting-${f.id}`} value={String(f.id)}>{f.flight_number} — {f.origin_code} → {f.destination_code} ({f.scheduled_departure_time ? new Date(f.scheduled_departure_time).toLocaleString() : 'TBD'})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input id="connecting_departure_id" value={form.data.connecting_departure_id || ''} onChange={(e: any) => form.setData('connecting_departure_id', e.target.value)} placeholder="Flight ID or number" />
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="minimum_connecting_time">Minimum Connecting Time (minutes)</Label>
                        <Input id="minimum_connecting_time" type="number" value={form.data.minimum_connecting_time || ''} onChange={(e: any) => form.setData('minimum_connecting_time', e.target.value)} />
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2">
                <button type="button" className="text-sm text-primary underline" onClick={() => setShowAdvanced(!showAdvanced)}>
                    {showAdvanced ? 'Hide detailed assignments' : 'Show detailed assignments'}
                </button>
            </div>

            {showAdvanced && (
                <div className="space-y-4 border rounded p-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Origin Terminal</Label>
                            <Select value={form.data.origin_terminal_id ?? ''} onValueChange={(v: any) => form.setData('origin_terminal_id', v)}>
                                <SelectTrigger id="origin_terminal_id"><SelectValue placeholder="Select terminal" /></SelectTrigger>
                                <SelectContent>
                                    {originTerminals.map((t: any) => {
                                        const terminalCode = t.id_terminal_code || t.idTerminalCode || (t.id && t.terminal_code ? `${t.id}-${t.terminal_code}` : String(t.id));
                                        return (
                                            <SelectItem key={`origin-terminal-${t.id}`} value={String(t.id)}>
                                                {t.terminal_code || t.terminal_name || t.name || `Terminal ${t.id}`}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Destination Terminal</Label>
                            <Select value={form.data.destination_terminal_id ?? ''} onValueChange={(v: any) => form.setData('destination_terminal_id', v)}>
                                <SelectTrigger id="destination_terminal_id"><SelectValue placeholder="Select terminal" /></SelectTrigger>
                                <SelectContent>
                                    {destinationTerminals.map((t: any) => {
                                        const terminalCode = t.id_terminal_code || t.idTerminalCode || (t.id && t.terminal_code ? `${t.id}-${t.terminal_code}` : String(t.id));
                                        return (
                                            <SelectItem key={`destination-terminal-${t.id}`} value={String(t.id)}>
                                                {t.terminal_code || t.terminal_name || t.name || `Terminal ${t.id}`}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Origin Gate</Label>
                            <Select value={form.data.gate_id ?? ''} onValueChange={(v: any) => form.setData('gate_id', v)}>
                                <SelectTrigger id="gate_id"><SelectValue placeholder="Select gate" /></SelectTrigger>
                                <SelectContent>
                                    {departureGates.map((g: any) => (
                                        <SelectItem key={`gate-${g.id}-${g.gate_code ?? ''}`} value={String(g.id)}>{g.gate_code ?? g.id}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Arrival Gate</Label>
                            <Select value={form.data.arrival_gate_id ?? ''} onValueChange={(v: any) => form.setData('arrival_gate_id', v)}>
                                <SelectTrigger id="arrival_gate_id"><SelectValue placeholder="Select gate" /></SelectTrigger>
                                <SelectContent>
                                    {arrivalGates.map((g: any) => (
                                        <SelectItem key={`gate-${g.id}-${g.gate_code ?? ''}`} value={String(g.id)}>{g.gate_code ?? g.id}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {isArrivalFlight && (
                        <div className="grid gap-2">
                            <Label>Baggage Belt</Label>
                            <Select value={form.data.baggage_belt_id ?? ''} onValueChange={(v: any) => form.setData('baggage_belt_id', v)}>
                                <SelectTrigger id="baggage_belt_id"><SelectValue placeholder="Select baggage belt" /></SelectTrigger>
                                <SelectContent>
                                    {destinationBelts.map((b: any) => (
                                        <SelectItem
                                            key={`belt-${b.id}-${b.belt_code ?? ''}`}
                                            value={String(b.id)}
                                        >
                                            {b.belt_code ?? b.id}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            )}

            
        </div>
    );
}
