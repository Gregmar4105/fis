import React from 'react';
import { usePage } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import FlightForm from './FlightForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, router } from '@inertiajs/react';

type FlightStatus = { id: number; status_code: string; status_name: string };
type Airline = { airline_code: string; airline_name: string };
type Airport = { iata_code: string; city: string; timezone?: string };
type Gate = { id: number; gate_code: string; terminal?: any };
type BaggageBelt = { id: number; belt_code: string };

type Options = {
    statuses?: FlightStatus[];
    airlines?: Airline[];
    airports?: Airport[];
    aircraft?: any[];
    gates?: Gate[];
    baggageBelts?: BaggageBelt[];
};

type InitialData = Partial<{
    id: number;
    flight_number: string;
    airline_code: string;
    aircraft_icao_code: string | null;
    origin_code: string;
    destination_code: string;
    scheduled_departure_time: string | null;
    scheduled_arrival_time: string | null;
    status_id: number | string;
    // backend may provide richer status objects with canonical codes
    status?: { id?: number; id_status_code?: string; status_code?: string; status_name?: string; };
    // legacy or canonical string code at top-level
    fk_id_status_code?: string;
    gate_id?: string | number;
    baggage_belt_id?: string | number;
    origin_terminal_id?: string | number;
    destination_terminal_id?: string | number;
    // Relationships that may be loaded
    gate?: { id: number; gate_code?: string; terminal?: { id: number; terminal_code?: string; name?: string; }; };
    baggageBelt?: { id: number; belt_code?: string; terminal?: { id: number; terminal_code?: string; name?: string; }; };
    baggage_belt?: { id: number; belt_code?: string; terminal?: { id: number; terminal_code?: string; name?: string; }; };
    terminal?: { id: number; terminal_code?: string; name?: string; };
    terminalDirect?: { id: number; terminal_code?: string; name?: string; };
    departure?: { gate?: { id: number; gate_code?: string; }; };
    arrival?: { baggage_belt?: { id: number; belt_code?: string; }; gate?: { id: number; gate_code?: string; }; };
    // UI-level fields used for connecting journeys
    journey_type?: string;
    connecting_departure_id?: string | number;
    minimum_connecting_time?: number | string | null;
}>;

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    options: Options;
    initialData?: InitialData;
};

type FormData = {
    flight_number: string;
    airline_code: string;
    aircraft_icao_code?: string;
    origin_code: string;
    destination_code: string;
    scheduled_departure_time: string;
    scheduled_arrival_time: string;
    status_id: string;
    gate_id?: string;
    arrival_gate_id?: string;
    baggage_belt_id?: string;
    origin_terminal_id?: string;
    destination_terminal_id?: string;
    journey_type?: string;
    connecting_departure_id?: string;
    minimum_connecting_time?: string | number;
};

