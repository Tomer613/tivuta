/**
 * API communication layer.
 * Hardened for static build export (GitHub Actions compatible).
 */

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const STATIC_BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Returns the URL for a product image. In prod this is a full Supabase Storage URL already
 *  (stored as-is in image_url); the backend-relative form is a local-dev fallback. */
export function productImageUrl(filename: string | null | undefined): string {
    if (!filename) return `${STATIC_BASE}/images/products/placeholder.jpg`;
    if (filename.startsWith("http://") || filename.startsWith("https://")) return filename;
    return `${BASE_URL}/images/products/${filename}`;
}

/** Matches the snapshot shape written to localStorage['tivuta_recent_v2'] by ProductDetailClient/
 *  ProductTile on product-view — a narrow subset of Product, not the full read model. */
export interface RecentlyViewedProduct {
    id: number;
    title_he: string;
    image_url?: string | null;
    price?: number | null;
    vertical: string;
}

export interface VendorDayAvailability {
    enabled: boolean;
    start?: string | null;
    end?: string | null;
}

export interface VendorAvailability {
    weekly: Record<string, VendorDayAvailability>;
    slot_minutes: number;
}

export interface Vendor {
    id: number;
    vendor_code: string;
    vertical: string;
    name_he: string;
    name_en?: string | null;
    name_fr?: string | null;
    name_yi?: string | null;
    specialty?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    login_email?: string | null;
    locked_until?: string | null;
    is_active: boolean;
    availability?: VendorAvailability | null;
    commission_rate_percent?: number;
    points_rate_percent?: number | null;
    commission_owed_total?: number;
}

/** Derives a vendor's stable display code from just its id (e.g. 7 -> "007"), for contexts that
 *  only have a bare vendor_id (like a CustomerOrderLine) and no full Vendor object. */
export function vendorCode(vendorId: number): string {
    return String(vendorId).padStart(3, '0');
}

