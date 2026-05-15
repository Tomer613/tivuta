/**
 * API communication layer.
 * Hardened for static build export (GitHub Actions compatible).
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Fallback data for build-time when backend is unreachable
const MOCK_CATEGORIES = [
    { id: 1, slug: 'judaism', name_he: 'יהדות', name_en: 'Judaism', name_fr: 'Judaïsme', name_yi: 'יהדות' },
    { id: 2, slug: 'dining', name_he: 'מסעדות', name_en: 'Dining', name_fr: 'Restauration', name_yi: 'רעסטוראנטן' },
    { id: 3, slug: 'fashion', name_he: 'ביגוד והנעלה', name_en: 'Fashion', name_fr: 'Mode', name_yi: 'קליידער' },
    { id: 4, slug: 'groceries', name_he: 'מזון', name_en: 'Groceries', name_fr: 'Alimentation', name_yi: 'עסנווארג' },
    { id: 5, slug: 'travel_attractions', name_he: 'נופשים ואטרקציות', name_en: 'Travel & Attractions', name_fr: 'Voyage', name_yi: 'טוריזם' },
    { id: 6, slug: 'electronics', name_he: 'חשמל ואלקטרוניקה', name_en: 'Electronics', name_fr: 'Électronique', name_yi: 'עלעקטראניק' },
    { id: 7, slug: 'health_beauty', name_he: 'בריאות וטיפוח', name_en: 'Health & Beauty', name_fr: 'Santé', name_yi: 'געזונטהייט' },
    { id: 8, slug: 'events', name_he: 'אירועים', name_en: 'Events', name_fr: 'Événements', name_yi: 'שמחות' },
    { id: 9, slug: 'real_estate_auto', name_he: 'נדל"ן ורכב', name_en: 'Real Estate & Auto', name_fr: 'Immobilier', name_yi: 'נדל"ן' },
    { id: 10, slug: 'family', name_he: 'למשפחה', name_en: 'Family', name_fr: 'Famille', name_yi: 'משפחה' },
    { id: 11, slug: 'finance', name_he: 'פיננסים', name_en: 'Finance', name_fr: 'Finance', name_yi: 'פינאנצן' },
    { id: 12, slug: 'home_renovation', name_he: 'עולם הבניה והשיפוץ', name_en: 'Construction & Home', name_fr: 'Construction', name_yi: 'בויען' }
];

const MOCK_ITEMS = [
    { id: 1, title_he: 'סט תפילין מהודר', description_he: 'סט תפילין באיכות הגבוהה ביותר, כולל בדיקת מוגה ממוחשבת וידנית.', image_url: 'tefillin.webp', price: 2800, cat_id_new: 1 },
    { id: 2, title_he: 'ארוחת טעימות יוקרתית', description_he: 'חוויה קולינרית בלתי נשכחת בכשרות המהודרת ביותר.', image_url: 'chef_restaurant.webp', price: 280, cat_id_new: 2 },
    { id: 3, title_he: 'חליפת צמר איטלקית פרימיום', description_he: 'חליפה יוקרתית בעיצוב קלאסי למראה מכובד.', image_url: 'mens_suit.webp', price: 1400, cat_id_new: 3 },
    { id: 4, title_he: 'מארז יינות פרימיום לחג', description_he: 'מבחר יינות מהיקבים המובילים בכשרות מהדרין.', image_url: 'wine_bottles.webp', price: 320, cat_id_new: 4 },
    { id: 5, title_he: 'נופש משפחתי בכינרת', description_he: 'צימרים מפוארים עם בריכה נפרדת וארוחות כשרות.', image_url: 'kosher_hotel.webp', price: 950, cat_id_new: 5 },
    { id: 6, title_he: 'סמארטפון מסונן TIVUTA Safe', description_he: 'המכשיר המתקדם ביותר עם סינון הרמטי ללא פשרות.', image_url: 'filtered_phone.webp', price: 1200, cat_id_new: 6 },
    { id: 7, title_he: 'מנוי שנתי - מועדון הכוח', description_he: 'שעות נפרדות לנשים וגברים בסביבה תומכת ומקצועית.', image_url: 'finance_hero.webp', price: 1800, cat_id_new: 7 },
    { id: 8, title_he: 'שמלת כלה צנועה ומפוארת', description_he: 'עיצוב אישי וליווי צמוד ליום החשוב בחייך.', image_url: 'wedding_dress.webp', price: 4500, cat_id_new: 8 },
    { id: 9, title_he: 'טויוטה סיאנה 2026 - 8 מקומות', description_he: 'הרכב האידיאלי למשפחה החרדית בתנאי מימון נוחים.', image_url: 'auto_deal.webp', price: 240000, cat_id_new: 9 },
    { id: 10, title_he: 'דירת 4 חדרים בבית שמש', description_he: 'פרויקט מגורים איכותי בלב קהילה תוססת ומתפתחת.', image_url: 'jerusalem_apartment.webp', price: 2100000, cat_id_new: 9 },
    { id: 11, title_he: 'תכנון מטבח מהדרין מודרני', description_he: 'עיצוב מטבח חכם עם הפרדה מלאה וניצול שטח מקסימלי.', image_url: 'kosher_kitchen.webp', price: 2500, cat_id_new: 12 }
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

export async function getAllItems() {
    try {
        const res = await fetch(`${BASE_URL}/items`, { next: { revalidate: 3600 } });
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