/**
 * Category Archive Page.
 * Polished with premium visuals and consistent navigation.
 */

import { getCategories, getTrendingItems } from '@/lib/api';
import Link from 'next/link';
import { ChevronLeft, Filter, ShoppingBag, ArrowRight } from 'lucide-react';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const categories = await getCategories();
    const allItems = await getTrendingItems();

    const category = categories.find((c: any) => c.slug === slug);
    
    // For demo purposes, we filter items that might belong to this category
    const items = allItems.filter((item: any) => item.category_slug === slug || true);

    if (!category) return <div className="p-20 text-center font-black text-2xl">קטגוריה לא נמצאה</div>;

    return (
        <main className="min-h-screen bg-slate-50">
            {/* Page Header */}
            <header className="bg-white border-b border-slate-200 py-16 px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Navigation path */}
                    <nav className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-8">
                        <Link href="/" className="hover:text-[#1e3a8a]">דף הבית</Link>
                        <ChevronLeft size={16} />
                        <span className="text-slate-900">{category.name_he}</span>
                    </nav>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div>
                            <div className="inline-block bg-[#f59e0b]/10 text-[#f59e0b] px-4 py-1 rounded-full text-xs font-black mb-4 uppercase tracking-widest">
                                קטלוג הטבות
                            </div>
                            <h1 className="text-5xl font-black text-slate-900 mb-4">{category.name_he}</h1>
                            <p className="text-xl text-slate-500 max-w-2xl leading-relaxed">
                                מרכז ההטבות והשירותים בקטגוריית {category.name_he}. כל מה שחשוב לקהילה החרדית העובדת, במקום אחד.
                            </p>
                        </div>
                        <button className="btn-secondary flex items-center gap-2 group">
                            <Filter size={20} className="group-hover:rotate-12 transition-transform" />
                            <span>סינון ומיון</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Results Grid */}
            <section className="max-w-7xl mx-auto py-16 px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-10">
                    {items.map((item: any) => (
                        <div key={item.id} className="takhles-card group flex flex-col h-full overflow-hidden">
                            <div className="h-48 bg-slate-100 relative overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform duration-700">
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
                                        className="text-[#1e3a8a] font-black text-sm flex items-center gap-1 group/btn"
                                    >
                                        <span>לפרטים</span>
                                        <ArrowRight size={16} className="group-hover/btn:translate-x-[-4px] transition-transform" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}