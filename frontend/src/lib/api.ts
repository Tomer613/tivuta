/**
 * API communication layer.
 * Hardened for static build export (GitHub Actions compatible).
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Fallback data for build-time when backend is unreachable
const MOCK_CATEGORIES = [
    { id: 1, slug: 'judaism', name_he: 'יהדות' },
    { id: 2, slug: 'dining', name_he: 'קולינריה' },
    { id: 3, slug: 'fashion', name_he: 'אופנה' },
    { id: 4, slug: 'groceries', name_he: 'צרכנות' },
    { id: 5, slug: 'travel_attractions', name_he: 'תיירות' },
    { id: 6, slug: 'electronics', name_he: 'חשמל' }
];

const MOCK_ITEMS = [
    { id: 1, title_he: 'הטבה לדוגמה', description_he: 'פרטי הטבה סטטיים לזמן בנייה', cat_id_new: 1 }
];

export async function getTrendingItems() {
    try {
        const res = await fetch(`${BASE_URL}/trending`, { next: { revalidate: 3600 } });
        if (!res.ok) return MOCK_ITEMS;
        return await res.json();
    } catch (e) {
        console.warn("Backend unreachable during build, using mock items.");
        return MOCK_ITEMS;
    }
}

export async function getCategories() {
    try {
        const res = await fetch(`${BASE_URL}/categories`, { next: { revalidate: 3600 } });
        if (!res.ok) return MOCK_CATEGORIES;
        return await res.json();
    } catch (e) {
        console.warn("Backend unreachable during build, using mock categories.");
        return MOCK_CATEGORIES;
    }
}

export async function getCategoryBySlug(slug: string) {
    try {
        const res = await fetch(`${BASE_URL}/categories/${slug}`, { next: { revalidate: 3600 } });
        if (!res.ok) return MOCK_CATEGORIES.find(c => c.slug === slug) || null;
        return await res.json();
    } catch (e) {
        return MOCK_CATEGORIES.find(c => c.slug === slug) || null;
    }
}

export async function getCategoryItems(slug: string) {
    try {
        const res = await fetch(`${BASE_URL}/categories/${slug}/items`, { next: { revalidate: 3600 } });
        if (!res.ok) return MOCK_ITEMS;
        return await res.json();
    } catch (e) {
        return MOCK_ITEMS;
    }
}