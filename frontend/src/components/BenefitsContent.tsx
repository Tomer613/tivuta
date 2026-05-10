/**
 * Benefits Page Content (Client Side)
 * Handles global search and category filtering using searchParams.
 */
"use client";

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';
import ItemCard from '@/components/ItemCard';

interface BenefitsContentProps {
    allItems: any[];
    categories: any[];
    locale: 'he' | 'en' | 'fr' | 'yi';
    t: any;
}

export default function BenefitsContent({ allItems, categories, locale, t }: BenefitsContentProps) {
    const searchParams = useSearchParams();
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const currentCategoryObj = categories.find((c: any) => c.slug === category);
    const categoryId = currentCategoryObj?.id;

    const filteredItems = allItems.filter((item: any) => {
        const matchesCategory = !category || item.cat_id_new === categoryId;
        const title = item[`title_${locale}`] || item.title_he;
        const desc = item[`description_${locale}`] || item.description_he;
        
        const matchesSearch = !search || 
            title.toLowerCase().includes(search.toLowerCase()) || 
            desc.toLowerCase().includes(search.toLowerCase());

        return matchesCategory && matchesSearch;
    });

    return (
        <>
            {/* Filter Bar */}
            <section className="max-w-7xl mx-auto py-10 px-8">
                <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    <Link 
                        href={`/${locale}/benefits`} 
                        className={`px-8 py-3 rounded-2xl text-base font-bold whitespace-nowrap transition-all ${!category ? 'bg-[#1e3a8a] text-white shadow-xl shadow-blue-900/20' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                    >
                        {t.all}
                    </Link>
                    {categories.map((cat: any) => (
                        <Link 
                            key={cat.id} 
                            href={`/${locale}/benefits?category=${cat.slug}${search ? `&search=${search}` : ''}`}
                            className={`px-8 py-3 rounded-2xl text-base font-bold whitespace-nowrap transition-all ${category === cat.slug ? 'bg-[#1e3a8a] text-white shadow-xl shadow-blue-900/20' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                        >
                            {cat[`name_${locale}`] || cat.name_he}
                        </Link>
                    ))}
                </div>
            </section>

            {/* Catalog Grid */}
            <section className="max-w-7xl mx-auto py-8 px-8 mb-24">
                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-10">
                        {filteredItems.map((item: any) => (
                            <ItemCard key={item.id} item={item} locale={locale} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
                        <div className="text-slate-100 flex justify-center mb-8">
                            <LayoutGrid size={100} strokeWidth={1} />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-4">{t.empty}</h3>
                        <Link href={`/${locale}/benefits`} className="text-[#1e3a8a] font-black text-lg underline underline-offset-8">
                            {t.back}
                        </Link>
                    </div>
                )}
            </section>
        </>
    );
}
