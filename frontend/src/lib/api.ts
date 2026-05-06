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
        // Fetching all categories for navigation
        const res = await fetch(`${BASE_URL}/categories`, { next: { revalidate: 3600 } });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error("Backend communication failed for categories.");
        return [];
    }
}