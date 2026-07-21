'use client';

import { useEffect, useState } from 'react';
import { getVerticals, Vertical } from '@/lib/api';

let verticalsCache: Promise<Vertical[]> | null = null;
function fetchVerticalsOnce(): Promise<Vertical[]> {
    if (!verticalsCache) verticalsCache = getVerticals();
    return verticalsCache;
}

export function useVerticals(): Vertical[] {
    const [verticals, setVerticals] = useState<Vertical[]>([]);
    useEffect(() => {
        let alive = true;
        fetchVerticalsOnce().then((v) => { if (alive) setVerticals(v); });
        return () => { alive = false; };
    }, []);
    return verticals;
}

/** Flattens every vertical's attribute_fields into a single { [key]: { he, en, fr, yi } }
 *  lookup — replaces the ATTR_LABELS dict that used to be duplicated in ProductTile and
 *  ComparisonBar. */
export function useAttrLabels(): Record<string, Record<string, string>> {
    const verticals = useVerticals();
    const labels: Record<string, Record<string, string>> = {};
    for (const v of verticals) {
        for (const f of v.attribute_fields || []) {
            labels[f.key] = {
                he: f.label_he,
                en: f.label_en || f.label_he,
                fr: f.label_fr || f.label_he,
                yi: f.label_yi || f.label_he,
            };
        }
    }
    return labels;
}
