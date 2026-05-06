/**
 * API communication layer.
 * Using static local addresses to ensure stability.
 */

const BASE_URL = "http://127.0.0.1:8000";

export async function getTrendingItems() {
    try {
        // Fetching trending items for the homepage showcase
        const res = await fetch(`${BASE_URL}/trending`, { cache: 'no-store' });

        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error("Backend communication failed for trending items.");
        return [];
    }
}

export async function getCategories() {
    try {
        const res = await fetch(`${BASE_URL}/categories`, { cache: 'no-store' });

        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error("Backend communication failed for categories.");
        return [];
    }
}

export async function getCategoryBySlug(slug: string) {
    try {
        const res = await fetch(`${BASE_URL}/categories/${slug}`, { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error(`Backend communication failed for category: ${slug}`);
        return null;
    }
}

export async function getCategoryItems(slug: string) {
    try {
        const res = await fetch(`${BASE_URL}/categories/${slug}/items`, { cache: 'no-store' });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error(`Backend communication failed for items in category: ${slug}`);
        return [];
    }
}