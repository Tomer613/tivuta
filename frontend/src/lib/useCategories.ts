'use client';

import { useEffect, useState } from 'react';
import { getProductCategories, ProductCategory } from '@/lib/api';

// Keyed per-vertical — unlike verticals (a flat global list), a category is meaningless without
// a vertical scope, so each vertical gets its own cached fetch.
const categoriesCache = new Map<string, Promise<ProductCategory[]>>();
function fetchCategoriesOnce(vertical: string): Promise<ProductCategory[]> {
    if (!categoriesCache.has(vertical)) {
        categoriesCache.set(vertical, getProductCategories(vertical));
    }
    return categoriesCache.get(vertical)!;
}

export function useCategories(vertical: string | null | undefined): ProductCategory[] {
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    useEffect(() => {
        let alive = true;
        Promise.resolve(vertical ? fetchCategoriesOnce(vertical) : [])
            .then((c) => { if (alive) setCategories(c); });
        return () => { alive = false; };
    }, [vertical]);
    return categories;
}
