'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { adminListProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct, adminDuplicateProduct, adminTranslateProduct, adminGetTranslateStatus, adminUploadImage, adminImportCsv, adminGetProductAnalytics, adminListVendors, adminListVerticals, adminListProductCategories, adminBulkAssignCategory, adminListQuantityDiscounts, adminBulkAssignQuantityDiscount, productImageUrl, Vendor, Vertical, ProductCategory, QuantityDiscountBundle } from '@/lib/api';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { useBulkSelection } from '@/lib/useBulkSelection';
import { Product } from '@/components/ProductTile';
import { Plus, Trash2, Loader2, ArrowUpDown, X, ImagePlus, Pencil, CheckCircle2, AlertCircle, Eye, EyeOff, Search, Copy, Languages, Download, Upload, BarChart3, ExternalLink, CheckSquare, Square } from 'lucide-react';

const LANGS = [
    { key: 'he', label: 'עברית', dir: 'rtl' as const },
    { key: 'en', label: 'English', dir: 'ltr' as const },
    { key: 'fr', label: 'Français', dir: 'ltr' as const },
    { key: 'yi', label: 'ייִדיש', dir: 'rtl' as const },
];

// A distinct sentinel from '' (the select's "nothing chosen yet" state) — keeps the bulk-apply
// button's default/idle state from silently clearing every selected product's category.
const BULK_CLEAR_VALUE = '__clear__';

interface ProductAnalyticsRow {
    id: number;
    vertical: string;
    title_he: string;
    view_count: number;
    favorite_count: number;
    review_count: number;
    avg_rating: number | null;
    lead_count: number;
}

type AttrField = { key: string; label: string; type: 'text' | 'number' | 'select'; placeholder?: string; options?: string[] };

