import { usePage } from '@inertiajs/react';

export function can(permission: string): boolean {
    // Be defensive: Inertia PageProps may not include `auth` in all pages.
    const props = usePage().props as unknown as { auth?: { permissions?: string[] } };
    const auth = props.auth ?? { permissions: [] };

    return (auth.permissions || []).includes(permission);
}