export default function FlightModal({ open, onOpenChange, options, initialData = {} }: Props) {
    // Helper function to extract IDs from relationships
    const extractGateId = (data: InitialData): string => {
        if (data.gate_id) return String(data.gate_id);
        if (data.gate?.id) return String(data.gate.id);
        if (data.departure?.gate?.id) return String(data.departure.gate.id);
        return '';
    };

    const extractArrivalGateId = (data: InitialData): string => {
        if ((data as any).arrival_gate_id) return String((data as any).arrival_gate_id);
        if (data.arrival?.gate?.id) return String(data.arrival.gate.id);
        return '';
    };

    const extractBeltId = (data: InitialData): string => {
        if (data.baggage_belt_id) return String(data.baggage_belt_id);
        if (data.baggageBelt?.id) return String(data.baggageBelt.id);
        if (data.baggage_belt?.id) return String(data.baggage_belt.id);
        if (data.arrival?.baggage_belt?.id) return String(data.arrival.baggage_belt.id);
        return '';
    };

    const extractOriginTerminalId = (data: InitialData): string => {
        // First check for direct origin_terminal_id
        if (data.origin_terminal_id) return String(data.origin_terminal_id);
        // Check gate's terminal (most common for origin)
        if (data.gate?.terminal?.id) return String(data.gate.terminal.id);
        // Check terminal set directly on flight (set by backend)
        if (data.terminal?.id) return String(data.terminal.id);
        // Check terminalDirect relationship
        if (data.terminalDirect?.id) return String(data.terminalDirect.id);
        // Check departure gate's terminal
        if (data.departure?.gate?.terminal?.id) return String(data.departure.gate.terminal.id);
        return '';
    };

    const extractDestinationTerminalId = (data: InitialData): string => {
        if (data.destination_terminal_id) return String(data.destination_terminal_id);
        if (data.baggageBelt?.terminal?.id) return String(data.baggageBelt.terminal.id);
        if (data.baggage_belt?.terminal?.id) return String(data.baggage_belt.terminal.id);
        return '';
    };

    // Map initialData to form values, using fallbacks where necessary
    // Prefer the canonical status code string (fk_id_status_code / id_status_code) when available
    const initialStatusId = (initialData && (initialData.status?.id_status_code || initialData.status?.id || initialData.status_id || initialData.fk_id_status_code))
        ? String(initialData.status?.id_status_code ?? initialData.status?.id ?? initialData.status_id ?? initialData.fk_id_status_code)
        : '';
    
    const form = useForm<FormData>({
        flight_number: initialData.flight_number || '',
        airline_code: initialData.airline_code || '',
        aircraft_icao_code: initialData.aircraft_icao_code || '',
        origin_code: initialData.origin_code || '',
        destination_code: initialData.destination_code || '',
        scheduled_departure_time: initialData.scheduled_departure_time || '',
        scheduled_arrival_time: initialData.scheduled_arrival_time || '',
        status_id: initialStatusId || '',
        // Extract IDs from relationships if direct IDs not available
        gate_id: extractGateId(initialData),
        arrival_gate_id: extractArrivalGateId(initialData),
        baggage_belt_id: extractBeltId(initialData),
        origin_terminal_id: extractOriginTerminalId(initialData),
        destination_terminal_id: extractDestinationTerminalId(initialData),
        journey_type: (initialData as any).journey_type || 'direct',
        connecting_departure_id: (initialData as any).connecting_departure_id ? String((initialData as any).connecting_departure_id) : '',
        minimum_connecting_time: (initialData as any).minimum_connecting_time || '',
    });

    const page = usePage();

    // When the modal opens, proactively dispatch an Escape keydown to close
    // any open Radix popovers/selects so focus isn't trapped under aria-hidden.
    React.useEffect(() => {
        if (open) {
            try {
                // If any element is focused inside a popover/select, blur it first
                try { (document.activeElement as HTMLElement | null)?.blur(); } catch (e) { /* no-op */ }
                // Dispatch both keydown and keyup so Radix popovers/selects close reliably
                const evDown = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true });
                const evUp = new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true });
                document.dispatchEvent(evDown as any);
                document.dispatchEvent(evUp as any);
                // After a short delay, focus the dialog content to ensure focus moves into the modal
                setTimeout(() => {
                    try {
                        const dialog = document.querySelector('[role="dialog"], [data-slot="dialog-content"]') as HTMLElement | null;
                        if (dialog) {
                            // ensure it's focusable
                            if (typeof dialog.focus === 'function') dialog.focus();
                        }
                    } catch (e) {
                        // no-op
                    }
                }, 50);
            } catch (e) {
                // no-op
            }
        }
    }, [open]);

    // Local banner for server/network errors (non-validation, e.g. 5xx or network failures)
    const [serverError, setServerError] = React.useState<string | null>(null);

    // Keep form in sync when `initialData` changes (so edit modal shows current values)
    React.useEffect(() => {
        try {
            form.setData('flight_number', initialData.flight_number || '');
            form.setData('airline_code', initialData.airline_code || '');
            form.setData('aircraft_icao_code', initialData.aircraft_icao_code || '');
            form.setData('origin_code', initialData.origin_code || '');
            form.setData('destination_code', initialData.destination_code || '');
            
            // Convert UTC times from database to local timezone for datetime-local inputs
            // datetime-local expects format: YYYY-MM-DDTHH:mm (no timezone, interpreted as local)
            const formatForDateTimeLocal = (utcTime: string | null | undefined, timezone?: string): string => {
                if (!utcTime) return '';
                try {
                    // Parse UTC time and convert to the specified timezone (or user's timezone)
                    const date = new Date(utcTime);
                    if (isNaN(date.getTime())) return '';
                    
                    // If timezone is provided, format in that timezone; otherwise use browser local time
                    if (timezone) {
                        // Use Intl.DateTimeFormat to format in the specified timezone
                        const formatter = new Intl.DateTimeFormat('en-CA', {
                            timeZone: timezone,
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        });
                        const parts = formatter.formatToParts(date);
                        const year = parts.find(p => p.type === 'year')?.value;
                        const month = parts.find(p => p.type === 'month')?.value;
                        const day = parts.find(p => p.type === 'day')?.value;
                        const hour = parts.find(p => p.type === 'hour')?.value;
                        const minute = parts.find(p => p.type === 'minute')?.value;
                        return `${year}-${month}-${day}T${hour}:${minute}`;
                    } else {
                        // Fallback to browser local timezone
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const hour = String(date.getHours()).padStart(2, '0');
                        const minute = String(date.getMinutes()).padStart(2, '0');
                        return `${year}-${month}-${day}T${hour}:${minute}`;
                    }
                } catch (e) {
                    return '';
                }
            };
            
            // Get airport timezones for conversion
            const origin = (options.airports || []).find((a: any) => a.iata_code === initialData.origin_code);
            const destination = (options.airports || []).find((a: any) => a.iata_code === initialData.destination_code);
            const shared = page.props as any;
            const userTz = shared.user_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
            
            const depTz = origin?.timezone || userTz;
            const arrTz = destination?.timezone || userTz;
            
            form.setData('scheduled_departure_time', formatForDateTimeLocal(initialData.scheduled_departure_time, depTz));
            form.setData('scheduled_arrival_time', formatForDateTimeLocal(initialData.scheduled_arrival_time, arrTz));
            
            const statusVal = (initialData && (initialData.status?.id_status_code || initialData.status?.id || initialData.status_id || initialData.fk_id_status_code))
                ? String(initialData.status?.id_status_code ?? initialData.status?.id ?? initialData.status_id ?? initialData.fk_id_status_code)
                : '';
            form.setData('status_id', statusVal);
            // Extract IDs from relationships if direct IDs not available
            form.setData('gate_id', extractGateId(initialData));
            form.setData('arrival_gate_id', extractArrivalGateId(initialData));
            form.setData('baggage_belt_id', extractBeltId(initialData));
            form.setData('origin_terminal_id', extractOriginTerminalId(initialData));
            form.setData('destination_terminal_id', extractDestinationTerminalId(initialData));
            form.setData('journey_type', (initialData as any).journey_type || 'direct');
            form.setData('connecting_departure_id', (initialData as any).connecting_departure_id ? String((initialData as any).connecting_departure_id) : '');
            form.setData('minimum_connecting_time', (initialData as any).minimum_connecting_time || '');
            // Clear previous errors/debug
            try { (form as any).setErrors({}); } catch (e) { /* no-op */ }
        } catch (e) {
            // swallow
        }
    }, [initialData, options.airports, page.props]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Prevent double submission
        if (form.processing) {
            return;
        }
        
        const submitData: any = { ...form.data };
        
        // Remove empty aircraft_icao_code if it's an empty string (but keep null for explicit nulls)
        if (submitData.aircraft_icao_code === '') {
            submitData.aircraft_icao_code = null;
        }

        if (submitData.status_id !== undefined) {
            // The frontend now sends the canonical string code (id_status_code) when available.
            submitData.fk_id_status_code = submitData.status_id;
            delete submitData.status_id;
        }
        if (submitData.gate_id) {
            try {
                const gates = options.gates || [];
                // Try to locate the selected gate using several strategies for robustness
                let gate = gates.find((g: any) => String(g.id) === String(submitData.gate_id));

                if (!gate) {
                    // If the frontend accidentally stored an id_gate_code or composed code, try to match that
                    gate = gates.find((g: any) => {
                        const idGateCode = g.id_gate_code ?? g.idGateCode ?? g.id_gatecode;
                        if (idGateCode && String(idGateCode) === String(submitData.gate_id)) return true;
                        const terminalId = g.terminal?.id ?? g.terminal_id ?? g.terminal?.terminal_id ?? '';
                        const code = g.gate_code ?? g.code ?? g.gateCode ?? g.display ?? String(g.id);
                        const composed = `${terminalId ? String(terminalId) + '-' : ''}${String(code)}`;
                        if (composed === String(submitData.gate_id)) return true;
                        if (String(code) === String(submitData.gate_id)) return true;
                        return false;
                    });
                }

                if (gate) {
                    // Prefer canonical id_gate_code when present
                    const idGateCode = gate.id_gate_code ?? gate.idGateCode ?? gate.id_gatecode;
                    if (idGateCode) {
                        submitData.fk_id_gate_code = String(idGateCode);
                    } else {
                        // If id_gate_code is missing, construct it from terminal_id and gate_code
                        // This matches the database format: "{terminal_id}-{gate_code}"
                        const terminalId = gate.terminal?.id ?? gate.terminal_id ?? gate.terminal?.terminal_id ?? '';
                        const code = gate.gate_code ?? gate.code ?? gate.gateCode ?? gate.display ?? String(gate.id);
                        if (terminalId && code) {
                            submitData.fk_id_gate_code = `${String(terminalId)}-${String(code)}`;
                        } else {
                            // If we can't construct a valid code, don't send it (let validation fail clearly)
                            // Don't set fk_id_gate_code - let backend validation handle it
                        }
                    }
                    
                    // Always try to set terminal code from gate's terminal
                    const t = gate.terminal ?? null;
                    if (t) {
                        const tid = t.id_terminal_code ?? t.idTerminalCode ?? t.id_terminalcode;
                        if (tid) {
                            submitData.fk_id_terminal_code = tid;
                        } else if (t.id && t.terminal_code) {
                            // Construct terminal code if not present
                            submitData.fk_id_terminal_code = `${t.id}-${t.terminal_code}`;
                        }
                    }
                } else {
                    // Gate not found - don't send invalid data
                    // Don't set fk_id_gate_code - let backend validation handle it
                }
            } catch (e) {
                // Don't set fk_id_gate_code on error - let backend validation handle it
            }
            delete submitData.gate_id;
        }
        if (submitData.baggage_belt_id) {
            try {
                const belts = options.baggageBelts || [];
                // Locate belt by id first, then try other heuristics
                let belt = belts.find((b: any) => String(b.id) === String(submitData.baggage_belt_id));
                if (!belt) {
                    belt = belts.find((b: any) => {
                        const idBeltCode = b.id_belt_code ?? b.idBeltCode ?? b.id_beltcode;
                        if (idBeltCode && String(idBeltCode) === String(submitData.baggage_belt_id)) return true;
                        const terminalId = b.terminal?.id ?? b.terminal_id ?? b.terminal?.terminal_id ?? '';
                        const code = b.belt_code ?? b.code ?? b.beltCode ?? String(b.id);
                        const composed = `${terminalId ? String(terminalId) + '-' : ''}${String(code)}`;
                        if (composed === String(submitData.baggage_belt_id)) return true;
                        if (String(code) === String(submitData.baggage_belt_id)) return true;
                        return false;
                    });
                }

                if (belt) {
                    const idBeltCode = belt.id_belt_code ?? belt.idBeltCode ?? belt.id_beltcode;
                    if (idBeltCode) {
                        submitData.fk_id_belt_code = String(idBeltCode);
                    } else {
                        // If id_belt_code is missing, construct it from terminal_id and belt_code
                        // This matches the database format: "{terminal_id}-{belt_code}"
                        const terminalId = belt.terminal?.id ?? belt.terminal_id ?? belt.terminal?.terminal_id ?? '';
                        const code = belt.belt_code ?? belt.code ?? belt.beltCode ?? String(belt.id);
                        if (terminalId && code) {
                            submitData.fk_id_belt_code = `${String(terminalId)}-${String(code)}`;
                        } else {
                            // If we can't construct a valid code, don't send it (let validation fail clearly)
                            // Don't set fk_id_belt_code - let backend validation handle it
                        }
                    }
                    
                    // Always try to set terminal code from belt's terminal (if not already set from gate)
                    if (!submitData.fk_id_terminal_code) {
                        const tb = belt.terminal ?? null;
                        if (tb) {
                            const tid = tb.id_terminal_code ?? tb.idTerminalCode ?? tb.id_terminalcode;
                            if (tid) {
                                submitData.fk_id_terminal_code = tid;
                            } else if (tb.id && tb.terminal_code) {
                                // Construct terminal code if not present
                                submitData.fk_id_terminal_code = `${tb.id}-${tb.terminal_code}`;
                            }
                        }
                    }
                } else {
                    // Belt not found - don't send invalid data
                    // Don't set fk_id_belt_code - let backend validation handle it
                }
            } catch (e) {
                // Don't set fk_id_belt_code on error - let backend validation handle it
            }
            delete submitData.baggage_belt_id;
        }

        // If user indicated this is a connecting journey, include a `connections` array
        // so the server can create pivot rows during master flight creation.
        if (form.data.journey_type === 'connecting') {
            const depId = form.data.connecting_departure_id;
            if (depId) {
                submitData.connections = [
                    {
                        departure_flight_id: depId,
                        minimum_connecting_time: form.data.minimum_connecting_time || null,
                    },
                ];
            }
            // Clean up local-only fields
            delete submitData.journey_type;
            delete submitData.connecting_departure_id;
            delete submitData.minimum_connecting_time;
        }

        // Timezone handling for global system:
        // datetime-local inputs are in the user's browser timezone, but we need to convert
        // them to the airport's timezone before sending to server, which will convert to UTC.
        const origin = (options.airports || []).find((a: any) => a.iata_code === submitData.origin_code);
        const destination = (options.airports || []).find((a: any) => a.iata_code === submitData.destination_code);
        const shared = page.props as any;
        const userTz = shared.user_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        
        // Set timezone for departure - prefer airport timezone, fallback to user timezone
        if (origin && origin.timezone) {
            submitData.departure_tz = origin.timezone;
        } else {
            submitData.departure_tz = userTz;
        }

        // Set timezone for arrival - prefer airport timezone, fallback to user timezone
        if (destination && destination.timezone) {
            submitData.arrival_tz = destination.timezone;
        } else {
            submitData.arrival_tz = userTz;
        }

        // datetime-local inputs are interpreted in the user's browser timezone.
        // We send the raw value and the timezone info, and the backend will convert to UTC.

        // If editing (initialData has an id) use PUT to update the flight; otherwise POST to create.
        if (initialData && initialData.id) {
            router.put(`/flights/management/${initialData.id}`, submitData, {
                preserveState: true,
                preserveScroll: true,
                onStart: () => {
                    // Ensure form is marked as processing
                    try {
                        (form as any).processing = true;
                    } catch (e) {
                        // no-op
                    }
                },
                onSuccess: () => {
                    setServerError(null);
                    onOpenChange(false);
                    (form as any).reset();
                },
                onError: (errors: any) => {
                    try {
                        // Inertia's useForm automatically handles errors, but we'll set them explicitly
                        if (errors && typeof errors === 'object') {
                            (form as any).setErrors(errors);
                        }
                    } catch (e) {
                        // Silently handle error setting
                    }
                    
                    // If there were no validation errors returned (empty / falsy), show
                    // a generic server error banner so the user knows something went wrong.
                    if (!errors || Object.keys(errors).length === 0) {
                        setServerError('An error occurred while updating the flight. Please try again.');
                    }
                },
                onFinish: () => {
                    // Ensure processing state is cleared
                    try {
                        (form as any).processing = false;
                    } catch (e) {
                        // no-op
                    }
                },
            });
        } else {
            // Client-side validation: ensure arrival time is after departure time
            if (submitData.scheduled_departure_time && submitData.scheduled_arrival_time) {
                const depTime = new Date(submitData.scheduled_departure_time).getTime();
                const arrTime = new Date(submitData.scheduled_arrival_time).getTime();
                if (arrTime <= depTime) {
                    // Set error and prevent submission
                    try {
                        (form as any).setErrors({
                            scheduled_arrival_time: 'The scheduled arrival time must be after the scheduled departure time.'
                        });
                    } catch (e) {
                        // no-op
                    }
                    setServerError('Please ensure the arrival time is after the departure time.');
                    return; // Stop submission
                }
            }

            // Clear any previous errors before submitting
            try {
                (form as any).setErrors({});
                setServerError(null);
            } catch (e) {
                // no-op
            }

            router.post('/flights/management', submitData, {
                preserveState: true,
                preserveScroll: true,
                onStart: () => {
                    // Ensure form is marked as processing
                    try {
                        (form as any).processing = true;
                    } catch (e) {
                        // no-op
                    }
                },
                onSuccess: () => {
                    setServerError(null);
                    onOpenChange(false);
                    (form as any).reset();
                },
                onError: (errors: any) => {
                    try {
                        // Inertia's useForm automatically handles errors, but we'll set them explicitly
                        if (errors && typeof errors === 'object') {
                            (form as any).setErrors(errors);
                        }
                    } catch (e) {
                        // Silently handle error setting
                    }
                    
                    if (!errors || Object.keys(errors).length === 0) {
                        setServerError('An error occurred while creating the flight. Please try again.');
                    }
                },
                onFinish: () => {
                    // Ensure processing state is cleared
                    try {
                        (form as any).processing = false;
                    } catch (e) {
                        // no-op
                    }
                },
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            // Prevent closing during form submission
            if (!form.processing) {
                onOpenChange(isOpen);
            }
        }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto relative">
                {form.processing && (
                    <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg pointer-events-auto">
                        <div className="flex flex-col items-center gap-3">
                            <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                            <p className="text-sm font-medium">{initialData?.id ? 'Updating flight...' : 'Creating flight...'}</p>
                        </div>
                    </div>
                )}
                    <DialogHeader>
                        <DialogTitle>{initialData?.id ? 'Edit Flight' : 'Create New Flight'}</DialogTitle>
                        <DialogDescription>
                            {initialData?.id ? 'Update flight details' : 'Add a new flight to the FIS system.'}
                        </DialogDescription>
                        {/* Validation errors display */}
                        {Object.keys((form as any).errors || {}).length > 0 && (
                            <div className="mt-2 p-3 bg-destructive/10 text-destructive text-sm rounded border border-destructive/20">
                                <div className="font-medium mb-2">Please correct the following errors:</div>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    {Object.entries((form as any).errors || {}).map(([field, message]: [string, any]) => (
                                        <li key={field}>
                                            <span className="font-medium">{field}:</span> {Array.isArray(message) ? message[0] : message}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Non-validation server/network error banner (dismissible) */}
                        {serverError && (
                            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm rounded border border-yellow-200 dark:border-yellow-800 flex justify-between items-start">
                                <div className="pr-4">{serverError}</div>
                                <button 
                                    type="button" 
                                    aria-label="Dismiss server error" 
                                    className="text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 text-xs font-medium" 
                                    onClick={() => setServerError(null)}
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}
                    </DialogHeader>
                <form onSubmit={submit}>
                    <FlightForm form={form} options={options} initialData={initialData} />

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={form.processing}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing} className="min-w-[120px]">
                            {form.processing ? (
                                <span className="inline-flex items-center justify-center">
                                    <svg className="animate-spin mr-2 h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                    </svg>
                                    {initialData?.id ? 'Updating…' : 'Creating…'}
                                </span>
                            ) : (
                                <>{initialData?.id ? 'Update' : 'Create'}</>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
