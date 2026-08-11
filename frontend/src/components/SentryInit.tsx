'use client';

import { useEffect } from 'react';
import { initSentry } from '@/lib/sentry';

/** Renders nothing — just kicks off Sentry.init() once mounted (browser-only, never during static-export prerendering). */
export default function SentryInit() {
    useEffect(() => {
        initSentry();
    }, []);

    return null;
}
