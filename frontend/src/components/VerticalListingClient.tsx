'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, PackageOpen, GitCompareArrows, ListChecks, RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getProducts, getFavoriteIds, getShoppingListIds, getVerticals, getMyPurchaseHistory, PurchaseHistoryItem, Vertical } from '@/lib/api';
import { useCategories } from '@/lib/useCategories';
import { useCart } from '@/context/CartContext';
import FilterSortSidebar, { SortOption } from '@/components/FilterSortSidebar';
import ProductTile, { Product } from '@/components/ProductTile';
import ComparisonBar from '@/components/ComparisonBar';

interface T {
    empty: string;
    results: string;
    shopping_list: string;
    quick_reorder: string;
}

// Empty-state/results copy is identical across every world, so it's kept as one shared
// translation rather than duplicated per-vertical in the database.
const GENERIC_COPY: Record<string, T> = {
    he: { empty: 'אין מוצרים להצגה כרגע', results: 'תוצאות', shopping_list: 'פתח את רשימת הקניות שלי', quick_reorder: 'הזמן שוב את הרגילים שלי' },
    en: { empty: 'No products to show right now', results: 'results', shopping_list: 'Open my shopping list', quick_reorder: 'Reorder my usual' },
    fr: { empty: 'Aucun produit pour le moment', results: 'résultats', shopping_list: 'Ouvrir ma liste de courses', quick_reorder: 'Recommander mes habitudes' },
    yi: { empty: 'נישטא קיין פראדוקטן איצט', results: 'רעזולטאטן', shopping_list: 'עפֿן מיין קוילע רשימה', quick_reorder: 'באשטעלן נאכאמאל מיינע געוויינטלעכע' },
};

