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
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const imagePath = item.image_url
        ? `${basePath}/images/items/${item.image_url}`
        : `${basePath}/images/items/placeholder.jpg`;

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
        <Link 
            href={`/benefits/${locale}/items/${item.id}`}
            className="flex flex-col h-full bg-[#0e1628] rounded-2xl border border-[#d4af37]/20 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group text-start relative"
        >
            {/* Image Section - Optimized with Next/Image */}
            <div className="h-48 w-full bg-[#111a2f] relative overflow-hidden">
                <Image
                    src={imagePath}
                    alt={title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover group-hover:scale-110 transition-transform duration-1000"
                    priority={item.id < 4}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {item.category && (
                    <span className="absolute top-3 start-3 bg-[#080d1f]/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-[#f0e6d3] uppercase z-10">
                        {item.category}
                    </span>
                )}
            </div>

            {/* Content Section */}
            <div className="p-6 flex flex-col flex-grow items-start text-start">
                <h3 className="text-xl font-bold text-[#f0e6d3] mb-2 group-hover:text-[#d4af37] transition-colors line-clamp-1 w-full">
                    {title}
                </h3>
                <p className="text-[#f0e6d3]/60 text-sm line-clamp-2 mb-6 leading-relaxed w-full font-light">
                    {description}
                </p>

                {/* Price and Action - Visual Takhles */}
                <div className="mt-auto flex justify-between items-end pt-4 border-t border-[#d4af37]/20 w-full">
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-black text-[#f0e6d3]/40 uppercase tracking-widest">
                            {translations.price_label}
                        </span>
                        <span className="text-2xl font-black text-[#d4af37]">
                            {item.price ? `₪${item.price}` : translations.free}
                        </span>
                    </div>
                    <div className="btn-primary !text-sm !py-2.5 !px-5">
                        {translations.details}
                    </div>
                </div>
            </div>
        </Link>
    );
}