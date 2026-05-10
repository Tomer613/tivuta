/**
 * Category Page Content (Client Side)
 * Handles sub-category filtering using searchParams.
 */
"use client";

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ItemCard from '@/components/ItemCard';

interface CategoryContentProps {
    category: any;
    allItems: any[];
    locale: 'he' | 'en' | 'fr' | 'yi';
    t: any;
}

export default function CategoryContent({ category, allItems, locale, t }: CategoryContentProps) {
    const searchParams = useSearchParams();
    const activeSubSlug = searchParams.get('sub');

    // Filter items based on active sub-category slug
    const filteredItems = activeSubSlug 
        ? allItems.filter((item: any) => {
            const subCat = category.sub_categories.find((s: any) => s.id === item.sub_category_id);
            return subCat?.slug === activeSubSlug;
          })
        : allItems;

    return (
        <>
            {/* Sub-Categories Filter Section */}
            {category.sub_categories && category.sub_categories.length > 0 && (
                <section className="max-w-7xl mx-auto py-12 px-6">
                    <h2 className="text-lg font-black text-slate-400 uppercase tracking-widest mb-8 text-start">
                        {t.sub_categories}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href={`/${locale}/categories/${category.slug}`}
                            className={`px-6 py-3 rounded-full font-bold transition-all active:scale-95 border ${
                                !activeSubSlug 
                                ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-lg shadow-blue-900/20" 
                                : "bg-white text-slate-700 border-slate-200 hover:border-[#1e3a8a]"
                            }`}
                        >
                            {t.all}
                        </Link>

                        {category.sub_categories.map((sub: any) => (
                            <Link
                                key={sub.id}
                                href={`/${locale}/categories/${category.slug}?sub=${sub.slug}`}
                                className={`px-6 py-3 rounded-full font-bold transition-all active:scale-95 border ${
                                    activeSubSlug === sub.slug
                                    ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-lg shadow-blue-900/20" 
                                    : "bg-white text-slate-700 border-slate-200 hover:border-[#1e3a8a]"
                                }`}
                            >
                                {sub[`name_${locale}`] || sub.name_he}
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Items Grid */}
            <section className="max-w-7xl mx-auto py-12 px-6">
                <h2 className="text-3xl font-black text-slate-900 mb-12 text-start">
                    {activeSubSlug 
                        ? category.sub_categories.find((s: any) => s.slug === activeSubSlug)?.[`name_${locale}`] || t.all_items
                        : t.all_items
                    }
                </h2>

                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-10">
                        {filteredItems.map((item: any) => (
                            <ItemCard key={item.id} item={item} locale={locale} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white border border-dashed border-slate-300 rounded-[3rem] p-24 text-center">
                        <p className="text-slate-400 text-xl italic">{t.no_items}</p>
                    </div>
                )}
            </section>
        </>
    );
}