export default function VerticalListingClient({ vertical }: { vertical: string }) {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const locale = (params?.locale as string) || 'he';
    const { token, isLoading: authLoading } = useAuth();
    const { addToCart } = useCart();
    const [products, setProducts] = useState<Product[]>([]);
    const [verticalMeta, setVerticalMeta] = useState<Vertical | null>(null);
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState<SortOption>('popularity');
    const [promotionType, setPromotionType] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [attrFilters, setAttrFilters] = useState<Record<string, string>>({});
    const [category, setCategory] = useState<number | null>(null);
    const [favIds, setFavIds] = useState<Set<number>>(new Set());
    const [compareList, setCompareList] = useState<Product[]>([]);
    const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryItem[]>([]);
    const [shoppingListIds, setShoppingListIds] = useState<Set<number>>(new Set());
    // Which vertical's metadata (title/attribute fields/default sort) the last completed
    // getVerticals() attempt was for — success or failure. Comparing this directly against the
    // current `vertical` (rather than a plain boolean flag) is what makes the gate self-correct
    // the instant `vertical` changes, with no separate reset effect needed: on the render right
    // after switching worlds, this still holds the *previous* vertical's slug, so the mismatch is
    // immediate and synchronous — a boolean reset via a deferred microtask cannot land before the
    // product-fetching effect below already ran once in the same pass with stale values.
    const [metaLoadedForVertical, setMetaLoadedForVertical] = useState<string | null>(null);
    const sortManuallySetRef = useRef(false);
    const categories = useCategories(vertical);

    const t = GENERIC_COPY[locale] || GENERIC_COPY.he;
    const localeKey = locale as 'he' | 'en' | 'fr' | 'yi';
    const title = (verticalMeta && (verticalMeta[`label_${localeKey}`] || verticalMeta.label_he)) || '';
    const subtitle = (verticalMeta && (verticalMeta[`subtitle_${localeKey}`] || verticalMeta.subtitle_he)) || '';
    const actionType: 'appointment' | 'contact' = verticalMeta?.supports_appointments ? 'appointment' : 'contact';

    // Backward compatibility: old shared links used ?product=ID to auto-open a popup;
    // that product now has its own real page, so redirect there instead.
    useEffect(() => {
        const productId = searchParams?.get('product');
        if (productId) router.replace(`/${locale}/products?id=${productId}`);
    }, [searchParams, locale, router]);

    // Reset per-vertical UI state whenever the world changes — including whether the visitor
    // already picked a sort manually, which should only "stick" while browsing this same world.
    // `sortManuallySetRef` is reset synchronously (it's a ref, not state) so it's guaranteed to be
    // correct before the metadata effect below's async result ever lands.
    useEffect(() => {
        sortManuallySetRef.current = false;
        Promise.resolve().then(() => {
            setAttrFilters({});
            setCategory(null);
            setLoading(true);
        });
    }, [vertical]);

    // Resolve vertical metadata (title/subtitle/attribute fields/default sort) first, and — unless
    // the visitor already chose a sort manually — seed `sort` from the vertical's configured
    // default before the product-fetching effect below is allowed to run. Fetching products in
    // parallel with this (as before) would race the initial "popularity" placeholder against the
    // real per-vertical default and cause a visible reorder flash on first load.
    useEffect(() => {
        if (!vertical) return;
        let cancelled = false;
        const forVertical = vertical;
        getVerticals()
            .then((verticals) => {
                if (cancelled) return;
                const meta = verticals.find((v) => v.slug === vertical) || null;
                setVerticalMeta(meta);
                if (meta && !sortManuallySetRef.current) {
                    setSort(meta.default_sort as SortOption);
                }
            })
            .catch(() => { if (!cancelled) setVerticalMeta(null); })
            .finally(() => { if (!cancelled) setMetaLoadedForVertical(forVertical); });
        return () => { cancelled = true; };
    }, [vertical]);

    // 'my_history' is a purely client-side re-sort (see the `filtered` memo below) — the
    // server-side request always asks for a real backend sort, falling back to popularity. Kept
    // out of the effect below and used as its own dependency (instead of raw `sort`) so toggling
    // between 'popularity' and 'my_history' — which both resolve to the same server request —
    // doesn't trigger a wasted refetch.
    const serverSort = sort === 'my_history' ? 'popularity' : sort;
    const enablesShoppingList = !!verticalMeta?.enables_shopping_list;

    useEffect(() => {
        if (!token || !vertical) { Promise.resolve().then(() => setLoading(false)); return; }
        if (metaLoadedForVertical !== vertical) return;
        Promise.resolve().then(() => setLoading(true));
        Promise.all([
            getProducts(token, vertical, serverSort, promotionType),
            getFavoriteIds(token),
            getMyPurchaseHistory(token, vertical),
            enablesShoppingList ? getShoppingListIds(token, vertical) : Promise.resolve([]),
        ])
            .then(([prods, ids, history, listIds]) => {
                setProducts(prods);
                setFavIds(new Set(ids));
                setPurchaseHistory(history);
                setShoppingListIds(new Set(listIds));
            })
            .catch(() => setProducts([]))
            .finally(() => setLoading(false));
    }, [token, vertical, serverSort, promotionType, metaLoadedForVertical, enablesShoppingList]);

    useEffect(() => {
        if (!title) return;
        const previous = document.title;
        document.title = `${title} | Tivuta`;
        return () => { document.title = previous; };
    }, [title]);

    const toggleCompare = (product: Product) => {
        setCompareList((prev) => {
            if (prev.some((p) => p.id === product.id)) return prev.filter((p) => p.id !== product.id);
            if (prev.length >= 3) return prev;
            return [...prev, product];
        });
    };

    const inCompare = (id: number) => compareList.some((p) => p.id === id);

    // "Quick reorder my usual" — a lower-friction alternative to opening the shopping list page:
    // bulk-adds this vertical's whole purchase-history basket (already fetched alongside the
    // product list, no extra request) straight to the cart at each item's last-purchased
    // quantity, then jumps to /cart. Only offered on enables_shopping_list worlds (see
    // Vertical.enables_shopping_list) — a one-off diamonds/cars purchase isn't something anyone
    // wants to "reorder," but a synagogue's recurring weekly Kiddush order is exactly this.
    const handleQuickReorder = () => {
        for (const entry of purchaseHistory) {
            addToCart({
                id: entry.product_id,
                vertical: entry.product_vertical,
                title_he: entry.product_title_he,
                title_en: entry.product_title_en,
                title_fr: entry.product_title_fr,
                title_yi: entry.product_title_yi,
                image_url: entry.product_image_url,
                price: entry.product_price,
                sale_price: entry.product_sale_price,
                quantity_discount_bundle_id: null,
                quantity_discount_tiers: null,
            }, entry.last_quantity);
        }
        router.push(`/${locale}/cart`);
    };

    const filtered = useMemo(() => {
        let list = products;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((p) => {
                const localeKey = locale as 'he' | 'en' | 'fr' | 'yi';
                const title = (p[`title_${localeKey}`] || p.title_he || '').toLowerCase();
                const desc = (p[`description_${localeKey}`] || p.description_he || '').toLowerCase();
                return title.includes(q) || desc.includes(q);
            });
        }
        if (priceMin !== '') list = list.filter((p) => (p.price ?? 0) >= Number(priceMin));
        if (priceMax !== '') list = list.filter((p) => p.price != null && p.price <= Number(priceMax));
        for (const [key, value] of Object.entries(attrFilters)) {
            if (!value) continue;
            list = list.filter((p) => p.attributes?.[key] === value);
        }
        if (category != null) list = list.filter((p) => p.category_id === category);
        if (sort === 'my_history' && purchaseHistory.length > 0) {
            // Rank by (times_purchased desc, last_purchased_at desc) — a product bought
            // repeatedly outranks one bought only once more recently.
            const ranked = [...purchaseHistory].sort((a, b) =>
                b.times_purchased - a.times_purchased ||
                new Date(b.last_purchased_at).getTime() - new Date(a.last_purchased_at).getTime()
            );
            const historyRank = new Map(ranked.map((h, i) => [h.product_id, i]));
            // Stable-sort by history rank (0 = most recently/frequently bought); products with no
            // history keep their existing relative order, pushed after every ranked product.
            list = [...list]
                .map((p, i) => ({ p, i, rank: historyRank.get(p.id) ?? Infinity }))
                .sort((a, b) => a.rank - b.rank || a.i - b.i)
                .map(({ p }) => p);
        }
        return list;
    }, [products, search, priceMin, priceMax, attrFilters, category, locale, sort, purchaseHistory]);

    const isFiltered = search.trim() || priceMin || priceMax || Object.values(attrFilters).some(Boolean) || category != null;

    if (authLoading || !token) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#d4af37]" size={36} />
            </div>
        );
    }

    // No slug at all (e.g. /world with no ?slug=) or a slug that doesn't match any world —
    // once loading has actually finished, never fall through to the products grid, which would
    // otherwise have queried GET /products with a blank vertical filter and shown every product
    // across every world unfiltered.
    if (!loading && (!vertical || !verticalMeta)) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-[#f0e6d3]/40">{t.empty}</p>
            </div>
        );
    }

    return (
        <>
        <main className={`min-h-screen bg-[#111a2f] ${compareList.length > 0 ? 'pb-32 sm:pb-40' : ''}`}>
            <header className="bg-[#0e1628] border-b border-[#d4af37]/20 px-4 py-8 md:px-8 md:py-16">
                <div className="max-w-7xl mx-auto text-start flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-[#f0e6d3] mb-3">{title}</h1>
                        <p className="text-xl text-[#f0e6d3]/60 font-light">{subtitle}</p>
                        {isFiltered && !loading && (
                            <p className="text-sm text-[#d4af37]/70 mt-2 font-semibold">{filtered.length} {t.results}</p>
                        )}
                    </div>
                    {verticalMeta?.enables_shopping_list && (
                        <div className="flex flex-wrap gap-2 shrink-0">
                            {purchaseHistory.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleQuickReorder}
                                    className="btn-primary flex items-center gap-2 !text-sm"
                                >
                                    <RotateCcw size={16} />
                                    {t.quick_reorder}
                                </button>
                            )}
                            <Link
                                href={`/${locale}/shopping-list?vertical=${vertical}`}
                                className="btn-secondary flex items-center gap-2 !text-sm"
                            >
                                <ListChecks size={16} />
                                {t.shopping_list}
                            </Link>
                        </div>
                    )}
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-8 md:px-8 md:py-12 flex flex-col lg:flex-row gap-8 lg:gap-12">
                {/* Only rendered once metadata for THIS vertical has resolved — otherwise the sort
                    control would briefly show the initial 'popularity' placeholder selected before
                    jumping to the vertical's real configured default. Doesn't hide on a later
                    sort-only refetch (metaLoadedForVertical isn't touched by that), only during the
                    initial per-vertical resolution window. */}
                {metaLoadedForVertical === vertical && <FilterSortSidebar
                    locale={locale}
                    sort={sort}
                    onSortChange={(value) => { sortManuallySetRef.current = true; setSort(value); }}
                    promotionType={promotionType}
                    onPromotionTypeChange={setPromotionType}
                    search={search}
                    onSearchChange={setSearch}
                    priceMin={priceMin}
                    onPriceMinChange={setPriceMin}
                    priceMax={priceMax}
                    onPriceMaxChange={setPriceMax}
                    attributeFields={verticalMeta?.attribute_fields}
                    attrFilters={attrFilters}
                    onAttrFilterChange={(key, value) => setAttrFilters((prev) => ({ ...prev, [key]: value }))}
                    categories={categories}
                    category={category}
                    onCategoryChange={setCategory}
                    hasPurchaseHistory={purchaseHistory.length > 0}
                />}

                <div className="flex-grow">
                    {loading ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 className="animate-spin text-[#d4af37]" size={32} />
                        </div>
                    ) : filtered.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {filtered.map((p) => (
                                <div key={p.id} className="relative">
                                    <ProductTile product={p} locale={locale} actionType={actionType} token={token} isFav={favIds.has(p.id)} hidePrices={verticalMeta?.hide_prices} onShoppingList={shoppingListIds.has(p.id)} />
                                    {/* Compare checkbox */}
                                    <button
                                        type="button"
                                        onClick={() => toggleCompare(p)}
                                        className={`absolute bottom-3 left-3 flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border transition-all ${inCompare(p.id) ? 'bg-[#d4af37] text-[#080d1f] border-[#d4af37]' : 'bg-[#0e1628]/80 text-[#f0e6d3]/50 border-[#d4af37]/20 hover:border-[#d4af37]/50'}`}
                                    >
                                        <GitCompareArrows size={10} />
                                        {inCompare(p.id) ? 'משווה' : 'השווה'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-24 bg-[#0e1628] rounded-[3rem] border-2 border-dashed border-[#d4af37]/20">
                            <PackageOpen size={64} className="mx-auto mb-6 text-[#f0e6d3]/30" />
                            <p className="text-[#f0e6d3]/60">{t.empty}</p>
                        </div>
                    )}
                </div>
            </div>
        </main>

        {compareList.length > 0 && (
            <ComparisonBar
                products={compareList}
                locale={locale}
                onRemove={(id) => setCompareList((prev) => prev.filter((p) => p.id !== id))}
                onClear={() => setCompareList([])}
            />
        )}
        </>
    );
}
