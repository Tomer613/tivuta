'use client';

import { useCallback, useEffect, useState } from 'react';

export interface CountdownParts {
    d: number;
    h: number;
    m: number;
    s: number;
}

// Backend timestamps are naive-UTC (no timezone designator, e.g. "2026-08-13T12:35:46") — JS's
// Date parses that as local time, not UTC, so a numeric comparison against Date.now() (a true
// UTC instant) would be silently offset by the browser's local timezone. Same fix already
// established in admin/users/page.tsx's isLocked().
function toUtcIso(value: string): string {
    return /[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`;
}

/** Ticks every second until `endDate` (any backend timestamp, naive or with an explicit
 * timezone), returning the remaining time broken into parts, or null once it has passed. */
export function useCountdown(endDate: string | null | undefined): CountdownParts | null {
    const calc = useCallback(() => {
        if (!endDate) return null;
        const diff = new Date(toUtcIso(endDate)).getTime() - Date.now();
        if (diff <= 0) return null;
        return {
            d: Math.floor(diff / 86400000),
            h: Math.floor((diff % 86400000) / 3600000),
            m: Math.floor((diff % 3600000) / 60000),
            s: Math.floor((diff % 60000) / 1000),
        };
    }, [endDate]);
    const [remaining, setRemaining] = useState(calc);
    useEffect(() => {
        if (!endDate) return;
        const id = setInterval(() => setRemaining(calc()), 1000);
        return () => clearInterval(id);
    }, [endDate, calc]);
    return remaining;
}
