/**
 * Category Archive Page.
 * Full multi-language content synchronization.
 */

import { getCategories, getTrendingItems } from '@/lib/api';
import Link from 'next/link';
import { ChevronLeft, Filter } from 'lucide-react';
import ItemCard from '@/components/ItemCard';
import BackButton from '@/components/BackButton';

export default async function CategoryPage({ 
    params 
}: { 
    params: Promise<{ locale: string, slug: string }> 
}) {
    const { locale, slug } = await params;
    const categories = await getCategories();
    const allItems = await getTrendingItems();

    const category = categories.find((c: any) => c.slug === slug);
    const items = allItems.filter((item: any) => item.cat_id_new === category?.id);

    if (!category) return <div className="p-20 text-center font-black text-2xl">404</div>;

    const t = {
        he: { home: 'דף הבית', catalog: 'קטלוג הטבות', filter: 'סינון ומיון', desc: 'מרכז ההטבות והשירותים בקטגוריית' },
        en: { home: 'Home', catalog: 'Benefit Catalog', filter: 'Filter & Sort', desc: 'Benefits and services in the category of' },
        fr: { home: 'Accueil', catalog: 'Catalogue', filter: 'Filtrer', desc: 'Avantages et services dans la catégorie' },
        yi: { home: 'היים', catalog: 'בענעפיטן', filter: 'פילטער', desc: 'בענעפיטן אין דער קאטעגאריע' }
    }[locale as keyof typeof t] || t.he;

    const categoryName = category[`name_${locale as 'he' | 'en' | 'fr' | 'yi'}`] || category.name_he;

    return (
        <main className="min-h-screen bg-slate-50">
            {/* Page Header */}
            <header className="bg-white border-b border-slate-200 py-20 px-8">
                <div className="max-w-7xl mx-auto relative">
                    <div className="lg:absolute lg:-start-24 lg:top-0 mb-10 lg:mb-0">
                        <BackButton locale={locale} />
                    </div>
                    <div className="flex-grow">
                        <nav className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-8">
                            <Link href={`/${locale}`} className="hover:text-[#1e3a8a]">{t.home}</Link>
                            <ChevronLeft size={16} />
                            <span className="text-slate-900">{categoryName}</span>
                        </nav>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div>
                            <div className="inline-block bg-[#f59e0b]/10 text-[#f59e0b] px-4 py-1 rounded-full text-xs font-black mb-4 uppercase tracking-widest">
                                {t.catalog}
                            </div>
                            <h1 className="text-6xl font-black text-slate-900 mb-4">{categoryName}</h1>
                            <p className="text-2xl text-slate-500 max-w-2xl font-light leading-relaxed">
                                {t.desc} {categoryName}.
                            </p>
                        </div>
                        <button className="btn-secondary flex items-center gap-3 !py-4 !px-8 group">
                            <Filter size={20} className="group-hover:rotate-12 transition-transform" />
                            <span className="text-lg font-bold">{t.filter}</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>

            {/* Results Grid */}
            <section className="max-w-7xl mx-auto py-16 px-8 mb-24">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-10">
                    {items.map((item: any) => (
                        <ItemCard key={item.id} item={item} locale={locale} />
                    ))}
                </div>
            </section>
        </main>
    );
}