'use client';

import { ArrowDownWideNarrow, ArrowUpNarrowWide, Clock } from 'lucide-react';

interface T {
    sort: string;
    price_asc: string;
    price_desc: string;
    newest: string;
}

const translations: Record<string, T> = {
    he: { sort: 'מיון', price_asc: 'מחיר: מהזול ליקר', price_desc: 'מחיר: מהיקר לזול', newest: 'החדש ביותר' },
    en: { sort: 'Sort', price_asc: 'Price: Low to High', price_desc: 'Price: High to Low', newest: 'Newest' },
    fr: { sort: 'Trier', price_asc: 'Prix croissant', price_desc: 'Prix décroissant', newest: 'Les plus récents' },
    yi: { sort: 'סארטירן', price_asc: 'פרייז: ביליק צו טייער', price_desc: 'פרייז: טייער צו ביליק', newest: 'נייסטע' },
};

export type SortOption = 'newest' | 'price_asc' | 'price_desc';

export default function FilterSortSidebar({
    locale,
    sort,
    onSortChange,
}: {
    locale: string;
    sort: SortOption;
    onSortChange: (sort: SortOption) => void;
}) {
    const t = translations[locale] || translations.he;

    const options: { id: SortOption; label: string; icon: React.ReactNode }[] = [
        { id: 'newest', label: t.newest, icon: <Clock size={16} /> },
        { id: 'price_asc', label: t.price_asc, icon: <ArrowUpNarrowWide size={16} /> },
        { id: 'price_desc', label: t.price_desc, icon: <ArrowDownWideNarrow size={16} /> },
    ];

    return (
        <aside className="lg:w-64 flex-shrink-0">
            <h3 className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest mb-4 ps-2">{t.sort}</h3>
            <div className="flex flex-col gap-2">
                {options.map((opt) => (
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
        </aside>
    );
}
