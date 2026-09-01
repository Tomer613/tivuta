'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ListChecks, Trash2, RotateCcw, Search, Plus, ShoppingCart, CheckSquare, Square } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useVerticals } from '@/lib/useVerticals';
import { getErrorMessage } from '@/lib/getErrorMessage';
import QuantityStepper from '@/components/QuantityStepper';
import {
    getShoppingList, refreshShoppingList, addShoppingListItem, updateShoppingListItem, removeShoppingListItem,
    getProducts, productImageUrl, ShoppingListItem,
} from '@/lib/api';
import { Product } from '@/components/ProductTile';

interface T {
    title: string;
    empty: string;
    select_all: string;
    deselect_all: string;
    refresh_from_history: string;
    add_product: string;
    search_placeholder: string;
    add_to_cart: string;
    no_selection: string;
    dec_qty: string;
    inc_qty: string;
    remove: string;
    on_request: string;
    back_to_world: string;
    loading_error: string;
}

const translations: Record<string, T> = {
    he: { title: 'רשימת הקניות שלי', empty: 'רשימת הקניות ריקה — הוסף מוצרים למטה.', select_all: 'סמן הכל', deselect_all: 'בטל הכל', refresh_from_history: 'הוסף פריטים נוספים מההיסטוריה', add_product: 'הוסף מוצר', search_placeholder: 'חיפוש מוצר...', add_to_cart: 'הוסף לסל', no_selection: 'לא נבחרו פריטים', dec_qty: 'הפחת כמות', inc_qty: 'הוסף כמות', remove: 'הסר', on_request: 'לפי בקשה', back_to_world: 'חזרה לעולם', loading_error: 'שגיאה בטעינת הרשימה' },
    en: { title: 'My Shopping List', empty: 'Your shopping list is empty — add products below.', select_all: 'Select all', deselect_all: 'Deselect all', refresh_from_history: 'Add more items from my history', add_product: 'Add product', search_placeholder: 'Search product...', add_to_cart: 'Add to cart', no_selection: 'No items selected', dec_qty: 'Decrease quantity', inc_qty: 'Increase quantity', remove: 'Remove', on_request: 'On request', back_to_world: 'Back to world', loading_error: 'Failed to load list' },
    fr: { title: 'Ma liste de courses', empty: 'Votre liste de courses est vide — ajoutez des produits ci-dessous.', select_all: 'Tout sélectionner', deselect_all: 'Tout désélectionner', refresh_from_history: 'Ajouter plus d’articles depuis mon historique', add_product: 'Ajouter un produit', search_placeholder: 'Rechercher un produit...', add_to_cart: 'Ajouter au panier', no_selection: 'Aucun article sélectionné', dec_qty: 'Réduire la quantité', inc_qty: 'Augmenter la quantité', remove: 'Retirer', on_request: 'Sur demande', back_to_world: 'Retour au monde', loading_error: 'Échec du chargement de la liste' },
    yi: { title: 'מיין קוילע רשימה', empty: 'דיין קוילע רשימה איז ליידיג — לייג צו פראדוקטן אונטן.', select_all: 'סמן אלץ', deselect_all: 'אויסמעקן אלץ', refresh_from_history: 'לייג צו נאך פריטים פון היסטאריע', add_product: 'לייג צו פראדוקט', search_placeholder: 'זוכן פראדוקט...', add_to_cart: 'לייג צו קארב', no_selection: 'קיין פריטים אויסגעקליבן', dec_qty: 'רעדוצירן כמות', inc_qty: 'פארמערן כמות', remove: 'אנטפערנען', on_request: 'אויף פארלאנג', back_to_world: 'צוריק צו וועלט', loading_error: 'טעות לאדן רשימה' },
};

