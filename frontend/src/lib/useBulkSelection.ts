'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks a Set of selected row ids for a bulk-action toolbar. `resetKey` should change whenever
 * the caller's filtered/visible list changes (e.g. a joined string of the active filter values)
 * — clearing the selection whenever it changes prevents a bulk action from silently acting on
 * ids that are no longer visible on screen after the admin adjusts a filter.
 */
export function useBulkSelection(resetKey: string | number) {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        Promise.resolve().then(() => setSelectedIds(new Set()));
    }, [resetKey]);

    const toggleSelect = (id: number) => setSelectedIds((prev) => {
        const s = new Set(prev);
        s.has(id) ? s.delete(id) : s.add(id);
        return s;
    });

    const toggleSelectAll = (ids: number[]) => setSelectedIds((prev) =>
        prev.size === ids.length && ids.every((id) => prev.has(id)) ? new Set() : new Set(ids)
    );

    const clear = () => setSelectedIds(new Set());

    return { selectedIds, toggleSelect, toggleSelectAll, clear };
}
