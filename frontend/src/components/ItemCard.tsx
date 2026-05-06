/**
 * Component: ItemCard
 * Updated with Next.js Image optimization and stricter TypeScript interfaces.
 * Optimized for high-resolution displays (4K flat screens).
 */

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Defined supported locales for stricter type checking
type SupportedLocale = 'he' | 'en' | 'fr' | 'yi';

interface Item {
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
    category?: string; // Optional: To show a small tag
}

interface ItemCardProps {
    item: Item;
    locale?: SupportedLocale;
}

export default function ItemCard({ item, locale = 'he' }: ItemCardProps) {
    // Ensuring the image path is local to satisfy NetFree/Rimon filters
    const imagePath = item.image_url
        ? `/images/items/${item.image_url}`
        : '/images/items/placeholder.jpg';

    // Helper to select content based on current locale
    const getLocalized = (field: 'title' | 'description') => {
        const key = `${field}_${locale}` as keyof Item;
        return (item[key] as string) || (item[`${field}_he`] as string);
    };

    const title = getLocalized('title');
    const description = getLocalized('description');

    // Translation dictionary for UI elements
    const translations = {
        he: { details: 'לפרטים', price_label: 'מחיר לחבר', free: 'חינם' },
        en: { details: 'Details', price_label: 'Member Price', free: 'FREE' },
        fr: { details: 'Détails', price_label: 'Prix Membre', free: 'Gratuit' },
        yi: { details: 'פרטים', price_label: 'פרייז פאר מיטגלידער', free: 'בחינם' }
    }[locale];

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group text-start">
            {/* Image Section - Optimized with Next/Image */}
            <div className="h-48 w-full bg-slate-100 relative overflow-hidden">
                <Image
                    src={imagePath}
                    alt={title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    priority={item.id < 4} // Priority load for first row
                />
                {item.category && (
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-slate-700 uppercase">
                        {item.category}
                    </span>
                )}
            </div>

            {/* Content Section */}
            <div className="p-6 flex flex-col flex-grow items-start text-start">
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#1e3a8a] transition-colors line-clamp-1 w-full">
                    {title}
                </h3>
                <p className="text-slate-500 text-sm line-clamp-2 mb-6 leading-relaxed w-full">
                    {description}
                </p>

                {/* Price and Action - Visual Takhles */}
                <div className="mt-auto flex justify-between items-end pt-4 border-t border-slate-100 w-full">
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {translations.price_label}
                        </span>
                        <span className="text-2xl font-black text-[#1e3a8a]">
                            {item.price ? `₪${item.price}` : translations.free}
                        </span>
                    </div>
                    <Link
                        href={`/${locale}/items/${item.id}`}
                        className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1e3a8a] active:scale-95 transition-all shadow-md"
                    >
                        {translations.details}
                    </Link>
                </div>
            </div>
        </div>
    );
}