/**
 * Component: ItemCard
 * Fully localized with explicit text-start alignment and logical layout.
 */

import React from 'react';
import Link from 'next/link';

interface ItemProps {
    item: {
        id: number;
        title_he: string;
        title_en: string;
        title_fr: string;
        title_yi: string;
        description_he: string;
        description_en: string;
        description_fr: string;
        description_yi: string;
        image_url?: string;
        price: number | null;
    };
    locale?: string;
}

export default function ItemCard({ item, locale = 'he' }: ItemProps) {
    const imagePath = item.image_url
        ? `/images/items/${item.image_url}`
        : '/images/placeholder.jpg';

    // Select content based on locale
    const title = item[`title_${locale as 'he' | 'en' | 'fr' | 'yi'}`] || item.title_he;
    const description = item[`description_${locale as 'he' | 'en' | 'fr' | 'yi'}`] || item.description_he;

    const t = {
        he: { details: 'לפרטים', price_label: 'מחיר לחבר' },
        en: { details: 'Details', price_label: 'Member Price' },
        fr: { details: 'Détails', price_label: 'Prix Membre' },
        yi: { details: 'פרטים', price_label: 'פרייז פאר מיטגלידער' }
    }[locale as keyof typeof t] || t.he;

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group text-start">
            {/* Image Section */}
            <div className="h-48 w-full bg-slate-100 relative overflow-hidden">
                <img
                    src={imagePath}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                />
            </div>

            {/* Content Section */}
            <div className="p-6 flex flex-col flex-grow items-start text-start">
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#1e3a8a] transition-colors line-clamp-1 text-start w-full">
                    {title}
                </h3>
                <p className="text-slate-500 text-sm line-clamp-2 mb-6 leading-relaxed text-start w-full">
                    {description}
                </p>

                {/* Action Section - Logical justify-between */}
                <div className="mt-auto flex justify-between items-end pt-4 border-t border-slate-50 w-full">
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-start">{t.price_label}</span>
                        <span className="text-2xl font-black text-[#1e3a8a] text-start">
                            {item.price ? `₪${item.price}` : locale === 'he' ? 'חינם' : 'FREE'}
                        </span>
                    </div>
                    <Link
                        href={`/${locale}/items/${item.id}`}
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#2563eb] transition-all shadow-md"
                    >
                        {t.details}
                    </Link>
                </div>
            </div>
        </div>
    );
}