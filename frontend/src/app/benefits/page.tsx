/**
 * All Benefits Page.
 * Displays the complete catalog with server-side filtering and search.
 */

import { getTrendingItems, getCategories } from '@/lib/api';
import Link from 'next/link';
import { ShoppingBag, ArrowRight, Search, LayoutGrid } from 'lucide-react';

export default async function BenefitsPage({ searchParams }: { searchParams: Promise<{ category?: string, search?: string }> }) {
    const { category, search } = await searchParams;
    const allItems = await getTrendingItems();
    const categories = await getCategories();

    // Map slug back to ID for synchronized filtering
    const currentCategoryObj = categories.find((c: any) => c.slug === category);
    const categoryId = currentCategoryObj?.id;

    const filteredItems = allItems.filter((item: any) => {
        const matchesCategory = !category || item.cat_id_new === categoryId;
        const matchesSearch = !search || 
            item.title.toLowerCase().includes(search.toLowerCase()) || 
            item.description.toLowerCase().includes(search.toLowerCase());

        return matchesCategory && matchesSearch;
    });

    return (
        <main className="min-h-screen bg-slate-50">
            {/* Page Header */}
            <header className="bg-white border-b border-slate-200 py-16 px-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-5xl font-black text-slate-900 mb-6">כל ההטבות</h1>
                    <p className="text-xl text-slate-500 max-w-2xl leading-relaxed">
                        גלה את כל השירותים וההטבות הבלעדיות שמחכות לך בקהילת טיבותא.
                    </p>
                </div>
            </header>

            {/* Filter & Search Bar */}
            <section className="max-w-7xl mx-auto py-8 px-8">
                <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        <Link 
                            href="/benefits" 
                            className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${!category ? 'bg-[#1e3a8a] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            הכל
                        </Link>
                        {categories.map((cat: any) => (
                            <Link 
                                key={cat.id} 
                                href={`/benefits?category=${cat.slug}${search ? `&search=${search}` : ''}`}
                                className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${category === cat.slug ? 'bg-[#1e3a8a] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                {cat.name_he}
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Results Info */}
            {(search || category) && (
                <div className="max-w-7xl mx-auto px-8 mb-4">
                    <p className="text-slate-400 font-bold">
                        נמצאו {filteredItems.length} תוצאות 
                        {search && ` לחיפוש "${search}"`}
                        {category && ` בקטגוריית ${categories.find((c: any) => c.slug === category)?.name_he || category}`}
                    </p>
                </div>
            )}

            {/* Catalog Grid */}
            <section className="max-w-7xl mx-auto py-8 px-8 mb-24">
                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-10">
                        {filteredItems.map((item: any) => (
                            <div key={item.id} className="takhles-card group flex flex-col h-full overflow-hidden">
                                <div className="h-48 bg-slate-100 relative overflow-hidden">
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                                        <ShoppingBag size={48} strokeWidth={1} />
                                    </div>
                                </div>
                                <div className="p-8 flex-grow flex flex-col">
                                    <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-[#2563eb] transition-colors">
                                        {item.title}
                                    </h3>
                                    <div className="mt-auto flex justify-between items-center pt-6 border-t border-slate-50">
                                        <span className="text-2xl font-black text-[#1e3a8a]">₪{item.price || '0'}</span>
                                        <Link 
                                            href={`/items/${item.id}`}
                                            className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-[#2563eb] transition-all"
                                        >
                                            <ArrowRight size={20} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-slate-200">
                        <div className="text-slate-200 flex justify-center mb-6">
                            <LayoutGrid size={80} strokeWidth={1} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">לא נמצאו הטבות</h3>
                        <p className="text-slate-500">נסה לחפש משהו אחר או לבחור קטגוריה אחרת.</p>
                        <Link href="/benefits" className="mt-8 inline-block text-[#1e3a8a] font-bold underline">חזור לכל ההטבות</Link>
                    </div>
                )}
            </section>
        </main>
    );
}
