'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { ICON_OPTIONS, getIcon, searchIcons, suggestIconsFor } from '@/lib/iconLibrary';

/**
 * Shared search + suggestions + grid icon picker for admin/categories and admin/verticals forms.
 * Pure/presentational — it has no notion of "has the admin manually touched this yet"; that state
 * (and the auto-default-while-typing behavior driving `suggestFor`) lives in each calling page's
 * own form state instead, since it needs to know create-vs-edit, which this component doesn't.
 */
export function IconPicker({
    value,
    onChange,
    suggestFor,
}: {
    value: string;
    onChange: (key: string) => void;
    suggestFor?: string;
}) {
    const [query, setQuery] = useState('');
    const options = query.trim() ? searchIcons(query) : ICON_OPTIONS;
    const suggestions = suggestFor ? suggestIconsFor(suggestFor, 6) : [];

    const tileClass = (active: boolean) =>
        `aspect-square rounded-xl flex items-center justify-center border transition-colors ${
            active
                ? 'bg-[#d4af37] border-[#d4af37] text-[#080d1f]'
                : 'bg-[#111a2f] border-[#d4af37]/10 text-[#d4af37]/60 hover:border-[#d4af37]/40'
        }`;

    return (
        <div>
            <div className="relative mb-2">
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[#f0e6d3]/30 pointer-events-none" />
                <input
                    type="text"
                    placeholder="חיפוש אייקון... (עברית או אנגלית)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-[#0e1628] border border-[#d4af37]/20 rounded-xl ps-9 pe-4 py-2 text-sm text-[#f0e6d3] placeholder-[#f0e6d3]/30 focus:outline-none focus:border-[#d4af37]/50"
                />
            </div>

            {suggestions.length > 0 && (
                <div className="mb-3">
                    <div className="text-[10px] font-bold text-[#f0e6d3]/40 uppercase tracking-widest mb-1.5">מוצעים</div>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((key) => {
                            const Icon = getIcon(key);
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => onChange(key)}
                                    title={key}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${
                                        value === key
                                            ? 'bg-[#d4af37] border-[#d4af37] text-[#080d1f]'
                                            : 'bg-[#111a2f] border-[#d4af37]/30 text-[#d4af37]/80 hover:border-[#d4af37]/60'
                                    }`}
                                >
                                    <Icon size={16} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-64 overflow-y-auto">
                {options.length === 0 && (
                    <div className="col-span-full text-xs text-[#f0e6d3]/40 py-6 text-center">אין תוצאות</div>
                )}
                {options.map((key) => {
                    const Icon = getIcon(key);
                    return (
                        <button key={key} type="button" onClick={() => onChange(key)} title={key} className={tileClass(value === key)}>
                            <Icon size={16} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