const EMPTY_FORM = {
    vertical: '',
    title_he: '', title_en: '', title_fr: '', title_yi: '',
    description_he: '', description_en: '', description_fr: '', description_yi: '',
    price: '',
    sale_price: '',
    discount_percent: '', // UI-only convenience, derived from (price, sale_price) — never submitted
    image_url: '',
    attributes: {} as Record<string, string>,
    vendor_id: '' as string | number,
    category_id: '' as string | number,
    quantity_discount_bundle_id: '' as string | number,
    is_active: true,
};

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold whitespace-nowrap ${
            type === 'success' ? 'bg-[#0e1628] border border-green-500/50 text-green-400' : 'bg-[#0e1628] border border-red-500/50 text-red-400'
        }`}>
            {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message}
        </div>
    );
}

export default function AdminProductsPage() {
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const { token } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterVertical, setFilterVertical] = useState('');
    const [filterActive, setFilterActive] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [search, setSearch] = useState('');
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [sortKey, setSortKey] = useState<'title_he' | 'price' | 'vertical'>('vertical');
    const [showForm, setShowForm] = useState(false);
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [showBatchForm, setShowBatchForm] = useState(false);
    const [batchJson, setBatchJson] = useState('');
    const [batchError, setBatchError] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [verticals, setVerticals] = useState<Vertical[]>([]);
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [bundles, setBundles] = useState<QuantityDiscountBundle[]>([]);
    const [bulkCategoryValue, setBulkCategoryValue] = useState('');
    const [bulkCategoryLoading, setBulkCategoryLoading] = useState(false);
    const [bulkBundleValue, setBulkBundleValue] = useState('');
    const [bulkBundleLoading, setBulkBundleLoading] = useState(false);
    const [langTab, setLangTab] = useState<'he' | 'en' | 'fr' | 'yi'>('he');
    const [translating, setTranslating] = useState(false);
    const [translateAvailable, setTranslateAvailable] = useState(true);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showCsvModal, setShowCsvModal] = useState(false);
    const [importingCsv, setImportingCsv] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [analytics, setAnalytics] = useState<ProductAnalyticsRow[]>([]);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsSortKey, setAnalyticsSortKey] = useState<'view_count' | 'favorite_count' | 'review_count' | 'lead_count'>('view_count');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    const load = () => {
        if (!token) return;
        setLoading(true);
        adminListProducts(token).then(setProducts).finally(() => setLoading(false));
    };

    useEffect(() => { Promise.resolve().then(load); }, [token]);

    useEffect(() => {
        if (!token) return;
        adminListVendors(token).then(setVendors).catch(() => {});
    }, [token]);

    useEffect(() => {
        if (!token) return;
        adminListVerticals(token).then(setVerticals).catch(() => {});
    }, [token]);

    useEffect(() => {
        if (!token) return;
        adminListProductCategories(token).then(setCategories).catch(() => {});
    }, [token]);

    useEffect(() => {
        if (!token) return;
        adminListQuantityDiscounts(token).then(setBundles).catch(() => {});
    }, [token]);

    useEffect(() => {
        if (!token) return;
        adminGetTranslateStatus(token).then((s) => setTranslateAvailable(s.available)).catch(() => setTranslateAvailable(true));
    }, [token]);

    const VERTICAL_LABEL: Record<string, string> = useMemo(
        () => Object.fromEntries(verticals.map((v) => [v.slug, v.label_he])),
        [verticals]
    );
    const activeVerticals = useMemo(() => verticals.filter((v) => v.is_active), [verticals]);
    const activeCategories = useMemo(() => categories.filter((c) => c.is_active), [categories]);
    const formCategories = useMemo(() => activeCategories.filter((c) => c.vertical === form.vertical), [activeCategories, form.vertical]);
    const activeBundles = useMemo(() => bundles.filter((b) => b.is_active), [bundles]);
    const getVerticalAttrs = (slug: string): AttrField[] =>
        (verticals.find((v) => v.slug === slug)?.attribute_fields || []).map((f) => ({
            key: f.key, label: f.label_he, type: f.type, placeholder: f.placeholder || undefined, options: f.options || undefined,
        }));

    const filtered = useMemo(() => {
        let list = products;
        if (filterVertical) list = list.filter((p) => p.vertical === filterVertical);
        if (filterActive === 'active') list = list.filter((p) => p.is_active);
        if (filterActive === 'hidden') list = list.filter((p) => !p.is_active);
        if (filterCategory) list = list.filter((p) => String(p.category_id ?? '') === filterCategory);
        if (search) {
            const q = search.toLowerCase();
            list = list.filter((p) => p.title_he?.toLowerCase().includes(q) || p.description_he?.toLowerCase().includes(q));
        }
        list = [...list].sort((a, b) => {
            if (sortKey === 'price') return (a.price || 0) - (b.price || 0);
            return String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''));
        });
        return list;
    }, [products, filterVertical, filterActive, filterCategory, search, sortKey]);

    // Cleared whenever the visible filter set changes, so a bulk category action can never
    // silently act on ids that are no longer visible on screen (same pattern as admin/leads).
    const { selectedIds, toggleSelect, toggleSelectAll, clear: clearSelection } = useBulkSelection(
        `${filterVertical}|${filterActive}|${filterCategory}|${search}|${sortKey}`
    );

    // Categories available for the bulk-apply bar: restricted to the vertical shared by every
    // currently-selected product (bulk-assign rejects a mixed-vertical selection server-side too).
    const selectedProducts = useMemo(() => products.filter((p) => selectedIds.has(p.id)), [products, selectedIds]);
    const selectedVerticals = useMemo(() => new Set(selectedProducts.map((p) => p.vertical)), [selectedProducts]);
    const bulkCategoryOptions = selectedVerticals.size === 1
        ? activeCategories.filter((c) => c.vertical === [...selectedVerticals][0])
        : [];

    const handleBulkApplyCategory = async () => {
        if (!token || selectedIds.size === 0 || bulkCategoryValue === '') return;
        setBulkCategoryLoading(true);
        try {
            const category_id = bulkCategoryValue === BULK_CLEAR_VALUE ? null : Number(bulkCategoryValue);
            await adminBulkAssignCategory(token, Array.from(selectedIds), category_id);
            setProducts((prev) => prev.map((p) => selectedIds.has(p.id) ? { ...p, category_id, category: category_id ? categories.find((c) => c.id === category_id) ?? null : null } : p));
            showToast('הקטגוריה עודכנה עבור המוצרים שנבחרו ✓');
            clearSelection();
            setBulkCategoryValue('');
        } catch (err) {
            showToast(getErrorMessage(err, 'שגיאה בעדכון קטגוריה'), 'error');
        } finally {
            setBulkCategoryLoading(false);
        }
    };

    const handleBulkApplyBundle = async () => {
        if (!token || selectedIds.size === 0 || bulkBundleValue === '') return;
        setBulkBundleLoading(true);
        try {
            const quantity_discount_bundle_id = bulkBundleValue === BULK_CLEAR_VALUE ? null : Number(bulkBundleValue);
            await adminBulkAssignQuantityDiscount(token, Array.from(selectedIds), quantity_discount_bundle_id);
            setProducts((prev) => prev.map((p) => selectedIds.has(p.id) ? { ...p, quantity_discount_bundle_id } : p));
            showToast('סל המבצע עודכן עבור המוצרים שנבחרו ✓');
            clearSelection();
            setBulkBundleValue('');
        } catch (err) {
            showToast(getErrorMessage(err, 'שגיאה בעדכון סל מבצע'), 'error');
        } finally {
            setBulkBundleLoading(false);
        }
    };

    const handleDuplicate = async (p: Product) => {
        if (!token) return;
        try {
            await adminDuplicateProduct(token, p.id);
            showToast(`"${p.title_he}" שוכפל (מוסתר) ✓`);
            load();
        } catch {
            showToast('שגיאה בשכפול', 'error');
        }
    };

    const handleToggleActive = async (p: Product) => {
        if (!token) return;
        setTogglingId(p.id);
        try {
            await adminUpdateProduct(token, p.id, { is_active: !p.is_active });
            setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !p.is_active } : x));
            showToast(p.is_active ? 'המוצר הוסתר' : 'המוצר הוצג ✓');
        } catch {
            showToast('שגיאה בעדכון', 'error');
        } finally {
            setTogglingId(null);
        }
    };

    const openEditForm = (p: Product) => {
        setEditProduct(p);
        const attrs: Record<string, string> = {};
        if (p.attributes) {
            Object.entries(p.attributes).forEach(([k, v]) => { attrs[k] = String(v ?? ''); });
        }
        const salePrice = p.sale_price && p.sale_price > 0 ? p.sale_price : null;
        const discountPercent = salePrice && p.price ? Math.round((1 - salePrice / p.price) * 1000) / 10 : null;
        setForm({
            vertical: p.vertical,
            title_he: p.title_he || '', title_en: p.title_en || '', title_fr: p.title_fr || '', title_yi: p.title_yi || '',
            description_he: p.description_he || '', description_en: p.description_en || '', description_fr: p.description_fr || '', description_yi: p.description_yi || '',
            price: p.price ? String(p.price) : '',
            sale_price: salePrice ? String(salePrice) : '',
            discount_percent: discountPercent != null ? String(discountPercent) : '',
            image_url: p.image_url || '',
            attributes: attrs,
            vendor_id: p.vendor_id ?? '',
            category_id: p.category_id ?? '',
            quantity_discount_bundle_id: p.quantity_discount_bundle_id ?? '',
            is_active: p.is_active ?? true,
        });
        setLangTab('he');
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditProduct(null);
        setForm(EMPTY_FORM);
        setLangTab('he');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleTranslate = async () => {
        if (!token || !form.title_he.trim()) return;
        setTranslating(true);
        try {
            const result = await adminTranslateProduct(token, form.title_he, form.description_he);
            setForm((f) => ({ ...f, ...result }));
            showToast('התרגום הושלם ✓');
        } catch {
            showToast('שגיאה בתרגום — ודא שמפתח ANTHROPIC_API_KEY מוגדר', 'error');
        } finally {
            setTranslating(false);
        }
    };

    // Two-way sync between "sale price" and "discount %" — both are always recomputed fresh from
    // form.price (never chained from each other's previous derived value), so there's no feedback
    // loop and nothing that can drift: only form.sale_price is ever submitted, discount_percent is
    // pure UI convenience.
    const handleSalePriceChange = (value: string) => {
        const priceNum = Number(form.price);
        const saleNum = Number(value);
        const percent = value !== '' && priceNum > 0 && !isNaN(saleNum)
            ? Math.round((1 - saleNum / priceNum) * 1000) / 10
            : '';
        setForm({ ...form, sale_price: value, discount_percent: percent === '' ? '' : String(percent) });
    };

    const handleDiscountPercentChange = (value: string) => {
        const priceNum = Number(form.price);
        const percentNum = Number(value);
        const sale = value !== '' && priceNum > 0 && !isNaN(percentNum)
            ? Math.round(priceNum * (1 - percentNum / 100) * 100) / 100
            : '';
        setForm({ ...form, discount_percent: value, sale_price: sale === '' ? '' : String(sale) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        const cleanAttrs: Record<string, string | number> = {};
        Object.entries(form.attributes).forEach(([k, v]) => {
            if (v !== '' && v != null) {
                const field = getVerticalAttrs(form.vertical).find((f) => f.key === k);
                cleanAttrs[k] = field?.type === 'number' ? Number(v) : v;
            }
        });
        const payload = {
            vertical: form.vertical,
            title_he: form.title_he, title_en: form.title_en || null, title_fr: form.title_fr || null, title_yi: form.title_yi || null,
            description_he: form.description_he, description_en: form.description_en || null, description_fr: form.description_fr || null, description_yi: form.description_yi || null,
            price: form.price ? Number(form.price) : null,
            sale_price: form.sale_price ? Number(form.sale_price) : 0,
            image_url: form.image_url || null,
            attributes: Object.keys(cleanAttrs).length > 0 ? cleanAttrs : null,
            vendor_id: form.vendor_id ? Number(form.vendor_id) : null,
            category_id: form.category_id ? Number(form.category_id) : null,
            quantity_discount_bundle_id: form.quantity_discount_bundle_id ? Number(form.quantity_discount_bundle_id) : null,
            // Preserves the product's current hidden/visible state on edit — a hardcoded `true`
            // here used to silently re-publish a hidden product on any unrelated edit (e.g. fixing
            // a typo). New products (no editProduct) still default to active via EMPTY_FORM.
            is_active: form.is_active,
        };
        try {
            if (editProduct) {
                await adminUpdateProduct(token, editProduct.id, payload);
                showToast('המוצר עודכן בהצלחה ✓');
            } else {
                await adminCreateProduct(token, payload);
                showToast('המוצר נוצר בהצלחה ✓');
            }
            closeForm();
            load();
        } catch {
            showToast('שגיאה בשמירה', 'error');
        }
    };

    const handleBatchCreate = async () => {
        if (!token) return;
        setBatchError(null);
        try {
            const parsed = JSON.parse(batchJson);
            if (!Array.isArray(parsed)) throw new Error('Must be a JSON array');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/admin/products/batch`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(parsed),
            });
            if (!res.ok) throw new Error('Failed to create batch');
            setBatchJson('');
            setShowBatchForm(false);
            showToast(`${parsed.length} מוצרים הועלו בהצלחה ✓`);
            load();
        } catch (err) {
            setBatchError(getErrorMessage(err, 'Invalid JSON'));
        }
    };

    const handleDelete = async (id: number) => {
        if (!token) return;
        try {
            await adminDeleteProduct(token, id);
            setDeletingId(null);
            setProducts((prev) => prev.filter((p) => p.id !== id));
            // The row (and its checkbox) is gone from the table now — drop it from the bulk
            // selection too, so a stale id can't linger in a "N selected" count/bulk action.
            if (selectedIds.has(id)) toggleSelect(id);
            showToast('המוצר נמחק לצמיתות ✓');
        } catch (err) {
            setDeletingId(null);
            showToast(getErrorMessage(err, 'שגיאה במחיקה'), 'error');
        }
    };

    const loadAnalytics = async () => {
        if (!token) return;
        setAnalyticsLoading(true);
        try {
            const data = await adminGetProductAnalytics(token);
            setAnalytics(data);
        } catch {
            showToast('שגיאה בטעינת אנליטיקס', 'error');
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const toggleAnalytics = () => {
        if (!showAnalytics && analytics.length === 0) loadAnalytics();
        setShowAnalytics((v) => !v);
    };

    const sortedAnalytics = [...analytics].sort((a, b) => (b[analyticsSortKey] ?? 0) - (a[analyticsSortKey] ?? 0));

    const activeLang = LANGS.find((l) => l.key === langTab)!;
    const hasTranslations = form.title_en || form.title_fr || form.title_yi;
    const verticalAttrs = getVerticalAttrs(form.vertical);

    const exportCsv = () => {
        const header = ['vertical', 'title_he', 'title_en', 'title_fr', 'title_yi', 'description_he', 'description_en', 'description_fr', 'description_yi', 'price', 'sale_price', 'vendor_id', 'category_id', 'quantity_discount_bundle_id', 'image', 'is_active', 'attributes'];
        const rows = filtered.map((p) => [
            p.vertical, p.title_he, p.title_en || '', p.title_fr || '', p.title_yi || '',
            p.description_he, p.description_en || '', p.description_fr || '', p.description_yi || '',
            p.price ?? '', p.sale_price ?? '', p.vendor_id ?? '', p.category_id ?? '', p.quantity_discount_bundle_id ?? '',
            p.image_url || '', p.is_active ? 'true' : 'false',
            p.attributes ? JSON.stringify(p.attributes) : '',
        ]);
        const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    const handleCsvImport = async () => {
        if (!token || !csvFile) return;
        setImportingCsv(true);
        try {
            const imported = await adminImportCsv(token, csvFile);
            setProducts((prev) => [...imported, ...prev]);
            setShowCsvModal(false);
            setCsvFile(null);
            showToast(`יובאו ${imported.length} מוצרים ✓`);
        } catch (e) {
            showToast(getErrorMessage(e, 'שגיאה בייבוא'), 'error');
        } finally {
            setImportingCsv(false);
        }
    };

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-black text-[#f0e6d3]">מוצרים</h1>
                <div className="flex gap-3 flex-wrap">
                    <button onClick={exportCsv} disabled={filtered.length === 0} className="flex items-center gap-2 bg-[#0e1628] border border-[#d4af37]/30 text-[#d4af37] rounded-xl px-4 py-2 text-sm font-bold hover:bg-[#111a2f] disabled:opacity-40 transition-colors">
                        <Download size={15} /> CSV ({filtered.length})
                    </button>
                    <button onClick={() => setShowCsvModal(true)} className="flex items-center gap-2 bg-[#0e1628] border border-[#d4af37]/30 text-[#d4af37] rounded-xl px-4 py-2 text-sm font-bold hover:bg-[#111a2f] transition-colors">
                        <Upload size={15} /> ייבוא CSV
                    </button>
                    <button onClick={() => setShowBatchForm(true)} className="btn-secondary flex items-center gap-2 !text-sm">
                        <Plus size={16} /> הוסף מקבץ מוצרים
                    </button>
                    <button onClick={toggleAnalytics} className={`flex items-center gap-2 border rounded-xl px-4 py-2 text-sm font-bold transition-colors ${showAnalytics ? 'bg-[#d4af37] text-[#080d1f] border-[#d4af37]' : 'bg-[#0e1628] border-[#d4af37]/30 text-[#d4af37] hover:bg-[#111a2f]'}`}>
                        <BarChart3 size={15} /> אנליטיקס
                    </button>
                    <button onClick={() => { setEditProduct(null); setForm({ ...EMPTY_FORM, vertical: activeVerticals[0]?.slug || '' }); setLangTab('he'); setShowForm(true); }} className="btn-primary flex items-center gap-2 !text-sm">
                        <Plus size={16} /> הוסף מוצר
                    </button>
                </div>
            </div>

            {showAnalytics && (
                <div className="mb-8 bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-x-auto">
                    <div className="flex items-center justify-between p-4 border-b border-[#d4af37]/10">
                        <h2 className="text-[#d4af37] font-bold flex items-center gap-2"><BarChart3 size={16} /> ביצועי מוצרים</h2>
                        <div className="flex gap-2">
                            {(['view_count', 'favorite_count', 'review_count', 'lead_count'] as const).map((key) => {
                                const labels: Record<string, string> = { view_count: 'צפיות', favorite_count: 'מועדפים', review_count: 'ביקורות', lead_count: 'פניות' };
                                return (
                                    <button key={key} onClick={() => setAnalyticsSortKey(key)} className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${analyticsSortKey === key ? 'bg-[#d4af37]/20 border-[#d4af37]/50 text-[#d4af37]' : 'border-[#d4af37]/10 text-[#f0e6d3]/40 hover:text-[#f0e6d3]/70'}`}>
                                        {labels[key]}
                                    </button>
                                );
                            })}
                            <button onClick={loadAnalytics} disabled={analyticsLoading} className="text-xs text-[#f0e6d3]/40 hover:text-[#f0e6d3]/70 px-2">
                                {analyticsLoading ? <Loader2 size={12} className="animate-spin" /> : '↻'}
                            </button>
                        </div>
                    </div>
                    {analyticsLoading ? (
                        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#d4af37]" size={24} /></div>
                    ) : (
                        <table className="w-full text-start">
                            <thead className="bg-[#111a2f] text-[#f0e6d3]/50 text-xs uppercase">
                                <tr>
                                    <th className="p-3 text-start">מוצר</th>
                                    <th className="p-3 text-start">עולם</th>
                                    <th className="p-3 text-center">צפיות</th>
                                    <th className="p-3 text-center">מועדפים</th>
                                    <th className="p-3 text-center">ביקורות</th>
                                    <th className="p-3 text-center">דירוג</th>
                                    <th className="p-3 text-center">פניות</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAnalytics.length === 0 && (
                                    <tr><td colSpan={7} className="p-6 text-center text-[#f0e6d3]/30 text-sm">אין נתונים</td></tr>
                                )}
                                {sortedAnalytics.map((row) => (
                                    <tr key={row.id} className="border-t border-[#d4af37]/10 text-[#f0e6d3] text-sm hover:bg-[#111a2f]/50 transition-colors">
                                        <td className="p-3 font-semibold max-w-[200px] truncate">{row.title_he}</td>
                                        <td className="p-3 text-[#f0e6d3]/60">{VERTICAL_LABEL[row.vertical] ?? row.vertical}</td>
                                        <td className="p-3 text-center">
                                            <span className={`font-bold ${row.view_count > 0 ? 'text-blue-400' : 'text-[#f0e6d3]/20'}`}>{row.view_count ?? 0}</span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`font-bold ${row.favorite_count > 0 ? 'text-red-400' : 'text-[#f0e6d3]/20'}`}>{row.favorite_count ?? 0}</span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`font-bold ${row.review_count > 0 ? 'text-green-400' : 'text-[#f0e6d3]/20'}`}>{row.review_count ?? 0}</span>
                                        </td>
                                        <td className="p-3 text-center">
                                            {row.avg_rating ? (
                                                <span className="text-[#d4af37] font-bold">{row.avg_rating} ★</span>
                                            ) : (
                                                <span className="text-[#f0e6d3]/20">-</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`font-bold ${row.lead_count > 0 ? 'text-[#d4af37]' : 'text-[#f0e6d3]/20'}`}>{row.lead_count ?? 0}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative">
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#f0e6d3]/30" />
                    <input
                        placeholder="חיפוש מוצר..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl pr-9 pl-4 py-2 text-sm text-[#f0e6d3] w-52"
                    />
                </div>
                <select value={filterVertical} onChange={(e) => { setFilterVertical(e.target.value); setFilterCategory(''); }} className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]">
                    <option value="">כל העולמות</option>
                    {verticals.map((v) => <option key={v.slug} value={v.slug}>{v.label_he}</option>)}
                </select>
                <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]">
                    <option value="">כל הסטטוסים</option>
                    <option value="active">פעילים בלבד</option>
                    <option value="hidden">מוסתרים בלבד</option>
                </select>
                {categories.length > 0 && (
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]">
                        <option value="">כל הקטגוריות</option>
                        {categories.filter((c) => !filterVertical || c.vertical === filterVertical).map((c) => (
                            <option key={c.id} value={c.id}>{c.label_he}</option>
                        ))}
                    </select>
                )}
                <button onClick={() => setSortKey(sortKey === 'price' ? 'title_he' : 'price')} className="flex items-center gap-2 bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]">
                    <ArrowUpDown size={14} /> מיין לפי {sortKey === 'price' ? 'מחיר' : 'שם'}
                </button>
            </div>

            {selectedIds.size > 0 && (
                <div className="flex flex-wrap items-center gap-3 mb-4 bg-[#0e1628] border border-[#d4af37]/30 rounded-2xl px-5 py-3">
                    <span className="text-sm font-bold text-[#d4af37]">{selectedIds.size} נבחרו</span>
                    {selectedVerticals.size > 1 ? (
                        <span className="text-xs text-[#f0e6d3]/40">בחרת מוצרים מכמה עולמות שונים — אפשר לתייג קטגוריה רק למוצרים מאותו עולם</span>
                    ) : (
                        <select value={bulkCategoryValue} onChange={(e) => setBulkCategoryValue(e.target.value)} className="bg-[#111a2f] border border-[#d4af37]/20 rounded-xl px-3 py-1.5 text-xs text-[#f0e6d3]">
                            <option value="" disabled>בחר קטגוריה...</option>
                            <option value={BULK_CLEAR_VALUE}>ללא קטגוריה (נקה)</option>
                            {bulkCategoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label_he}</option>)}
                        </select>
                    )}
                    <button
                        onClick={handleBulkApplyCategory}
                        disabled={bulkCategoryLoading || selectedVerticals.size > 1 || bulkCategoryValue === ''}
                        className="bg-[#d4af37] text-[#080d1f] px-4 py-1.5 rounded-xl text-xs font-black disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {bulkCategoryLoading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} החל קטגוריה
                    </button>
                    <button onClick={clearSelection} className="text-xs text-[#f0e6d3]/40 hover:text-[#f0e6d3]"><X size={14} /></button>
                </div>
            )}

            {selectedIds.size > 0 && activeBundles.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 mb-4 bg-[#0e1628] border border-[#d4af37]/30 rounded-2xl px-5 py-3">
                    <span className="text-sm font-bold text-[#d4af37]">{selectedIds.size} נבחרו</span>
                    <select value={bulkBundleValue} onChange={(e) => setBulkBundleValue(e.target.value)} className="bg-[#111a2f] border border-[#d4af37]/20 rounded-xl px-3 py-1.5 text-xs text-[#f0e6d3]">
                        <option value="" disabled>בחר סל מבצע כמות...</option>
                        <option value={BULK_CLEAR_VALUE}>ללא סל מבצע (נקה)</option>
                        {activeBundles.map((b) => <option key={b.id} value={b.id}>{b.name_he} ({b.bundle_code})</option>)}
                    </select>
                    <button
                        onClick={handleBulkApplyBundle}
                        disabled={bulkBundleLoading || bulkBundleValue === ''}
                        className="bg-[#d4af37] text-[#080d1f] px-4 py-1.5 rounded-xl text-xs font-black disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {bulkBundleLoading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} החל סל מבצע
                    </button>
                    <button onClick={clearSelection} className="text-xs text-[#f0e6d3]/40 hover:text-[#f0e6d3]"><X size={14} /></button>
                </div>
            )}

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={32} />
            ) : (
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-x-auto">
                    <table className="w-full text-start">
                        <thead className="bg-[#111a2f] text-[#f0e6d3]/60 text-xs uppercase">
                            <tr>
                                <th className="p-4 text-start w-8">
                                    <button onClick={() => toggleSelectAll(filtered.map((p) => p.id))} className="text-[#f0e6d3]/40 hover:text-[#d4af37] transition-colors">
                                        {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
                                    </button>
                                </th>
                                <th className="p-3 w-14"></th>
                                <th className="p-4 text-start">עולם</th>
                                <th className="p-4 text-start">כותרת</th>
                                <th className="p-4 text-start">קטגוריה</th>
                                <th className="p-4 text-start">שפות</th>
                                <th className="p-4 text-start">מחיר</th>
                                <th className="p-4 text-start">סטטוס</th>
                                <th className="p-4 text-start"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={9} className="p-8 text-center text-[#f0e6d3]/40">אין מוצרים עדיין</td></tr>
                            )}
                            {filtered.map((p) => {
                                const translatedCount = [p.title_en, p.title_fr, p.title_yi].filter(Boolean).length;
                                const isSelected = selectedIds.has(p.id);
                                return (
                                    <tr key={p.id} className="border-t border-[#d4af37]/10 text-[#f0e6d3]">
                                        <td className="p-4">
                                            <button onClick={() => toggleSelect(p.id)} className="text-[#f0e6d3]/40 hover:text-[#d4af37] transition-colors">
                                                {isSelected ? <CheckSquare size={14} className="text-[#d4af37]" /> : <Square size={14} />}
                                            </button>
                                        </td>
                                        <td className="p-3">
                                            {p.image_url ? (
                                                <img src={productImageUrl(p.image_url)} alt="" className="w-10 h-10 rounded-lg object-cover bg-[#111a2f]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-[#111a2f] flex items-center justify-center">
                                                    <ImagePlus size={13} className="text-[#f0e6d3]/20" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm">{VERTICAL_LABEL[p.vertical] ?? p.vertical}</td>
                                        <td className="p-4 font-semibold">{p.title_he}</td>
                                        <td className="p-4 text-sm text-[#f0e6d3]/60">{p.category?.label_he ?? '-'}</td>
                                        <td className="p-4">
                                            <span className={`text-xs font-bold flex items-center gap-1 ${translatedCount === 3 ? 'text-green-400' : translatedCount > 0 ? 'text-[#d4af37]/70' : 'text-[#f0e6d3]/20'}`}>
                                                <Languages size={12} />
                                                {translatedCount}/3
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm">
                                            {p.sale_price && p.sale_price > 0 && p.price ? (
                                                <div className="flex flex-col">
                                                    <span className="text-[#f0e6d3]/30 line-through text-xs">₪{Number(p.price).toLocaleString()}</span>
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="text-[#d4af37] font-bold">₪{Number(p.sale_price).toLocaleString()}</span>
                                                        <span className="bg-[#d4af37]/15 text-[#d4af37] text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                                            ‑{Math.round((1 - p.sale_price / p.price) * 100)}%
                                                        </span>
                                                    </span>
                                                </div>
                                            ) : (
                                                p.price ? `₪${Number(p.price).toLocaleString()}` : '-'
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleToggleActive(p)}
                                                disabled={togglingId === p.id}
                                                title={p.is_active ? 'הסתר מוצר' : 'הצג מוצר'}
                                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${p.is_active ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-[#111a2f] text-[#f0e6d3]/40 hover:bg-[#1a2540]'}`}
                                            >
                                                {togglingId === p.id ? <Loader2 size={12} className="animate-spin" /> : p.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                                                {p.is_active ? 'פעיל' : 'מוסתר'}
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <Link href={`/${locale}/products?id=${p.id}`} target="_blank" className="text-[#f0e6d3]/25 hover:text-[#f0e6d3]/60 transition-colors" title="צפייה בדף המוצר באתר">
                                                    <ExternalLink size={15} />
                                                </Link>
                                                <button onClick={() => openEditForm(p)} className="text-[#d4af37]/50 hover:text-[#d4af37] transition-colors" title="עריכה">
                                                    <Pencil size={15} />
                                                </button>
                                                <button onClick={() => handleDuplicate(p)} className="text-[#f0e6d3]/25 hover:text-[#f0e6d3]/60 transition-colors" title="שכפל מוצר">
                                                    <Copy size={15} />
                                                </button>
                                                {deletingId === p.id ? (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="text-[#f0e6d3]/50">בטוח?</span>
                                                        <button onClick={() => handleDelete(p.id)} className="text-red-400 font-bold hover:text-red-300">כן</button>
                                                        <button onClick={() => setDeletingId(null)} className="text-[#f0e6d3]/40 hover:text-[#f0e6d3]">לא</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setDeletingId(p.id)} className="text-red-400/40 hover:text-red-400 transition-colors" title="מחיקה">
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add / Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6" onClick={closeForm}>
                    <form onSubmit={handleSubmit} className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-lg space-y-4 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-[#f0e6d3]">{editProduct ? 'עריכת מוצר' : 'הוסף מוצר'}</h2>
                            <button type="button" onClick={closeForm}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>

                        {/* Vertical */}
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">עולם המוצר</label>
                            <select value={form.vertical} onChange={(e) => setForm({ ...form, vertical: e.target.value, vendor_id: '', category_id: '' })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]">
                                {activeVerticals.map((v) => <option key={v.slug} value={v.slug}>{v.label_he}</option>)}
                                {editProduct && !activeVerticals.some((v) => v.slug === form.vertical) && (
                                    <option value={form.vertical}>{VERTICAL_LABEL[form.vertical] || form.vertical}</option>
                                )}
                            </select>
                        </div>

                        {/* Vendor */}
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">ספק / חנות (קובע זמינות לפגישות)</label>
                            <select value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]">
                                <option value="">ללא ספק</option>
                                {vendors.filter((v) => v.vertical === form.vertical).map((v) => (
                                    <option key={v.id} value={v.id}>{v.name_he}</option>
                                ))}
                            </select>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">קטגוריה</label>
                            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]">
                                <option value="">ללא קטגוריה</option>
                                {formCategories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.label_he}</option>
                                ))}
                            </select>
                            {formCategories.length === 0 && (
                                <p className="text-[11px] text-[#f0e6d3]/30 mt-1">אין קטגוריות לעולם זה עדיין — ניתן להוסיף בעמוד &quot;קטגוריות&quot;</p>
                            )}
                        </div>

                        {/* Quantity discount bundle */}
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">סל מבצע כמות</label>
                            <select value={form.quantity_discount_bundle_id} onChange={(e) => setForm({ ...form, quantity_discount_bundle_id: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]">
                                <option value="">ללא סל מבצע</option>
                                {activeBundles.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name_he} ({b.bundle_code})</option>
                                ))}
                            </select>
                            {activeBundles.length === 0 && (
                                <p className="text-[11px] text-[#f0e6d3]/30 mt-1">אין סלי מבצע עדיין — ניתן להוסיף בעמוד &quot;מבצעי כמות&quot;</p>
                            )}
                        </div>

                        {/* Language tabs */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs text-[#f0e6d3]/50">תוכן המוצר</label>
                                <button
                                    type="button"
                                    onClick={handleTranslate}
                                    disabled={translating || !form.title_he.trim() || !translateAvailable}
                                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#d4af37]/10 text-[#d4af37] hover:bg-[#d4af37]/20 disabled:opacity-40 transition-colors"
                                    title={translateAvailable ? 'תרגם אוטומטית לאנגלית, צרפתית וייִדיש' : 'תרגום אוטומטי לא זמין — ANTHROPIC_API_KEY לא מוגדר בשרת'}
                                >
                                    {translating ? <Loader2 size={13} className="animate-spin" /> : <Languages size={13} />}
                                    {translating ? 'מתרגם...' : 'תרגם אוטומטית'}
                                </button>
                            </div>

                            {/* Tab selector */}
                            <div className="flex gap-1 bg-[#111a2f] rounded-xl p-1 mb-3">
                                {LANGS.map((l) => {
                                    const filled = l.key === 'he' ? !!form.title_he : !!(form as unknown as Record<string, string>)[`title_${l.key}`];
                                    return (
                                        <button
                                            key={l.key}
                                            type="button"
                                            onClick={() => setLangTab(l.key as 'he' | 'en' | 'fr' | 'yi')}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all relative ${langTab === l.key ? 'bg-[#d4af37] text-[#080d1f]' : 'text-[#f0e6d3]/50 hover:text-[#f0e6d3]'}`}
                                        >
                                            {l.label}
                                            {filled && l.key !== 'he' && (
                                                <span className={`absolute top-0.5 left-1 w-1.5 h-1.5 rounded-full ${langTab === l.key ? 'bg-[#080d1f]/40' : 'bg-[#d4af37]'}`} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Title + description for active tab */}
                            <div className="space-y-3" dir={activeLang.dir}>
                                <div>
                                    <label className="text-xs text-[#f0e6d3]/50 mb-1 block">כותרת {langTab === 'he' && <span className="text-red-400">*</span>}</label>
                                    <input
                                        required={langTab === 'he'}
                                        placeholder={langTab === 'he' ? 'לדוגמה: יהלום 1 קרט' : ''}
                                        value={(form as unknown as Record<string, string>)[`title_${langTab}`]}
                                        onChange={(e) => setForm({ ...form, [`title_${langTab}`]: e.target.value })}
                                        className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-[#f0e6d3]/50 mb-1 block">תיאור {langTab === 'he' && <span className="text-red-400">*</span>}</label>
                                    <textarea
                                        required={langTab === 'he'}
                                        placeholder={langTab === 'he' ? 'תיאור קצר של המוצר...' : ''}
                                        value={(form as unknown as Record<string, string>)[`description_${langTab}`]}
                                        onChange={(e) => setForm({ ...form, [`description_${langTab}`]: e.target.value })}
                                        rows={3}
                                        className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3] resize-none"
                                    />
                                </div>
                            </div>

                            {hasTranslations && (
                                <p className="text-xs text-green-400/60 mt-2 flex items-center gap-1">
                                    <CheckCircle2 size={11} /> תרגומים זמינים — בדוק ועדן לפי הצורך
                                </p>
                            )}
                        </div>

                        {/* Price */}
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">מחיר (₪)</label>
                            <input type="number" min={0} placeholder="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                        </div>

                        {/* Sale price / discount % — two-way sync, only sale_price is submitted */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-[#f0e6d3]/50 mb-1 block">מחיר מבצע סופי (₪)</label>
                                <input
                                    type="number"
                                    min={0}
                                    placeholder="0 = ללא מבצע"
                                    value={form.sale_price}
                                    onChange={(e) => handleSalePriceChange(e.target.value)}
                                    className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-[#f0e6d3]/50 mb-1 block">אחוז הנחה</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    placeholder="0"
                                    disabled={!form.price}
                                    value={form.discount_percent}
                                    onChange={(e) => handleDiscountPercentChange(e.target.value)}
                                    className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3] disabled:opacity-40"
                                />
                            </div>
                        </div>
                        {!form.price && form.sale_price && (
                            <p className="text-[11px] text-red-400/70">יש להזין מחיר רגיל לפני הגדרת מחיר מבצע</p>
                        )}

                        {/* Vertical-specific attributes */}
                        {verticalAttrs.length > 0 && (
                            <div>
                                <label className="text-xs text-[#f0e6d3]/50 mb-3 block font-bold uppercase tracking-wider">מאפיינים ({VERTICAL_LABEL[form.vertical]})</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {verticalAttrs.map((field) => (
                                        <div key={field.key}>
                                            <label className="text-[11px] text-[#f0e6d3]/40 mb-1 block">{field.label}</label>
                                            {field.type === 'select' ? (
                                                <select
                                                    value={form.attributes[field.key] || ''}
                                                    onChange={(e) => setForm({ ...form, attributes: { ...form.attributes, [field.key]: e.target.value } })}
                                                    className="w-full bg-[#111a2f] rounded-xl px-3 py-2 text-sm text-[#f0e6d3]"
                                                >
                                                    <option value="">—</option>
                                                    {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            ) : (
                                                <input
                                                    type={field.type}
                                                    placeholder={field.placeholder}
                                                    value={form.attributes[field.key] || ''}
                                                    onChange={(e) => setForm({ ...form, attributes: { ...form.attributes, [field.key]: e.target.value } })}
                                                    className="w-full bg-[#111a2f] rounded-xl px-3 py-2 text-sm text-[#f0e6d3]"
                                                    dir="ltr"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Image */}
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">תמונת מוצר</label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file || !token) return;
                                    setUploadingImage(true);
                                    try {
                                        const { filename } = await adminUploadImage(token, file);
                                        setForm((f) => ({ ...f, image_url: filename }));
                                        showToast('התמונה הועלתה בהצלחה ✓');
                                    } catch {
                                        showToast('שגיאה בהעלאת תמונה', 'error');
                                    } finally {
                                        setUploadingImage(false);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }
                                }}
                            />
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-start flex items-center gap-3 hover:bg-[#1a2540] disabled:opacity-60 transition-colors">
                                {uploadingImage ? <Loader2 size={18} className="text-[#d4af37]/60 shrink-0 animate-spin" /> : <ImagePlus size={18} className="text-[#d4af37]/60 shrink-0" />}
                                <span className={form.image_url ? 'text-[#f0e6d3]' : 'text-[#f0e6d3]/30'}>
                                    {uploadingImage ? 'מעלה...' : form.image_url || 'לחץ לבחירת תמונה...'}
                                </span>
                            </button>
                            {form.image_url && (
                                <p className="text-green-400/60 text-xs mt-1">התמונה הועלתה: {form.image_url}</p>
                            )}
                        </div>

                        <button type="submit" className="btn-primary w-full">{editProduct ? 'שמור שינויים' : 'שמור'}</button>
                    </form>
                </div>
            )}

            {/* CSV Import Modal */}
            {showCsvModal && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6" onClick={() => setShowCsvModal(false)}>
                    <div className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-[#f0e6d3]">ייבוא מוצרים מ-CSV</h2>
                            <button onClick={() => setShowCsvModal(false)}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>
                        <div className="text-xs text-[#f0e6d3]/50 space-y-1">
                            <p className="font-bold text-[#d4af37]/80 mb-2">עמודות נדרשות:</p>
                            <p><code className="text-[#f0e6d3]/70">vertical</code> — {verticals.map((v) => v.slug).join(' | ')}</p>
                            <p><code className="text-[#f0e6d3]/70">title_he</code> — כותרת בעברית (חובה)</p>
                            <p><code className="text-[#f0e6d3]/70">description_he</code>, <code className="text-[#f0e6d3]/70">price</code>, <code className="text-[#f0e6d3]/70">image</code>, <code className="text-[#f0e6d3]/70">is_active</code>, <code className="text-[#f0e6d3]/70">attributes</code> (JSON)</p>
                            <p className="pt-1"><code className="text-[#f0e6d3]/70">sale_price</code> (מחיר מבצע, 0 = ללא), <code className="text-[#f0e6d3]/70">vendor_id</code>, <code className="text-[#f0e6d3]/70">category_id</code>, <code className="text-[#f0e6d3]/70">quantity_discount_bundle_id</code> — כולן אופציונליות, לפי מזהה מספרי (ID)</p>
                        </div>
                        <div
                            className="border-2 border-dashed border-[#d4af37]/20 rounded-2xl p-8 text-center cursor-pointer hover:border-[#d4af37]/40 transition-colors"
                            onClick={() => csvInputRef.current?.click()}
                        >
                            <Upload size={28} className="mx-auto mb-2 text-[#d4af37]/40" />
                            <p className="text-sm text-[#f0e6d3]/60">{csvFile ? csvFile.name : 'לחץ לבחירת קובץ CSV'}</p>
                            <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
                        </div>
                        <button
                            onClick={handleCsvImport}
                            disabled={!csvFile || importingCsv}
                            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {importingCsv ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            {importingCsv ? 'מייבא...' : 'ייבא מוצרים'}
                        </button>
                    </div>
                </div>
            )}

            {/* Batch Modal */}
            {showBatchForm && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6" onClick={() => setShowBatchForm(false)}>
                    <div className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-[#f0e6d3]">הוסף מקבץ מוצרים (JSON)</h2>
                            <button onClick={() => setShowBatchForm(false)}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>
                        <p className="text-xs text-[#f0e6d3]/60">לדוגמה: [{"{"}&quot;vertical&quot;:&quot;cars&quot;,&quot;title_he&quot;:&quot;...&quot;,&quot;description_he&quot;:&quot;...&quot;{"}"}]</p>
                        {batchError && <p className="text-red-400 text-sm">{batchError}</p>}
                        <textarea rows={8} value={batchJson} onChange={(e) => setBatchJson(e.target.value)} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3] font-mono text-xs" />
                        <button onClick={handleBatchCreate} className="btn-primary w-full">העלה מקבץ</button>
                    </div>
                </div>
            )}
        </div>
    );
}
