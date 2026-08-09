'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { searchProducts, productImageUrl, getVerticals, Vertical } from '@/lib/api';
import { getVerticalIcon } from '@/lib/verticalIcons';
import { Product } from '@/components/ProductTile';
import Link from 'next/link';

interface Props {
    locale: string;
    onOpenChange?: (open: boolean) => void;
}

export interface GlobalSearchHandle {
    close: () => void;
}

const GlobalSearch = forwardRef<GlobalSearchHandle, Props>(function GlobalSearch({ locale, onOpenChange }, ref) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const [results, setResults] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [verticals, setVerticals] = useState<Vertical[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        getVerticals().then(setVerticals);
    }, []);

    useEffect(() => {
        if (open) {
            const t = setTimeout(() => inputRef.current?.focus(), 120);
            return () => clearTimeout(t);
        }
    }, [open]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (q.trim().length < 2) { setResults([]); return; }
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await searchProducts(q);
                setResults(data);
            } finally {
                setLoading(false);
            }
        }, 300);
    }, [q]);

    const close = () => { setOpen(false); setQ(''); setResults([]); onOpenChange?.(false); };

    useImperativeHandle(ref, () => ({ close }));

    const hasResults = q.length >= 2;

    const portal = open && typeof document !== 'undefined'
        ? createPortal(
            <>
                {/* Blur overlay — z-40 sits below the sticky header (z-50) so the pill stays visible */}
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    onClick={close}
                />
                {/* Results dropdown — z-[100] sits above the header */}
                {hasResults && (
                    <div className="fixed top-[68px] left-1/2 -translate-x-1/2 w-full max-w-lg z-[100] px-4">
                        <div className="bg-[#0e1628] border border-[#d4af37]/30 rounded-2xl shadow-2xl overflow-hidden">
                            <div className="max-h-80 overflow-y-auto">
                                {loading && (
                                    <div className="p-6 text-center text-[#f0e6d3]/40 text-sm">מחפש...</div>
                                )}
                                {!loading && results.length === 0 && (
                                    <div className="p-6 text-center text-[#f0e6d3]/40 text-sm">
                                        לא נמצאו תוצאות עבור &quot;{q}&quot;
                                    </div>
                                )}
                                {!loading && results.map((product) => {
                                    const vertical = verticals.find((v) => v.slug === product.vertical);
                                    const Icon = getVerticalIcon(vertical?.icon || 'Store');
                                    return (
                                        <Link
                                            key={product.id}
                                            href={`/${locale}/products?id=${product.id}`}
                                            onClick={close}
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-[#111a2f] transition-colors border-b border-[#d4af37]/5 last:border-0"
                                        >
                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#111a2f] shrink-0 product-img-wrap">
                                                {product.image_url && (
                                                    <img
                                                        src={productImageUrl(product.image_url)}
                                                        alt={product.title_he}
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[#f0e6d3] text-sm font-bold truncate">{product.title_he}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[#d4af37]/70 text-xs flex items-center gap-1">
                                                        <Icon size={13} />
                                                        {vertical?.label_he ?? product.vertical}
                                                    </span>
                                                    {product.price && (
                                                        <span className="text-[#f0e6d3]/40 text-xs">
                                                            · ₪{Number(product.price).toLocaleString('he-IL')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {product.avg_rating && (
                                                <span className="text-[#d4af37] text-xs font-bold">⭐ {product.avg_rating}</span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </>,
            document.body
        )
        : null;

    return (
        <>
            {/* Dynamic Island pill — inline in header center */}
            <div
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#111a2f] border select-none max-w-[90vw] [transition:width_0.45s_cubic-bezier(0.34,1.56,0.64,1),border-color_0.2s,box-shadow_0.2s] ${
                    open
                        ? 'w-full md:w-[360px] border-[#d4af37]/50 shadow-[0_0_20px_rgba(212,175,55,0.15)] cursor-default'
                        : 'w-[130px] border-[#d4af37]/20 cursor-pointer hover:border-[#d4af37]/40 hover:shadow-[0_0_12px_rgba(212,175,55,0.08)]'
                }`}
                onClick={() => { if (!open) { setOpen(true); onOpenChange?.(true); } }}
            >
                <Search
                    size={15}
                    className={`shrink-0 transition-colors duration-200 ${open ? 'text-[#d4af37]' : 'text-[#f0e6d3]/50'}`}
                />
                {open ? (
                    <input
                        ref={inputRef}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="חפש מוצרים..."
                        className="flex-1 bg-transparent text-[#f0e6d3] placeholder-[#f0e6d3]/30 outline-none text-sm min-w-0"
                        dir={locale === 'he' || locale === 'yi' ? 'rtl' : 'ltr'}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span className="text-sm text-[#f0e6d3]/40 truncate">חיפוש...</span>
                )}
                {open && (
                    <button
                        onClick={(e) => { e.stopPropagation(); close(); }}
                        className="shrink-0 text-[#f0e6d3]/30 hover:text-[#f0e6d3]/70 transition-colors"
                        aria-label="סגור חיפוש"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
            {portal}
        </>
    );
});

export default GlobalSearch;
