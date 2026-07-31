'use client';

import { X, GitCompareArrows } from 'lucide-react';
import { Product } from '@/components/ProductTile';
import { productImageUrl } from '@/lib/api';
import { useAttrLabels } from '@/lib/useVerticals';

interface Props {
    products: Product[];
    locale: string;
    onRemove: (id: number) => void;
    onClear: () => void;
}

export default function ComparisonBar({ products, locale, onRemove, onClear }: Props) {
    const ATTR_LABELS = useAttrLabels();
    if (products.length === 0) return null;

    const localeKey = locale as 'he' | 'en' | 'fr' | 'yi';
    const isRTL = locale === 'he' || locale === 'yi';
    const allAttrKeys = Array.from(
        new Set(products.flatMap((p) => Object.keys(p.attributes || {})))
    );

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[150] bg-[#080d1f] border-t border-[#d4af37]/30 shadow-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="max-w-6xl mx-auto px-4 py-3">
                {/* header row */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-[#d4af37] font-black text-sm">
                        <GitCompareArrows size={16} />
                        השוואת מוצרים ({products.length}/3)
                    </div>
                    <button onClick={onClear} className="text-[#f0e6d3]/40 hover:text-red-400 text-xs flex items-center gap-1 transition-colors">
                        <X size={12} /> נקה הכל
                    </button>
                </div>

                {/* product columns */}
                <div className="max-h-[45vh] overflow-y-auto">
                    <div
                        className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory sm:grid sm:overflow-visible"
                        style={{ gridTemplateColumns: `repeat(${products.length}, 1fr)` }}
                    >
                        {products.map((p) => {
                            const title = p[`title_${localeKey}`] || p.title_he;
                            const imgSrc = productImageUrl(p.image_url);
                            return (
                                <div key={p.id} className="bg-[#0e1628] rounded-xl border border-[#d4af37]/15 overflow-hidden w-[78vw] max-w-[220px] shrink-0 snap-start sm:w-auto sm:max-w-none sm:shrink">
                                    <div className="relative h-14 sm:h-20">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={imgSrc} alt={title} className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => onRemove(p.id)}
                                            className="absolute top-1 left-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                        >
                                            <X size={10} className="text-white" />
                                        </button>
                                    </div>
                                    <div className="p-2">
                                        <p className="text-[11px] font-bold text-[#f0e6d3] line-clamp-1 mb-1">{title}</p>
                                        <p className="text-[#d4af37] font-black text-sm mb-2">
                                            {p.price ? `₪${p.price.toLocaleString()}` : 'לפי בקשה'}
                                        </p>
                                        {allAttrKeys.map((k) => {
                                            const val = p.attributes?.[k];
                                            const label = ATTR_LABELS[k]?.[locale] || ATTR_LABELS[k]?.he || k;
                                            return (
                                                <div key={k} className="flex justify-between text-[10px] border-b border-[#d4af37]/10 py-0.5">
                                                    <span className="text-[#f0e6d3]/40">{label}</span>
                                                    <span className={`font-semibold ${val != null ? 'text-[#f0e6d3]' : 'text-[#f0e6d3]/20'}`}>
                                                        {val != null ? String(val) : '—'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