export default function ShoppingListClient() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const locale = (params?.locale as string) || 'he';
    const localeKey = locale as 'he' | 'en' | 'fr' | 'yi';
    const t = translations[locale] || translations.he;
    const { token } = useAuth();
    const { addToCart } = useCart();
    const verticals = useVerticals();
    const vertical = searchParams?.get('vertical') || '';
    const verticalMeta = verticals.find((v) => v.slug === vertical) || null;
    const verticalLabel = verticalMeta ? (verticalMeta[`label_${localeKey}`] || verticalMeta.label_he) : vertical;

    const [items, setItems] = useState<ShoppingListItem[]>([]);
    const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [addQuery, setAddQuery] = useState('');
    const [candidates, setCandidates] = useState<Product[]>([]);

    const load = () => {
        if (!token || !vertical) return;
        Promise.resolve().then(() => { setLoading(true); setError(null); });
        getShoppingList(token, vertical)
            .then((data) => {
                setItems(data);
                setCheckedIds(new Set(data.map((i) => i.id)));
            })
            .catch((err) => setError(getErrorMessage(err, t.loading_error)))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [token, vertical]);

    useEffect(() => {
        if (!token || !vertical) return;
        getProducts(token, vertical).then(setCandidates).catch(() => setCandidates([]));
    }, [token, vertical]);

    const listedProductIds = useMemo(() => new Set(items.map((i) => i.product_id)), [items]);
    const filteredCandidates = useMemo(() => {
        if (!addQuery.trim()) return [];
        const q = addQuery.toLowerCase();
        return candidates
            .filter((p) => !listedProductIds.has(p.id) && p.is_active !== false)
            .filter((p) => (p[`title_${localeKey}`] || p.title_he || '').toLowerCase().includes(q))
            .slice(0, 8);
    }, [candidates, addQuery, listedProductIds, localeKey]);

    const toggleAll = (checked: boolean) => setCheckedIds(checked ? new Set(items.map((i) => i.id)) : new Set());
    const toggleOne = (id: number) => setCheckedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const handleQuantityChange = async (item: ShoppingListItem, quantity: number) => {
        if (!token || quantity < 1) return;
        setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, quantity } : i));
        try {
            await updateShoppingListItem(token, item.id, quantity);
        } catch {
            load();
        }
    };

    const handleRemove = async (item: ShoppingListItem) => {
        if (!token) return;
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setCheckedIds((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
        try {
            await removeShoppingListItem(token, item.id);
        } catch {
            load();
        }
    };

    const handleRefreshFromHistory = async () => {
        if (!token || !vertical) return;
        setRefreshing(true);
        try {
            const data = await refreshShoppingList(token, vertical);
            const newIds = data.filter((i) => !items.some((existing) => existing.id === i.id)).map((i) => i.id);
            setItems(data);
            setCheckedIds((prev) => new Set([...prev, ...newIds]));
        } catch (err) {
            setError(getErrorMessage(err, t.loading_error));
        } finally {
            setRefreshing(false);
        }
    };

    const handleAddProduct = async (product: Product) => {
        if (!token) return;
        setAddQuery('');
        try {
            const item = await addShoppingListItem(token, product.id, 1);
            setItems((prev) => [...prev, item]);
            setCheckedIds((prev) => new Set([...prev, item.id]));
        } catch {
            /* ignore — a transient failure just means the item won't appear */
        }
    };

    const handleAddToCart = () => {
        const checked = items.filter((i) => checkedIds.has(i.id));
        for (const item of checked) {
            addToCart({
                id: item.product_id,
                vertical,
                title_he: item.product_title_he,
                title_en: item.product_title_en,
                title_fr: item.product_title_fr,
                title_yi: item.product_title_yi,
                image_url: item.product_image_url,
                price: item.product_price,
                sale_price: item.product_sale_price,
                quantity_discount_bundle_id: null,
                quantity_discount_tiers: null,
            }, item.quantity);
        }
        router.push(`/${locale}/cart`);
    };

    const allChecked = items.length > 0 && checkedIds.size === items.length;
    const selectedCount = checkedIds.size;

    if (!vertical) {
        return (
            <main className="min-h-screen bg-[#111a2f] flex items-center justify-center px-6">
                <p className="text-[#f0e6d3]/50">{t.empty}</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#111a2f] py-12 px-6">
            <div className="max-w-2xl mx-auto">
                <Link href={`/${locale}/world?slug=${vertical}`} className="text-xs text-[#f0e6d3]/40 hover:text-[#d4af37] mb-4 inline-block">
                    &larr; {t.back_to_world}
                </Link>
                <h1 className="text-3xl font-black text-[#f0e6d3] mb-1 flex items-center gap-3">
                    <ListChecks size={28} className="text-[#d4af37]" />
                    {t.title}
                </h1>
                <p className="text-[#f0e6d3]/50 mb-8">{verticalLabel}</p>

                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="animate-spin text-[#d4af37]" size={32} />
                    </div>
                ) : (
                    <>
                        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                        {items.length > 0 && (
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    type="button"
                                    onClick={() => toggleAll(!allChecked)}
                                    className="flex items-center gap-2 text-sm font-bold text-[#d4af37] hover:text-[#e8c757] transition-colors"
                                >
                                    {allChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                                    {allChecked ? t.deselect_all : t.select_all}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRefreshFromHistory}
                                    disabled={refreshing}
                                    className="flex items-center gap-1.5 text-xs text-[#f0e6d3]/50 hover:text-[#d4af37] transition-colors disabled:opacity-50"
                                >
                                    {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                                    {t.refresh_from_history}
                                </button>
                            </div>
                        )}

                        {items.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-[#f0e6d3]/50 mb-4">{t.empty}</p>
                                <button
                                    type="button"
                                    onClick={handleRefreshFromHistory}
                                    disabled={refreshing}
                                    className="btn-secondary inline-flex items-center gap-2 !text-sm"
                                >
                                    {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                    {t.refresh_from_history}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3 mb-6">
                                {items.map((item) => {
                                    const title = item[`product_title_${localeKey}`] || item.product_title_he;
                                    const checked = checkedIds.has(item.id);
                                    return (
                                        <div key={item.id} className={`flex items-center gap-3 bg-[#0e1628] border rounded-2xl p-3 transition-colors ${checked ? 'border-[#d4af37]/30' : 'border-[#f0e6d3]/10 opacity-60'}`}>
                                            <button
                                                type="button"
                                                onClick={() => toggleOne(item.id)}
                                                aria-label={title || ''}
                                                className="shrink-0 text-[#d4af37]"
                                            >
                                                {checked ? <CheckSquare size={20} /> : <Square size={20} className="text-[#f0e6d3]/30" />}
                                            </button>
                                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#111a2f] shrink-0">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={productImageUrl(item.product_image_url)} alt={title || ''} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-[#f0e6d3] truncate text-sm">{title}</p>
                                                {!item.product_is_active && (
                                                    <p className="text-[10px] text-red-400/70">{t.loading_error}</p>
                                                )}
                                                <p className="text-[#d4af37] text-xs font-black">
                                                    {verticalMeta?.hide_prices || !item.product_price
                                                        ? t.on_request
                                                        : `₪${item.product_price.toLocaleString()}`}
                                                </p>
                                            </div>
                                            <QuantityStepper
                                                qty={item.quantity}
                                                size="sm"
                                                decDisabled={item.quantity <= 1}
                                                incDisabled={item.quantity >= 99}
                                                decLabel={t.dec_qty}
                                                incLabel={t.inc_qty}
                                                onDec={() => handleQuantityChange(item, item.quantity - 1)}
                                                onInc={() => handleQuantityChange(item, item.quantity + 1)}
                                            />
                                            <button
                                                type="button"
                                                aria-label={t.remove}
                                                onClick={() => handleRemove(item)}
                                                className="text-[#f0e6d3]/30 hover:text-red-400 transition-colors shrink-0"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mb-8">
                            <label className="text-xs text-[#f0e6d3]/50 mb-2 block font-bold uppercase tracking-wider">{t.add_product}</label>
                            <div className="relative">
                                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[#f0e6d3]/30 pointer-events-none" />
                                <input
                                    type="text"
                                    value={addQuery}
                                    onChange={(e) => setAddQuery(e.target.value)}
                                    placeholder={t.search_placeholder}
                                    className="w-full bg-[#0e1628] border border-[#d4af37]/20 rounded-xl ps-9 pe-4 py-3 text-sm text-[#f0e6d3] placeholder-[#f0e6d3]/30 focus:outline-none focus:border-[#d4af37]/50"
                                />
                            </div>
                            {filteredCandidates.length > 0 && (
                                <div className="mt-2 bg-[#0e1628] border border-[#d4af37]/20 rounded-xl overflow-hidden divide-y divide-[#f0e6d3]/5">
                                    {filteredCandidates.map((p) => {
                                        const title = p[`title_${localeKey}`] || p.title_he;
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => handleAddProduct(p)}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#111a2f] transition-colors text-start"
                                            >
                                                <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#111a2f] shrink-0">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={productImageUrl(p.image_url)} alt={title || ''} className="w-full h-full object-cover" />
                                                </div>
                                                <span className="flex-1 text-sm text-[#f0e6d3] truncate">{title}</span>
                                                <Plus size={14} className="text-[#d4af37] shrink-0" />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleAddToCart}
                            disabled={selectedCount === 0}
                            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <ShoppingCart size={18} />
                            {selectedCount === 0 ? t.no_selection : `${t.add_to_cart} (${selectedCount})`}
                        </button>
                    </>
                )}
            </div>
        </main>
    );
}
