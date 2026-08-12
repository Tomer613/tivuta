'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams, useParams } from 'next/navigation';
import { trackPageview } from '@/lib/api';
import { getOrCreateVisitorId } from '@/lib/visitorId';

/** Renders nothing — fires a fire-and-forget pageview on mount and on every client-side route
 * change (there's no server-side request log to instrument under `output: 'export'`, so every
 * pageview is necessarily a client-side event). */
export default function PageviewTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const params = useParams();
    const locale = (params?.locale as string) || 'he';

    useEffect(() => {
        const query = searchParams?.toString();
        const path = query ? `${pathname}?${query}` : pathname;
        trackPageview(path, locale, getOrCreateVisitorId(), document.referrer);
    }, [pathname, searchParams, locale]);

    return null;
}
