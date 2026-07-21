'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, PackageOpen, GitCompareArrows } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getProducts, getFavoriteIds, getVerticals, Vertical } from '@/lib/api';
import FilterSortSidebar, { SortOption } from '@/components/FilterSortSidebar';
import ProductTile, { Product } from '@/components/ProductTile';
import ComparisonBar from '@/components/ComparisonBar';

interface T {
    empty: string;
    results: string;
}

// Empty-state/results copy is identical across every world, so it's kept as one shared
// translation rather than duplicated per-vertical in the database.
const GENERIC_COPY: Record<string, T> = {
    he: { empty: 'אין מוצרים להצגה כרגע', results: 'תוצאות' },
    en: { empty: 'No products to show right now', results: 'results' },
    fr: { empty: 'Aucun produit pour le moment', results: 'résultats' },
    yi: { empty: 'נישטא קיין פראדוקטן איצט', results: 'רעזולטאטן' },
};

export default function VerticalListingClient({ vertical }: { vertical: string }) {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const locale = (params?.locale as string) || 'he';
    const { token, isLoading: authLoading } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [verticalMeta, setVerticalMeta] = useState<Vertical | null>(null);
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState<SortOption>('popularity');
    const [promotionType, setPromotionType] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [favIds, setFavIds] = useState<Set<number>>(new Set());
    const [compareList, setCompareList] = useState<Product[]>([]);

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

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        Promise.all([
            getProducts(token, vertical, sort, promotionType),
            getFavoriteIds(token),
            getVerticals(),
        ])
            .then(([prods, ids, verticals]) => {
                setProducts(prods);
                setFavIds(new Set(ids));
                setVerticalMeta(verticals.find((v) => v.slug === vertical) || null);
            })
            .catch(() => setProducts([]))
            .finally(() => setLoading(false));
    }, [token, vertical, sort, promotionType]);

    const toggleCompare = (product: Product) => {
        setCompareList((prev) => {
            if (prev.some((p) => p.id === product.id)) return prev.filter((p) => p.id !== product.id);
            if (prev.length >= 3) return prev;
            return [...prev, product];
        });
    };

    const inCompare = (id: number) => compareList.some((p) => p.id === id);

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
        return list;
    }, [products, search, priceMin, priceMax, locale]);

    const isFiltered = search.trim() || priceMin || priceMax;

    if (authLoading || !token) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#d4af37]" size={36} />
            </div>
        );
    }

    return (
        <>
        <main className="min-h-screen bg-[#111a2f]">
            <header className="bg-[#0e1628] border-b border-[#d4af37]/20 py-16 px-8">
                <div className="max-w-7xl mx-auto text-start">
                    <h1 className="text-4xl md:text-5xl font-black text-[#f0e6d3] mb-3">{title}</h1>
                    <p className="text-xl text-[#f0e6d3]/60 font-light">{subtitle}</p>
                    {isFiltered && !loading && (
                        <p className="text-sm text-[#d4af37]/70 mt-2 font-semibold">{filtered.length} {t.results}</p>
                    )}
                </div>
            </header>

            <div className="max-w-7xl mx-auto py-12 px-8 flex flex-col lg:flex-row gap-12">
                <FilterSortSidebar
                    locale={locale}
                    sort={sort}
                    onSortChange={setSort}
                    promotionType={promotionType}
                    onPromotionTypeChange={setPromotionType}
                    search={search}
                    onSearchChange={setSearch}
                    priceMin={priceMin}
                    onPriceMinChange={setPriceMin}
                    priceMax={priceMax}
                    onPriceMaxChange={setPriceMax}
                />

                <div className="flex-grow">
                    {loading ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 className="animate-spin text-[#d4af37]" size={32} />
                        </div>
                    ) : filtered.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {filtered.map((p) => (
                                <div key={p.id} className="relative">
                                    <ProductTile product={p} locale={locale} actionType={actionType} token={token} isFav={favIds.has(p.id)} />
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
