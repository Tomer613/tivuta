'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, Diamond, Car, Shield } from 'lucide-react';
import { searchProducts, productImageUrl } from '@/lib/api';
import Link from 'next/link';

const VERTICAL_ICON: Record<string, React.ReactNode> = {
    diamonds: <Diamond size={13} />,
    cars: <Car size={13} />,
    insurance: <Shield size={13} />,
};
const VERTICAL_LABEL: Record<string, string> = {
    diamonds: 'יהלומים',
    cars: 'רכב',
    insurance: 'ביטוח',
};

interface Props {
    locale: string;
}

export default function GlobalSearch({ locale }: Props) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (open) inputRef.current?.focus();
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

    const close = () => { setOpen(false); setQ(''); setResults([]); };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 bg-[#111a2f] hover:bg-[#1a2540] border border-[#d4af37]/20 rounded-xl px-3 py-2 text-[#f0e6d3]/60 hover:text-[#f0e6d3] transition-colors text-sm"
                title="חיפוש"
            >
                <Search size={16} />
                <span className="hidden sm:block">חיפוש...</span>
            </button>

            {open && (
                <div className="fixed inset-0 bg-black/70 z-[200] flex items-start justify-center pt-16 px-4" onClick={close}>
                    <div
                        className="bg-[#0e1628] border border-[#d4af37]/30 rounded-2xl w-full max-w-xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Search input */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#d4af37]/10">
                            <Search size={18} className="text-[#d4af37] shrink-0" />
                            <input
                                ref={inputRef}
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="חפש יהלומים, רכב, ביטוח..."
                                className="flex-1 bg-transparent text-[#f0e6d3] placeholder-[#f0e6d3]/30 outline-none text-base"
                                dir="rtl"
                            />
                            {q && (
                                <button onClick={() => setQ('')} className="text-[#f0e6d3]/40 hover:text-[#f0e6d3]">
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Results */}
                        <div className="max-h-80 overflow-y-auto">
                            {loading && (
                                <div className="p-6 text-center text-[#f0e6d3]/40 text-sm">מחפש...</div>
                            )}
                            {!loading && q.length >= 2 && results.length === 0 && (
                                <div className="p-6 text-center text-[#f0e6d3]/40 text-sm">לא נמצאו תוצאות עבור "{q}"</div>
                            )}
                            {!loading && results.map((product) => (
                                <Link
                                    key={product.id}
                                    href={`/${locale}/${product.vertical}?product=${product.id}`}
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
                                                {VERTICAL_ICON[product.vertical]}
                                                {VERTICAL_LABEL[product.vertical] ?? product.vertical}
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
                            ))}
                            {!q && (
                                <div className="p-5 text-center text-[#f0e6d3]/30 text-sm">
                                    הקלד לפחות 2 תווים לחיפוש
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
