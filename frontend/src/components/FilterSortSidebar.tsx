'use client';

import { ArrowDownWideNarrow, ArrowUpNarrowWide, Clock, Tag, Search, SlidersHorizontal } from 'lucide-react';

interface T {
    sort: string;
    price_asc: string;
    price_desc: string;
    newest: string;
    filter_promo: string;
    all: string;
    search: string;
    price_range: string;
    price_min: string;
    price_max: string;
}

const translations: Record<string, T> = {
    he: { sort: 'מיון', price_asc: 'מחיר: מהזול ליקר', price_desc: 'מחיר: מהיקר לזול', newest: 'החדש ביותר', filter_promo: 'סנן לפי מבצע', all: 'הכל', search: 'חיפוש...', price_range: 'טווח מחיר (₪)', price_min: 'מינימום', price_max: 'מקסימום' },
    en: { sort: 'Sort', price_asc: 'Price: Low to High', price_desc: 'Price: High to Low', newest: 'Newest', filter_promo: 'Filter by promotion', all: 'All', search: 'Search...', price_range: 'Price range (₪)', price_min: 'Min', price_max: 'Max' },
    fr: { sort: 'Trier', price_asc: 'Prix croissant', price_desc: 'Prix décroissant', newest: 'Les plus récents', filter_promo: 'Filtrer par promotion', all: 'Tous', search: 'Rechercher...', price_range: 'Fourchette de prix (₪)', price_min: 'Min', price_max: 'Max' },
    yi: { sort: 'סארטירן', price_asc: 'פרייז: ביליק צו טייער', price_desc: 'פרייז: טייער צו ביליק', newest: 'נייסטע', filter_promo: 'פילטרירן', all: 'אלץ', search: 'זוכן...', price_range: 'פרייז (₪)', price_min: 'מינימום', price_max: 'מקסימום' },
};

export type SortOption = 'newest' | 'price_asc' | 'price_desc';

const PROMO_FILTERS: { value: string; label_he: string; label_en: string }[] = [
    { value: 'first_n',              label_he: 'ראשונים',       label_en: 'First N'        },
    { value: 'raffle',               label_he: 'הגרלה',         label_en: 'Raffle'         },
    { value: 'percentage_discount',  label_he: 'הנחה באחוזים',  label_en: '% Discount'     },
    { value: 'fixed_discount',       label_he: 'הנחה קבועה',    label_en: 'Fixed Discount' },
    { value: 'flash_sale',           label_he: 'פלאש סייל',     label_en: 'Flash Sale'     },
];

export default function FilterSortSidebar({
    locale,
    sort,
    onSortChange,
    promotionType,
    onPromotionTypeChange,
    search,
    onSearchChange,
    priceMin,
    onPriceMinChange,
    priceMax,
    onPriceMaxChange,
}: {
    locale: string;
    sort: SortOption;
    onSortChange: (sort: SortOption) => void;
    promotionType: string | null;
    onPromotionTypeChange: (v: string | null) => void;
    search: string;
    onSearchChange: (v: string) => void;
    priceMin: string;
    onPriceMinChange: (v: string) => void;
    priceMax: string;
    onPriceMaxChange: (v: string) => void;
}) {
    const t = translations[locale] || translations.he;
    const isHe = locale === 'he' || locale === 'yi';

    const sortOptions: { id: SortOption; label: string; icon: React.ReactNode }[] = [
        { id: 'newest',     label: t.newest,     icon: <Clock size={16} /> },
        { id: 'price_asc',  label: t.price_asc,  icon: <ArrowUpNarrowWide size={16} /> },
        { id: 'price_desc', label: t.price_desc, icon: <ArrowDownWideNarrow size={16} /> },
    ];

    return (
        <aside className="lg:w-64 flex-shrink-0 space-y-8">
            {/* Search */}
            <div>
                <h3 className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest mb-4 ps-2 flex items-center gap-2">
                    <Search size={13} /> {isHe ? 'חיפוש' : 'Search'}
                </h3>
                <div className="relative">
                    <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[#f0e6d3]/30 pointer-events-none" />
                    <input
                        type="text"
                        placeholder={t.search}
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-[#0e1628] border border-[#d4af37]/20 rounded-xl ps-9 pe-4 py-3 text-sm text-[#f0e6d3] placeholder-[#f0e6d3]/30 focus:outline-none focus:border-[#d4af37]/50"
                    />
                </div>
            </div>

            {/* Price range */}
            <div>
                <h3 className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest mb-4 ps-2 flex items-center gap-2">
                    <SlidersHorizontal size={13} /> {t.price_range}
                </h3>
                <div className="flex gap-2">
                    <input
                        type="number"
                        min={0}
                        placeholder={t.price_min}
                        value={priceMin}
                        onChange={(e) => onPriceMinChange(e.target.value)}
                        className="w-1/2 bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-3 py-2.5 text-sm text-[#f0e6d3] placeholder-[#f0e6d3]/30 focus:outline-none focus:border-[#d4af37]/50"
                        dir="ltr"
                    />
                    <input
                        type="number"
                        min={0}
                        placeholder={t.price_max}
                        value={priceMax}
                        onChange={(e) => onPriceMaxChange(e.target.value)}
                        className="w-1/2 bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-3 py-2.5 text-sm text-[#f0e6d3] placeholder-[#f0e6d3]/30 focus:outline-none focus:border-[#d4af37]/50"
                        dir="ltr"
                    />
                </div>
                {(priceMin || priceMax) && (
                    <button onClick={() => { onPriceMinChange(''); onPriceMaxChange(''); }} className="mt-2 text-xs text-[#d4af37]/60 hover:text-[#d4af37] transition-colors">
                        {isHe ? 'נקה מחיר' : 'Clear price'}
                    </button>
                )}
            </div>

            {/* Sort */}
            <div>
                <h3 className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest mb-4 ps-2">{t.sort}</h3>
                <div className="flex flex-col gap-2">
                    {sortOptions.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => onSortChange(opt.id)}
                            className={`flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 border ${
                                sort === opt.id
                                    ? 'bg-[#d4af37] text-[#080d1f] border-[#d4af37] shadow-md'
                                    : 'bg-[#0e1628] text-[#f0e6d3] border-[#d4af37]/20 hover:border-[#d4af37]'
                            }`}
                        >
                            {opt.icon}
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Promotion filter */}
            <div>
                <h3 className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest mb-4 ps-2 flex items-center gap-2">
                    <Tag size={13} /> {t.filter_promo}
                </h3>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => onPromotionTypeChange(null)}
                        className={`flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 border ${
                            promotionType === null
                                ? 'bg-[#d4af37] text-[#080d1f] border-[#d4af37] shadow-md'
                                : 'bg-[#0e1628] text-[#f0e6d3] border-[#d4af37]/20 hover:border-[#d4af37]'
                        }`}
                    >
                        {t.all}
                    </button>
                    {PROMO_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => onPromotionTypeChange(f.value === promotionType ? null : f.value)}
                            className={`flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 border ${
                                promotionType === f.value
                                    ? 'bg-[#d4af37] text-[#080d1f] border-[#d4af37] shadow-md'
                                    : 'bg-[#0e1628] text-[#f0e6d3] border-[#d4af37]/20 hover:border-[#d4af37]'
                            }`}
                        >
                            {isHe ? f.label_he : f.label_en}
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
}