export async function adminListVendors(token: string, vertical?: string): Promise<Vendor[]> {
    const qs = vertical ? `?vertical=${encodeURIComponent(vertical)}` : '';
    const res = await fetch(`${BASE_URL}/admin/vendors${qs}`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load vendors');
    return res.json();
}

export async function adminCreateVendor(token: string, payload: Record<string, unknown>): Promise<Vendor> {
    const res = await fetch(`${BASE_URL}/admin/vendors`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create vendor');
    }
    return res.json();
}

export async function adminUpdateVendor(token: string, id: number, payload: Record<string, unknown>): Promise<Vendor> {
    const res = await fetch(`${BASE_URL}/admin/vendors/${id}`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update vendor');
    }
    return res.json();
}

export async function adminDeleteVendor(token: string, id: number) {
    const res = await fetch(`${BASE_URL}/admin/vendors/${id}`, {
        method: 'DELETE',
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to delete vendor');
    return res.json();
}

export async function adminSetVendorPortalAccess(token: string, id: number, loginEmail: string, password?: string, locale?: string): Promise<Vendor> {
    const res = await fetch(`${BASE_URL}/admin/vendors/${id}/portal-access`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_email: loginEmail, password: password || null, locale: locale || 'he' }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to set vendor portal access');
    }
    return res.json();
}

export async function adminUnlockVendor(token: string, vendorId: number): Promise<Vendor> {
    const res = await fetch(`${BASE_URL}/admin/vendors/${vendorId}/unlock`, {
        method: 'PATCH',
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to unlock vendor');
    return res.json();
}

export async function adminListSettlements(token: string, vendorId: number): Promise<CommissionSettlementPeriod[]> {
    const res = await fetch(`${BASE_URL}/admin/vendors/${vendorId}/settlements`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load settlements');
    return res.json();
}

export async function adminOpenSettlementPeriod(token: string, vendorId: number, periodStart: string, periodEnd: string): Promise<CommissionSettlementPeriod> {
    const res = await fetch(`${BASE_URL}/admin/vendors/${vendorId}/settlements`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to open settlement period');
    }
    return res.json();
}

export async function adminSettlePeriod(token: string, vendorId: number, periodId: number, note?: string): Promise<CommissionSettlementPeriod> {
    const res = await fetch(`${BASE_URL}/admin/vendors/${vendorId}/settlements/${periodId}/settle`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note || null }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to settle period');
    }
    return res.json();
}

export interface VendorPurchaseBatchLine {
    id: number;
    product_id?: number | null;
    product_title_he?: string | null;
    quantity?: number | null;
    status: string;
    customer_order_id?: number | null;
    order_number?: string | null;
    user_name?: string | null;
    user_email?: string | null;
    user_phone?: string | null;
}

export interface VendorPurchaseBatch {
    id: number;
    batch_number: string;
    vendor_id: number;
    status: string;
    notes?: string | null;
    created_at: string;
    ordered_at?: string | null;
    received_at?: string | null;
    items: VendorPurchaseBatchLine[];
}

export async function adminListVendorBatches(token: string, vendorId: number): Promise<VendorPurchaseBatch[]> {
    const res = await fetch(`${BASE_URL}/admin/vendors/${vendorId}/purchase-batches`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load purchase batches');
    return res.json();
}

/** Returns null (not an error) if none of the selected leads were actually claimable — e.g.
 *  another request already claimed them a moment ago. Only a real request failure throws. */
export async function adminCreateVendorBatch(token: string, vendorId: number, leadIds: number[]): Promise<VendorPurchaseBatch | null> {
    const res = await fetch(`${BASE_URL}/admin/vendors/${vendorId}/purchase-batches`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: leadIds }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to open purchase batch');
    }
    return res.json();
}

export async function adminUpdateVendorBatchStatus(token: string, vendorId: number, batchId: number, status: string): Promise<VendorPurchaseBatch> {
    const res = await fetch(`${BASE_URL}/admin/vendors/${vendorId}/purchase-batches/${batchId}/status`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update batch status');
    }
    return res.json();
}

// ── Loyalty program: system settings, sale review, fraud monitoring ─────────

export interface SystemSetting {
    key: string;
    value: string;
}

export async function adminListSettings(token: string): Promise<SystemSetting[]> {
    const res = await fetch(`${BASE_URL}/admin/settings`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load settings');
    return res.json();
}

export async function adminUpdateSettings(token: string, settings: Record<string, string>): Promise<SystemSetting[]> {
    const res = await fetch(`${BASE_URL}/admin/settings`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update settings');
    }
    return res.json();
}

export async function adminListSales(token: string, opts?: { vendorId?: number; status?: string }): Promise<SaleTransaction[]> {
    const params = new URLSearchParams();
    if (opts?.vendorId) params.set('vendor_id', String(opts.vendorId));
    if (opts?.status) params.set('status', opts.status);
    const qs = params.toString();
    const res = await fetch(`${BASE_URL}/admin/sales${qs ? `?${qs}` : ''}`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load sales');
    return res.json();
}

export async function adminCreateSale(
    token: string,
    payload: { vendor_id: number; customer_number: string; amount_ils: number; product_id?: number | null; idempotency_key: string }
): Promise<SaleTransaction> {
    const res = await fetch(`${BASE_URL}/admin/sales`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to record sale');
    }
    return res.json();
}

export async function adminReviewSale(token: string, saleId: number, action: 'confirm' | 'reverse', note?: string): Promise<SaleTransaction> {
    const res = await fetch(`${BASE_URL}/admin/sales/${saleId}/review`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: note || null }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to review sale');
    }
    return res.json();
}

export interface VendorAtRisk {
    vendor_id: number;
    name_he: string;
    commission_owed_total: number;
    oldest_unsettled_days: number | null;
    over_threshold: boolean;
}

export async function adminListAtRiskVendors(token: string): Promise<VendorAtRisk[]> {
    const res = await fetch(`${BASE_URL}/admin/vendors/at-risk`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load at-risk vendors');
    return res.json();
}

export async function adminCheckUnsettledDeactivation(token: string): Promise<{ checked: number; deactivated: { vendor_id: number; name_he: string }[] }> {
    const res = await fetch(`${BASE_URL}/admin/vendors/check-unsettled-deactivation`, {
        method: 'POST',
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to run deactivation check');
    return res.json();
}

// ── Loyalty program: vendor self-service portal ─────────────────────────────

export interface VendorMe {
    id: number;
    vertical: string;
    name_he: string;
    commission_rate_percent: number;
    points_rate_percent: number | null;
    commission_owed_total: number;
}

export interface SaleTransaction {
    id: number;
    vendor_id: number;
    vendor_name_he?: string | null;
    customer_id: number;
    customer_name?: string | null;
    product_id?: number | null;
    product_title_he?: string | null;
    amount_ils: number;
    points_awarded: number;
    commission_rate_percent_snapshot: number;
    commission_owed_ils: number;
    status: string;
    reported_at: string;
    confirmed_at?: string | null;
}

export interface CommissionSettlementPeriod {
    id: number;
    vendor_id: number;
    period_start: string;
    period_end: string;
    total_amount_ils: number;
    status: string;
    settled_at?: string | null;
    note?: string | null;
}

// Thrown instead of a plain Error when a 423 response carries a locked_until timestamp, so a
// caller can render a live countdown instead of just the static message string.
export class LockedAccountError extends Error {
    lockedUntil: string;
    constructor(message: string, lockedUntil: string) {
        super(message);
        this.lockedUntil = lockedUntil;
    }
}

export async function vendorLogin(loginEmail: string, password: string): Promise<{ access_token: string; token_type: string }> {
    const formData = new URLSearchParams();
    formData.set('username', loginEmail);
    formData.set('password', password);
    const res = await fetch(`${BASE_URL}/vendor-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 423 && err.locked_until) {
            throw new LockedAccountError(err.detail || 'Login failed', err.locked_until);
        }
        throw new Error(err.detail || 'Login failed');
    }
    return res.json();
}

export async function vendorGetMe(token: string): Promise<VendorMe> {
    const res = await fetch(`${BASE_URL}/vendor/me`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load vendor profile');
    return res.json();
}

export async function vendorListSales(token: string): Promise<SaleTransaction[]> {
    const res = await fetch(`${BASE_URL}/vendor/sales`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load sales');
    return res.json();
}

export async function vendorCreateSale(
    token: string,
    payload: { customer_number: string; amount_ils: number; product_id?: number | null; idempotency_key: string }
): Promise<SaleTransaction> {
    const res = await fetch(`${BASE_URL}/vendor/sales`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to report sale');
    }
    return res.json();
}

export async function vendorListSettlements(token: string): Promise<CommissionSettlementPeriod[]> {
    const res = await fetch(`${BASE_URL}/vendor/settlements`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load settlements');
    return res.json();
}

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
        const res = await fetch(`${BASE_URL}/trending`, { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
        if (!res.ok) return MOCK_ITEMS.map((item, idx) => ({ ...item, is_featured: idx % 2 === 0, is_monthly: idx % 2 === 0 }));
        const data = await res.json();
        return data.length > 0 ? data : MOCK_ITEMS.map((item, idx) => ({ ...item, is_featured: idx % 2 === 0, is_monthly: idx % 2 === 0 }));
    } catch (e) {
        console.warn("Backend unreachable during build, using mock items.");
        return MOCK_ITEMS.map((item, idx) => ({ ...item, is_featured: idx % 2 === 0, is_monthly: idx % 2 === 0 }));
    }
}

export async function getMonthlyItems() {
    try {
        const res = await fetch(`${BASE_URL}/items`, { signal: AbortSignal.timeout(8000), next: { revalidate: 0 } });
        if (!res.ok) return MOCK_ITEMS.map((item, idx) => ({ ...item, is_featured: idx % 2 === 0, is_monthly: idx % 2 === 0 })).filter(i => i.is_monthly);
        const all = await res.json();
        return all.filter((i: { is_monthly?: boolean }) => i.is_monthly);
    } catch (e) {
        console.warn("Backend unreachable, using mock items.");
        return MOCK_ITEMS.map((item, idx) => ({ ...item, is_featured: idx % 2 === 0, is_monthly: idx % 2 === 0 })).filter(i => i.is_monthly);
    }
}

export async function getAllItems() {
    try {
        const res = await fetch(`${BASE_URL}/items`, { signal: AbortSignal.timeout(8000), next: { revalidate: 0 } });
        if (!res.ok) return MOCK_ITEMS.map((item, idx) => ({ ...item, is_featured: idx % 2 === 0, is_monthly: idx % 2 === 0 }));
        const data = await res.json();
        return data.length > 0 ? data : MOCK_ITEMS.map((item, idx) => ({ ...item, is_featured: idx % 2 === 0, is_monthly: idx % 2 === 0 }));
    } catch (e) {
        console.warn("Backend unreachable during build, using mock items.");
        return MOCK_ITEMS.map((item, idx) => ({ ...item, is_featured: idx % 2 === 0, is_monthly: idx % 2 === 0 }));
    }
}

export async function getCategories() {
    try {
        const res = await fetch(`${BASE_URL}/categories`, { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
        if (!res.ok) return MOCK_CATEGORIES;
        const data = await res.json();
        return data.length > 0 ? data : MOCK_CATEGORIES;
    } catch (e) {
        console.warn("Backend unreachable during build, using mock categories.");
        return MOCK_CATEGORIES;
    }
}

export async function getCategoryBySlug(slug: string) {
    try {
        const res = await fetch(`${BASE_URL}/categories/${slug}`, { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
        if (!res.ok) return MOCK_CATEGORIES.find(c => c.slug === slug) || null;
        return await res.json();
    } catch (e) {
        return MOCK_CATEGORIES.find(c => c.slug === slug) || null;
    }
}

export async function getCategoryItems(slug: string) {
    try {
        const res = await fetch(`${BASE_URL}/categories/${slug}/items`, { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
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
        const res = await fetch(`${BASE_URL}/products`, { signal: AbortSignal.timeout(8000), next: { revalidate: 0 } });
        if (!res.ok) return [{ id: 1 }];
        const data = await res.json();
        return data.length > 0 ? data.map((p: { id: number }) => ({ id: p.id })) : [{ id: 1 }];
    } catch {
        return [{ id: 1 }];
    }
}

// ── Verticals ("worlds") — single source of truth for diamonds/cars/insurance/etc ──────────

export interface VerticalAttributeField {
    key: string;
    label_he: string;
    label_en?: string | null;
    label_fr?: string | null;
    label_yi?: string | null;
    type: 'text' | 'number' | 'select';
    placeholder?: string | null;
    options?: string[] | null;
}

export interface Vertical {
    id: number;
    slug: string;
    label_he: string;
    label_en?: string | null;
    label_fr?: string | null;
    label_yi?: string | null;
    subtitle_he?: string | null;
    subtitle_en?: string | null;
    subtitle_fr?: string | null;
    subtitle_yi?: string | null;
    icon: string;
    supports_appointments: boolean;
    attribute_fields: VerticalAttributeField[];
    display_order: number;
    is_active: boolean;
}

// Used only if the backend is briefly unreachable during a static build — keeps the 3 worlds
// that exist today from vanishing out of the build entirely.
const FALLBACK_VERTICALS: Vertical[] = [
    { id: 1, slug: 'diamonds', label_he: 'עולם היהלומים', icon: 'Gem', supports_appointments: true, attribute_fields: [], display_order: 0, is_active: true },
    { id: 2, slug: 'cars', label_he: 'עולם הרכב', icon: 'Car', supports_appointments: false, attribute_fields: [], display_order: 1, is_active: true },
    { id: 3, slug: 'insurance', label_he: 'עולם הביטוחים', icon: 'ShieldCheck', supports_appointments: false, attribute_fields: [], display_order: 2, is_active: true },
];

export async function getVerticals(): Promise<Vertical[]> {
    try {
        const res = await fetch(`${BASE_URL}/verticals`, { signal: AbortSignal.timeout(8000), next: { revalidate: 0 } });
        if (!res.ok) return FALLBACK_VERTICALS;
        const data = await res.json();
        return data.length > 0 ? data : FALLBACK_VERTICALS;
    } catch {
        console.warn('Backend unreachable during build, using fallback verticals.');
        return FALLBACK_VERTICALS;
    }
}

export async function adminListVerticals(token: string): Promise<Vertical[]> {
    const res = await fetch(`${BASE_URL}/admin/verticals`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load verticals');
    return res.json();
}

export async function adminCreateVertical(token: string, payload: Record<string, unknown>): Promise<Vertical> {
    const res = await fetch(`${BASE_URL}/admin/verticals`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create vertical');
    }
    return res.json();
}

export async function adminUpdateVertical(token: string, id: number, payload: Record<string, unknown>): Promise<Vertical> {
    const res = await fetch(`${BASE_URL}/admin/verticals/${id}`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update vertical');
    }
    return res.json();
}

// ── Product Categories (sub-categories scoped to a single vertical, e.g. "Rings" under diamonds)
// Deliberately not named/routed as "Category"/"/categories" — those already belong to the
// unrelated legacy benefits catalog (getCategories/getCategoryBySlug below). ────────────────────

export interface ProductCategory {
    id: number;
    vertical: string;
    label_he: string;
    label_en?: string | null;
    label_fr?: string | null;
    label_yi?: string | null;
    display_order: number;
    is_active: boolean;
}

export async function getProductCategories(vertical?: string): Promise<ProductCategory[]> {
    const qs = vertical ? `?vertical=${encodeURIComponent(vertical)}` : '';
    try {
        const res = await fetch(`${BASE_URL}/product-categories${qs}`, { signal: AbortSignal.timeout(8000), next: { revalidate: 0 } });
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

export async function adminListProductCategories(token: string, vertical?: string): Promise<ProductCategory[]> {
    const qs = vertical ? `?vertical=${encodeURIComponent(vertical)}` : '';
    const res = await fetch(`${BASE_URL}/admin/product-categories${qs}`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load categories');
    return res.json();
}

export async function adminCreateProductCategory(token: string, payload: Record<string, unknown>): Promise<ProductCategory> {
    const res = await fetch(`${BASE_URL}/admin/product-categories`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create category');
    }
    return res.json();
}

export async function adminUpdateProductCategory(token: string, id: number, payload: Record<string, unknown>): Promise<ProductCategory> {
    const res = await fetch(`${BASE_URL}/admin/product-categories/${id}`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update category');
    }
    return res.json();
}

export async function adminDeleteProductCategory(token: string, id: number) {
    const res = await fetch(`${BASE_URL}/admin/product-categories/${id}`, {
        method: 'DELETE',
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to delete category');
    return res.json();
}

export async function adminBulkAssignCategory(token: string, product_ids: number[], category_id: number | null) {
    const res = await fetch(`${BASE_URL}/admin/products/bulk-category`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids, category_id }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Bulk category assignment failed');
    }
    return res.json();
}

// ── Quantity Discount Bundles ("סל מבצע") — an admin-managed group of products that get a
// percentage off once the combined quantity of the group's items in one checkout crosses a
// tier threshold. A product belongs to at most one bundle (nullable FK), same shape as
// vendor_id/category_id on Product. ─────────────────────────────────────────────────────────

export interface QuantityDiscountTier {
    id: number;
    min_quantity: number;
    discount_percent: number;
}

export interface QuantityDiscountBrief {
    id: number;
    bundle_code: string;
    name_he: string;
    tiers: QuantityDiscountTier[];
}

export interface QuantityDiscountBundle {
    id: number;
    bundle_code: string;
    name_he: string;
    name_en?: string | null;
    is_active: boolean;
    created_at: string;
    tiers: QuantityDiscountTier[];
    product_count: number;
}

export async function adminListQuantityDiscounts(token: string): Promise<QuantityDiscountBundle[]> {
    const res = await fetch(`${BASE_URL}/admin/quantity-discounts`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load quantity discount bundles');
    return res.json();
}

export async function adminCreateQuantityDiscount(
    token: string,
    payload: { name_he: string; name_en?: string | null; is_active?: boolean; tiers: { min_quantity: number; discount_percent: number }[] }
): Promise<QuantityDiscountBundle> {
    const res = await fetch(`${BASE_URL}/admin/quantity-discounts`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create quantity discount bundle');
    }
    return res.json();
}

export async function adminUpdateQuantityDiscount(
    token: string,
    id: number,
    payload: Record<string, unknown>
): Promise<QuantityDiscountBundle> {
    const res = await fetch(`${BASE_URL}/admin/quantity-discounts/${id}`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update quantity discount bundle');
    }
    return res.json();
}

export async function adminBulkAssignQuantityDiscount(token: string, product_ids: number[], quantity_discount_bundle_id: number | null) {
    const res = await fetch(`${BASE_URL}/admin/products/bulk-quantity-discount`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids, quantity_discount_bundle_id }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Bulk quantity discount assignment failed');
    }
    return res.json();
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

export async function createLead(token: string, payload: { product_id: number; scheduled_at?: string | null; locale?: string }) {
    const res = await fetch(`${BASE_URL}/leads`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to submit request');
    return res.json();
}

/** One Lead row as returned by POST /leads/cart-checkout — includes the server-computed price
 *  snapshot (unit_price_snapshot/list_price_snapshot/quantity_discount_percent_snapshot), the
 *  one authoritative source for "what this order actually cost" (see services/pricing.py). */
export interface CartCheckoutLead {
    id: number;
    product_id: number | null;
    quantity: number | null;
    customer_order_id: number | null;
    unit_price_snapshot?: number | null;
    list_price_snapshot?: number | null;
    quantity_discount_percent_snapshot?: number | null;
}

export async function cartCheckout(token: string, payload: { items: { product_id: number; quantity: number }[]; locale?: string }): Promise<CartCheckoutLead[]> {
    const res = await fetch(`${BASE_URL}/leads/cart-checkout`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to submit cart');
    }
    return res.json();
}

export async function forgotPassword(email: string, locale: string) {
    const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
    });
    // The endpoint itself always returns 200 on a normal lookup (anti-enumeration — it never
    // reveals whether the email exists), so a non-ok response here means a real failure (e.g. the
    // 3/hour rate limit, or a 5xx) that the caller needs to know about, not silently swallow.
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to send reset link');
    }
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

export async function vendorForgotPassword(email: string, locale: string) {
    const res = await fetch(`${BASE_URL}/vendor-auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
    });
    // Same reasoning as forgotPassword() — the endpoint always 200s on a normal lookup, so a
    // non-ok response is a real failure (rate limit, 5xx) the caller must surface, not swallow.
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to send reset link');
    }
}

export async function vendorResetPassword(token: string, new_password: string) {
    const res = await fetch(`${BASE_URL}/vendor-auth/reset-password`, {
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

export async function voteSurvey(token: string, surveyId: number, surveyOptionIds: number[]) {
    const res = await fetch(`${BASE_URL}/surveys/${surveyId}/vote`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ survey_option_ids: surveyOptionIds }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to vote');
    }
    return res.json();
}

export async function updateUserProfile(token: string, payload: { phone?: string; gender?: string; city?: string; birth_year?: number; id_number?: string; club_affiliation?: string; membership_tracks?: string[] }) {
    const res = await fetch(`${BASE_URL}/users/me`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
}

export async function getMyActivity(token: string) {
    const res = await fetch(`${BASE_URL}/users/me/activity`, { headers: authHeaders(token) });
    if (!res.ok) return [];
    return res.json();
}

/** Admin endpoints */

export async function adminListUsers(token: string) {
    const res = await fetch(`${BASE_URL}/admin/users`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load users');
    return res.json();
}

export async function adminCreateUser(token: string, payload: Record<string, unknown>) {
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

export async function adminUnlockUser(token: string, userId: number) {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/unlock`, {
        method: 'PATCH',
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to unlock user');
    return res.json();
}

export async function adminListProducts(token: string) {
    const res = await fetch(`${BASE_URL}/admin/products`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load products');
    return res.json();
}

export async function adminCreateProduct(token: string, payload: Record<string, unknown>) {
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

export async function adminUpdateProduct(token: string, id: number, payload: Record<string, unknown>) {
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
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to delete product');
    }
    return res.json();
}

export async function adminListLeads(token: string) {
    const res = await fetch(`${BASE_URL}/admin/leads`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load leads');
    return res.json();
}

export interface CustomerOrderLine {
    id: number;
    lead_type: string;
    scheduled_at?: string | null;
    status: string;
    channel: string;
    notes?: string | null;
    assigned_to?: number | null;
    assigned_to_name?: string | null;
    history: { ts: string; action: string; from_val?: string | null; to_val?: string | null }[];
    created_at: string;
    product_id?: number | null;
    product_title_he?: string | null;
    product_vertical?: string | null;
    vendor_id?: number | null;
    vendor_name_he?: string | null;
    shipping_address?: { full_name: string; street: string; city: string; zip_code?: string | null; phone: string } | null;
    quantity?: number | null;
    vendor_batch_id?: number | null;
    unit_price_snapshot?: number | null;
    list_price_snapshot?: number | null;
    quantity_discount_percent_snapshot?: number | null;
}

export interface CustomerOrder {
    id: number;
    order_number: string;
    user_id: number;
    user_name?: string | null;
    user_email?: string | null;
    user_phone?: string | null;
    notes?: string | null;
    created_at: string;
    items: CustomerOrderLine[];
}

export async function adminListOrders(token: string): Promise<CustomerOrder[]> {
    const res = await fetch(`${BASE_URL}/admin/orders`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load orders');
    return res.json();
}

export async function adminUpdateOrderNotes(token: string, orderId: number, notes: string) {
    const res = await fetch(`${BASE_URL}/admin/orders/${orderId}/notes`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
    });
    if (!res.ok) throw new Error('Failed to update order notes');
    return res.json();
}

export async function adminListSurveys(token: string) {
    const res = await fetch(`${BASE_URL}/admin/surveys`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load surveys');
    return res.json();
}

export async function adminUpdateSurvey(token: string, surveyId: number, payload: { is_active?: boolean; max_choices?: number; image_url?: string | null }) {
    const res = await fetch(`${BASE_URL}/admin/surveys/${surveyId}`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update survey');
    return res.json();
}

export async function adminCreateSurvey(token: string, payload: Record<string, unknown>) {
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

export async function adminCreateDistribution(token: string, payload: Record<string, unknown>) {
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

export async function adminCreatePromotion(token: string, payload: Record<string, unknown>) {
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

export async function adminUpdatePromotion(token: string, id: number, payload: Record<string, unknown>) {
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

export async function adminDeleteSurvey(token: string, id: number) {
    const res = await fetch(`${BASE_URL}/admin/surveys/${id}`, { method: 'DELETE', headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to delete survey');
    return res.json();
}

export async function adminDeleteDistribution(token: string, id: number) {
    const res = await fetch(`${BASE_URL}/admin/distributions/${id}`, { method: 'DELETE', headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to delete distribution');
    return res.json();
}

export async function adminUpdateLeadStatus(token: string, leadId: number, status: string) {
    const res = await fetch(`${BASE_URL}/admin/leads/${leadId}/status?status=${status}`, {
        method: 'PATCH',
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to update lead status');
    return res.json();
}

export async function adminTranslateProduct(token: string, title_he: string, description_he: string) {
    const res = await fetch(`${BASE_URL}/admin/translate`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ title_he, description_he }),
    });
    if (!res.ok) throw new Error('Translation failed');
    return res.json() as Promise<{ title_en: string; description_en: string; title_fr: string; description_fr: string; title_yi: string; description_yi: string }>;
}

export async function adminGetTranslateStatus(token: string): Promise<{ available: boolean }> {
    const res = await fetch(`${BASE_URL}/admin/translate/status`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to check translate status');
    return res.json();
}

export async function adminDeleteUser(token: string, userId: number) {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}`, { method: 'DELETE', headers: authHeaders(token) });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to delete user');
    }
    return res.json();
}

export async function adminGetMemberCount(token: string): Promise<number> {
    const res = await fetch(`${BASE_URL}/admin/users/member-count`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to get member count');
    const data = await res.json();
    return data.count;
}

export async function adminDeletePromotion(token: string, id: number) {
    const res = await fetch(`${BASE_URL}/admin/promotions/${id}`, { method: 'DELETE', headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to delete promotion');
    return res.json();
}

export async function adminDuplicateProduct(token: string, id: number) {
    const res = await fetch(`${BASE_URL}/admin/products/${id}/duplicate`, {
        method: 'POST',
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to duplicate product');
    return res.json();
}

export async function changePassword(token: string, current_password: string, new_password: string) {
    const res = await fetch(`${BASE_URL}/users/me/password`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password, new_password }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to change password');
    }
    return res.json();
}

export async function adminUpdateLeadNotes(token: string, leadId: number, notes: string) {
    const res = await fetch(`${BASE_URL}/admin/leads/${leadId}/notes`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
    });
    if (!res.ok) throw new Error('Failed to update notes');
    return res.json();
}

export async function adminGetLeadStats(token: string, days = 14): Promise<{ date: string; count: number }[]> {
    const res = await fetch(`${BASE_URL}/admin/leads/stats?days=${days}`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load lead stats');
    return res.json();
}

export async function adminGetStats(token: string): Promise<{
    open_leads: number;
    active_products: number;
    member_count: number;
    active_promotions: number;
    draft_distributions: number;
}> {
    const res = await fetch(`${BASE_URL}/admin/stats`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load stats');
    return res.json();
}

export async function adminUploadImage(token: string, file: File): Promise<{ filename: string }> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE_URL}/admin/upload-image`, {
        method: 'POST',
        headers: authHeaders(token),
        body: form,
    });
    if (!res.ok) throw new Error('Upload failed');
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

// Favorites
export async function getFavoriteIds(token: string): Promise<number[]> {
    const res = await fetch(`${BASE_URL}/favorites/ids`, { headers: authHeaders(token) });
    if (!res.ok) return [];
    return res.json();
}

export async function addFavorite(token: string, productId: number) {
    const res = await fetch(`${BASE_URL}/favorites/${productId}`, { method: 'POST', headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to add favorite');
    return res.json();
}

export async function removeFavorite(token: string, productId: number) {
    await fetch(`${BASE_URL}/favorites/${productId}`, { method: 'DELETE', headers: authHeaders(token) });
}

export async function getFavorites(token: string) {
    const res = await fetch(`${BASE_URL}/favorites`, { headers: authHeaders(token) });
    if (!res.ok) return [];
    return res.json();
}

// Notifications
export async function getNotifications(token: string) {
    const res = await fetch(`${BASE_URL}/notifications`, { headers: authHeaders(token) });
    if (!res.ok) return [];
    return res.json();
}

export async function getUnreadCount(token: string): Promise<number> {
    const res = await fetch(`${BASE_URL}/notifications/unread-count`, { headers: authHeaders(token) });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count;
}

export async function markNotificationRead(token: string, id: number) {
    await fetch(`${BASE_URL}/notifications/${id}/read`, { method: 'PATCH', headers: authHeaders(token) });
}

export async function markAllNotificationsRead(token: string) {
    await fetch(`${BASE_URL}/notifications/read-all`, { method: 'PATCH', headers: authHeaders(token) });
}

// Admin leads extras
export async function adminAssignLead(token: string, leadId: number, assignedTo: number | null) {
    const res = await fetch(`${BASE_URL}/admin/leads/${leadId}/assign`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: assignedTo }),
    });
    if (!res.ok) throw new Error('Failed to assign lead');
    return res.json();
}

export async function adminGetConversionStats(token: string) {
    const res = await fetch(`${BASE_URL}/admin/leads/conversion`, { headers: authHeaders(token) });
    if (!res.ok) return [];
    return res.json();
}

export async function adminSendFollowupReminders(token: string, staleDays = 3) {
    const res = await fetch(`${BASE_URL}/admin/leads/send-followup-reminders?stale_days=${staleDays}`, {
        method: 'POST',
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to send reminders');
    return res.json();
}

export async function adminSendAppointmentReminder(token: string, leadId: number) {
    const res = await fetch(`${BASE_URL}/admin/leads/${leadId}/send-appointment-reminder`, {
        method: 'POST',
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to send reminder');
    return res.json();
}

// Admin products CSV import
export async function adminImportCsv(token: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE_URL}/admin/products/import-csv`, {
        method: 'POST',
        headers: authHeaders(token),
        body: form,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Import failed');
    }
    return res.json();
}

export async function adminGetAdminUsers(token: string) {
    const res = await fetch(`${BASE_URL}/admin/users`, { headers: authHeaders(token) });
    if (!res.ok) return [];
    const users = await res.json();
    return users.filter((u: { role?: string }) => u.role === 'admin');
}

// Reviews
export async function getProductReviews(productId: number) {
    const res = await fetch(`${BASE_URL}/products/${productId}/reviews`);
    if (!res.ok) return [];
    return res.json();
}

export async function submitReview(token: string, productId: number, rating: number, comment?: string) {
    const res = await fetch(`${BASE_URL}/reviews/${productId}`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment || null }),
    });
    if (!res.ok) throw new Error('Failed to submit review');
    return res.json();
}

// Admin leads bulk action
export async function adminBulkLeadAction(token: string, lead_ids: number[], action: string, value?: string) {
    const res = await fetch(`${BASE_URL}/admin/leads/bulk`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids, action, value }),
    });
    if (!res.ok) throw new Error('Bulk action failed');
    return res.json();
}

// My appointments
export async function getMyAppointments(token: string) {
    const res = await fetch(`${BASE_URL}/leads/me`, { headers: authHeaders(token) });
    if (!res.ok) return [];
    const leads = await res.json();
    return leads.filter((l: { lead_type?: string; scheduled_at?: string | null }) => l.lead_type === 'appointment' && l.scheduled_at);
}

// Global search
export async function searchProducts(q: string) {
    if (!q || q.trim().length < 2) return [];
    const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(q.trim())}`);
    if (!res.ok) return [];
    return res.json();
}

// Product view tracking
export async function trackProductView(productId: number) {
    fetch(`${BASE_URL}/products/${productId}/view`, { method: 'POST' }).catch(() => {});
}

// First-party pageview analytics — see CLAUDE.md's "Self-Hosted Analytics" session
export function trackPageview(path: string, locale: string, visitorId: string, referrer: string) {
    fetch(`${BASE_URL}/analytics/pageview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, locale, visitor_id: visitorId, referrer }),
    }).catch(() => {});
}

export interface AnalyticsSummary {
    trend: { date: string; count: number }[];
    totals: {
        pageviews_today: number;
        pageviews_7d: number;
        pageviews_30d: number;
        unique_visitors_today: number;
        unique_visitors_7d: number;
        unique_visitors_30d: number;
    };
    top_pages: { path: string; count: number }[];
    locale_breakdown: Record<string, number>;
}

export async function adminGetAnalyticsSummary(token: string, days: number = 14): Promise<AnalyticsSummary> {
    const res = await fetch(`${BASE_URL}/admin/analytics/summary?days=${days}`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Failed to load analytics');
    return res.json();
}

export async function adminPruneAnalytics(token: string): Promise<{ deleted: number; retention_days: number }> {
    const res = await fetch(`${BASE_URL}/admin/analytics/prune`, { method: 'POST', headers: authHeaders(token) });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to prune analytics data');
    }
    return res.json();
}

// My orders
export async function getMyOrders(token: string) {
    const res = await fetch(`${BASE_URL}/orders/me`, { headers: authHeaders(token) });
    if (!res.ok) return [];
    return res.json();
}

// My marketplace orders (CustomerOrder-backed — cart checkouts, appointments, card requests)
export interface MyOrderLine {
    id: number;
    lead_type: string;
    scheduled_at?: string | null;
    status: string;
    product_id?: number | null;
    product_title_he?: string | null;
    product_vertical?: string | null;
    product_image_url?: string | null;
    product_price?: number | null;
    shipping_address?: ShippingAddress | null;
    quantity?: number | null;
    unit_price_snapshot?: number | null;
    list_price_snapshot?: number | null;
    quantity_discount_percent_snapshot?: number | null;
    created_at: string;
}

export interface MyOrder {
    id: number;
    order_number: string;
    created_at: string;
    items: MyOrderLine[];
}

export async function getMyCustomerOrders(token: string): Promise<MyOrder[]> {
    const res = await fetch(`${BASE_URL}/users/me/orders`, { headers: authHeaders(token) });
    if (!res.ok) return [];
    return res.json();
}

// ── Loyalty program: customer card / points history / physical card request ─

export interface PointsLedgerEntry {
    id: number;
    delta_points: number;
    reason: string;
    balance_after: number;
    vendor_name_he?: string | null;
    created_at: string;
}

export interface ShippingAddress {
    full_name: string;
    street: string;
    city: string;
    zip_code?: string | null;
    phone: string;
}

export async function getMyPointsHistory(token: string): Promise<PointsLedgerEntry[]> {
    const res = await fetch(`${BASE_URL}/users/me/points-history`, { headers: authHeaders(token) });
    if (!res.ok) return [];
    return res.json();
}

export async function createCardOrder(token: string, shippingAddress: ShippingAddress, locale?: string) {
    const res = await fetch(`${BASE_URL}/leads/card-order`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipping_address: shippingAddress, locale }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to submit card order');
    }
    return res.json();
}

export async function submitContactUs(token: string, payload: { subject: string; message: string; locale?: string }) {
    const res = await fetch(`${BASE_URL}/leads/contact`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to submit your message');
    }
    return res.json();
}

// Notification preferences
export async function updateNotificationPrefs(token: string, prefs: Record<string, boolean>) {
    const res = await fetch(`${BASE_URL}/users/me/notification-prefs`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
    });
    if (!res.ok) throw new Error('Failed to update preferences');
    return res.json();
}

// Admin: product analytics
export async function adminGetProductAnalytics(token: string) {
    const res = await fetch(`${BASE_URL}/admin/products/analytics`, { headers: authHeaders(token) });
    if (!res.ok) return [];
    return res.json();
}

// Admin: distribution email preview
export async function adminPreviewDistribution(token: string, id: number) {
    const res = await fetch(`${BASE_URL}/admin/distributions/${id}/preview`, { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Preview failed');
    return res.json() as Promise<{ html: string; subject: string; recipient_count: number }>;
}