/**
 * API communication layer.
 * Hardened for static build export (GitHub Actions compatible).
 */

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
        if (!res.ok) return MOCK_ITEMS.map((item, idx) => ({ ...item, is_featured: idx % 2 === 0, is_monthly: idx % 2 === 0 }));
        return await res.json();
    } catch (e) {
        console.warn("Backend unreachable during build, using mock items.");
        return MOCK_ITEMS.map((item, idx) => ({ ...item, is_featured: idx % 2 === 0, is_monthly: idx % 2 === 0 }));
    }
}

export async function getMonthlyItems() {
    try {
        const res = await fetch(`${BASE_URL}/items`, { next: { revalidate: 0 } });
        if (!res.ok) return MOCK_ITEMS.map((item, idx) => ({ ...item, is_featured: idx % 2 === 0, is_monthly: idx % 2 === 0 })).filter(i => i.is_monthly);
        const all = await res.json();
        return all.filter((i: any) => i.is_monthly);
    } catch (e) {
        console.warn("Backend unreachable, using mock items.");
        return MOCK_ITEMS.map((item, idx) => ({ ...item, is_featured: idx % 2 === 0, is_monthly: idx % 2 === 0 })).filter(i => i.is_monthly);
    }
}

export async function getAllItems() {
    try {
        const res = await fetch(`${BASE_URL}/items`, { next: { revalidate: 0 } });
        if (!res.ok) return MOCK_ITEMS.map((item, idx) => ({ ...item, is_featured: idx % 2 === 0, is_monthly: idx % 2 === 0 }));
        return await res.json();
    } catch (e) {
        console.warn("Backend unreachable during build, using mock items.");
        return MOCK_ITEMS.map((item, idx) => ({ ...item, is_featured: idx % 2 === 0, is_monthly: idx % 2 === 0 }));
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

/**
 * New multi-vertical site API (diamonds/cars/insurance).
 * Reads (products/surveys) are public at the API level - same pattern as the
 * legacy /benefits catalog - so static export can pre-render dynamic routes
 * at build time. Writes (leads, votes, admin) always require a token.
 */

type MaybeToken = string | null | undefined;

function authHeaders(token?: MaybeToken): Record<string, string> {
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getProducts(token: MaybeToken, vertical: string, sort?: string, promotionType?: string | null) {
    const params = new URLSearchParams({ vertical });
    if (sort) params.set('sort', sort);
    if (promotionType) params.set('promotion_type', promotionType);
    const res = await fetch(`${BASE_URL}/products?${params.toString()}`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load products');
    return res.json();
}

export async function getProduct(token: MaybeToken, id: number) {
    const res = await fetch(`${BASE_URL}/products/${id}`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load product');
    return res.json();
}

export async function getAllProductIds(): Promise<{ id: number }[]> {
    try {
        const res = await fetch(`${BASE_URL}/products`, { next: { revalidate: 0 } });
        if (!res.ok) return [{ id: 1 }];
        const data = await res.json();
        return data.length > 0 ? data.map((p: any) => ({ id: p.id })) : [{ id: 1 }];
    } catch {
        return [{ id: 1 }];
    }
}

export async function getPromotionStatus(token: string, promotionId: number) {
    const res = await fetch(`${BASE_URL}/promotions/${promotionId}/status`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load promotion status');
    return res.json();
}

export async function enterPromotion(token: string, promotionId: number, productId: number) {
    const res = await fetch(`${BASE_URL}/promotions/${promotionId}/enter?product_id=${productId}`, {
        method: 'POST',
        headers: authHeaders(token),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to enter promotion');
    }
    return res.json();
}

// output:'export' requires at least one entry per dynamic segment at build time,
// so we always fall back to a placeholder id - the real content is fetched
// client-side at runtime anyway (same pattern as items/[id]).
const FALLBACK_SURVEY_IDS = [{ id: 1 }];

export async function getAllSurveysStatic() {
    try {
        const res = await fetch(`${BASE_URL}/surveys`, { next: { revalidate: 0 } });
        if (!res.ok) return FALLBACK_SURVEY_IDS;
        const data = await res.json();
        return data.length > 0 ? data : FALLBACK_SURVEY_IDS;
    } catch (e) {
        console.warn('Backend unreachable during build, using a placeholder survey id.');
        return FALLBACK_SURVEY_IDS;
    }
}

export async function createLead(token: string, payload: { product_id: number; scheduled_at?: string | null; locale?: string }) {
    const res = await fetch(`${BASE_URL}/leads`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to submit request');
    return res.json();
}

export async function forgotPassword(email: string, locale: string) {
    const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
    });
    return res.ok;
}

export async function resetPassword(token: string, new_password: string) {
    const res = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to reset password');
    }
    return res.json();
}

export async function getSurveys(token?: MaybeToken) {
    const res = await fetch(`${BASE_URL}/surveys`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load surveys');
    return res.json();
}

export async function getSurvey(token: MaybeToken, id: number) {
    const res = await fetch(`${BASE_URL}/surveys/${id}`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load survey');
    return res.json();
}

export async function voteSurvey(token: string, surveyId: number, surveyOptionId: number) {
    const res = await fetch(`${BASE_URL}/surveys/${surveyId}/vote`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ survey_option_id: surveyOptionId }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to vote');
    }
    return res.json();
}

/** Admin endpoints */

export async function adminListUsers(token: string) {
    const res = await fetch(`${BASE_URL}/admin/users`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load users');
    return res.json();
}

export async function adminCreateUser(token: string, payload: any) {
    const res = await fetch(`${BASE_URL}/admin/users`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create user');
    }
    return res.json();
}

export async function adminSetUserRole(token: string, userId: number, role: string) {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error('Failed to set role');
    return res.json();
}

export async function adminListProducts(token: string) {
    const verticals = ['diamonds', 'cars', 'insurance'];
    const results = await Promise.all(verticals.map((v) => getProducts(token, v)));
    return results.flat();
}

export async function adminCreateProduct(token: string, payload: any) {
    const res = await fetch(`${BASE_URL}/admin/products`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create product');
    }
    return res.json();
}

export async function adminUpdateProduct(token: string, id: number, payload: any) {
    const res = await fetch(`${BASE_URL}/admin/products/${id}`, {
        method: 'PUT',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update product');
    return res.json();
}

export async function adminDeleteProduct(token: string, id: number) {
    const res = await fetch(`${BASE_URL}/admin/products/${id}`, {
        method: 'DELETE',
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to delete product');
    return res.json();
}

export async function adminListLeads(token: string) {
    const res = await fetch(`${BASE_URL}/admin/leads`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load leads');
    return res.json();
}

export async function adminCreateSurvey(token: string, payload: any) {
    const res = await fetch(`${BASE_URL}/admin/surveys`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create survey');
    }
    return res.json();
}

export async function adminListDistributions(token: string) {
    const res = await fetch(`${BASE_URL}/admin/distributions`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load distributions');
    return res.json();
}

export async function adminCreateDistribution(token: string, payload: any) {
    const res = await fetch(`${BASE_URL}/admin/distributions`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create distribution');
    }
    return res.json();
}

export async function adminSendDistribution(token: string, id: number) {
    const res = await fetch(`${BASE_URL}/admin/distributions/${id}/send`, {
        method: 'POST',
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to send distribution');
    return res.json();
}

/** Promotions admin endpoints */

export async function adminListPromotions(token: string, isActive?: boolean) {
    const params = isActive !== undefined ? `?is_active=${isActive}` : '';
    const res = await fetch(`${BASE_URL}/admin/promotions${params}`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load promotions');
    return res.json();
}

export async function adminCreatePromotion(token: string, payload: any) {
    const res = await fetch(`${BASE_URL}/admin/promotions`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create promotion');
    }
    return res.json();
}

export async function adminUpdatePromotion(token: string, id: number, payload: any) {
    const res = await fetch(`${BASE_URL}/admin/promotions/${id}`, {
        method: 'PUT',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update promotion');
    return res.json();
}

export async function adminDeactivatePromotion(token: string, id: number) {
    const res = await fetch(`${BASE_URL}/admin/promotions/${id}`, {
        method: 'DELETE',
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to deactivate promotion');
    return res.json();
}

export async function adminGetPromotionProducts(token: string, id: number) {
    const res = await fetch(`${BASE_URL}/admin/promotions/${id}/products`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load promotion products');
    return res.json();
}

export async function adminAssignProducts(token: string, id: number, product_ids: number[]) {
    const res = await fetch(`${BASE_URL}/admin/promotions/${id}/products`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids }),
    });
    if (!res.ok) throw new Error('Failed to assign products');
    return res.json();
}

export async function adminRemoveProductFromPromotion(token: string, promotionId: number, productId: number) {
    const res = await fetch(`${BASE_URL}/admin/promotions/${promotionId}/products/${productId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to remove product from promotion');
    return res.json();
}

export async function adminDrawPromotion(token: string, promotionId: number) {
    const res = await fetch(`${BASE_URL}/admin/promotions/${promotionId}/draw`, {
        method: 'POST',
        headers: authHeaders(token),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to draw promotion');
    }
    return res.json();
}