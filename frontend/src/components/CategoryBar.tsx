'use client';

import { useEffect, useRef, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { ProductCategory } from '@/lib/api';
import { getCategoryIcon } from '@/lib/iconLibrary';

interface T {
    all: string;
}

const translations: Record<string, T> = {
    he: { all: 'הכל' },
    en: { all: 'All' },
    fr: { all: 'Tous' },
    yi: { all: 'אלץ' },
};

/**
 * Prominent, supermarket-style category row shown above a world's product grid — replaces the
 * old sidebar category filter entirely. Native horizontal scroll (no carousel library); a static
 * edge-fade hint renders only when the row actually overflows its container.
 */
export default function CategoryBar({
    locale,
    categories,
    value,
    onChange,
}: {
    locale: string;
    categories: ProductCategory[];
    value: number | null;
    onChange: (id: number | null) => void;
}) {
    const t = translations[locale] || translations.he;
    const localeKey = locale as 'he' | 'en' | 'fr' | 'yi';
    const scrollRef = useRef<HTMLDivElement>(null);
    const [overflowing, setOverflowing] = useState(false);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
        check();
        // ResizeObserver only fires when the scroll container's own box changes (e.g. viewport
        // resize) — it does NOT fire when only its overflowing content grows/shrinks in place, so
        // a locale switch (same categories, differently-sized label text) needs `locale` as an
        // explicit dependency too, not just `categories`.
        const observer = new ResizeObserver(check);
        observer.observe(el);
        return () => observer.disconnect();
    }, [categories, locale]);

    if (categories.length === 0) return null;

    const tileClass = 'flex flex-col items-center gap-2 shrink-0 w-20 group';

    const badgeClass = (active: boolean) =>
        `flex items-center justify-center w-14 h-14 rounded-full border-2 transition-all active:scale-95 ${
            active
                ? 'bg-[#d4af37] border-[#d4af37] text-[#080d1f] shadow-md scale-105'
                : 'bg-[#0e1628] border-[#d4af37]/20 text-[#d4af37] group-hover:border-[#d4af37]/60'
        }`;

    const labelClass = (active: boolean) =>
        `text-xs font-bold text-center leading-tight line-clamp-2 ${active ? 'text-[#d4af37]' : 'text-[#f0e6d3]/70'}`;

    return (
        <div className="relative mb-8">
            <div ref={scrollRef} className="flex gap-4 overflow-x-auto no-scrollbar px-1 py-1">
                <button type="button" onClick={() => onChange(null)} className={tileClass}>
                    <span className={badgeClass(value === null)}>
                        <LayoutGrid size={22} />
                    </span>
                    <span className={labelClass(value === null)}>{t.all}</span>
                </button>
                {categories.map((c) => {
                    const Icon = getCategoryIcon(c.icon);
                    const active = value === c.id;
                    const label = c[`label_${localeKey}`] || c.label_he;
                    return (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => onChange(active ? null : c.id)}
                            className={tileClass}
                        >
                            <span className={badgeClass(active)}>
                                <Icon size={22} />
                            </span>
                            <span className={labelClass(active)}>{label}</span>
                        </button>
                    );
                })}
            </div>
            {overflowing && (
                <>
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#111a2f] to-transparent" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#111a2f] to-transparent" />
                </>
            )}
        </div>
    );
}
