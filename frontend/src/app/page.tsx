/**
 * Main Landing Page for Tivuta.
 * Upgraded with premium visuals and vibrant accents.
 */

import Link from 'next/link';
import { getCategories, getTrendingItems } from '@/lib/api';
import { LayoutGrid, ArrowRight, ShoppingBag, Sparkles } from 'lucide-react';

export default async function HomePage() {
    const categories = await getCategories();
    const trendingItems = await getTrendingItems();

    return (
        <main className="min-h-screen bg-slate-50">
            {/* Premium Hero Section */}
            <section className="relative bg-[#1e3a8a] py-24 px-6 overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                    <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
                </div>

                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 bg-blue-400/20 text-blue-200 px-4 py-2 rounded-full text-sm font-bold mb-8 backdrop-blur-sm border border-white/10">
                        <Sparkles size={16} />
                        <span>הבית החדש של הקהילה החרדית</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-8 leading-[1.1]">
                        טיבותא. <br />
                        <span className="text-[#f59e0b]">המעטפת שאתה צריך.</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-blue-100 font-light max-w-3xl mx-auto leading-relaxed mb-12">
                        צרכנות נבונה, פתרונות פיננסיים מתקדמים ותרבות פנאי איכותית – הכל מונגש בדיוק עבורך, בלי פשרות.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button className="btn-primary !bg-[#f59e0b] !text-slate-900 !px-10 !py-4 text-xl">הצטרף עכשיו</button>
                        <button className="btn-secondary !bg-transparent !text-white !border-white/30 hover:!bg-white/10 !px-10 !py-4 text-xl">למה טיבותא?</button>
                    </div>
                </div>
            </section>

            {/* Category Navigation */}
            <section className="max-w-7xl mx-auto -mt-12 px-6 relative z-20">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    {categories.map((cat: any) => (
                        <Link
                            key={cat.id}
                            href={`/categories/${cat.slug}`}
                            className="takhles-card p-8 text-center group flex flex-col items-center gap-4 border-b-4 border-transparent hover:border-[#1e3a8a]"
                        >
                            <div className="w-16 h-16 bg-slate-50 text-[#1e3a8a] rounded-2xl flex items-center justify-center group-hover:bg-[#1e3a8a] group-hover:text-white transition-all duration-500 shadow-inner">
                                <LayoutGrid size={32} />
                            </div>
                            <span className="font-bold text-slate-800 text-lg">{cat.name_he}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Main Showcase Section */}
            <section className="max-w-7xl mx-auto py-24 px-6">
                <h2 className="section-title">מומלץ עבורך</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-10">
                    {trendingItems.map((item: any) => (
                        <div key={item.id} className="takhles-card group flex flex-col h-full overflow-hidden">
                            {/* Visual Placeholder */}
                            <div className="h-56 bg-gradient-to-br from-slate-100 to-slate-200 relative group-hover:scale-105 transition-transform duration-700">
                                <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                                    <ShoppingBag size={64} strokeWidth={1} />
                                </div>
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-[#1e3a8a] text-xs font-black px-3 py-1 rounded-full shadow-sm">
                                    הטבה בלעדית
                                </div>
                            </div>

                            <div className="p-8 flex-grow flex flex-col">
                                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-[#2563eb] transition-colors leading-tight">
                                    {item.title}
                                </h3>
                                <p className="text-slate-500 text-sm line-clamp-3 mb-8 leading-relaxed">
                                    {item.description}
                                </p>

                                <div className="mt-auto flex justify-between items-center border-t border-slate-50 pt-6">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">מחיר לחבר</span>
                                        <span className="text-3xl font-black text-[#1e3a8a]">
                                            {item.price ? `₪${item.price}` : "חינם"}
                                        </span>
                                    </div>
                                    <Link
                                        href={`/items/${item.id}`}
                                        className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-[#2563eb] hover:shadow-xl transition-all duration-300 group-hover:rotate-[-5deg]"
                                    >
                                        <ArrowRight size={24} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Newsletter / CTA Section */}
            <section className="bg-slate-900 py-20 px-6 mx-6 rounded-[3rem] mb-24 text-center">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-6">אל תפספס שום הטבה</h2>
                    <p className="text-slate-400 mb-10 text-lg">הצטרף ל-15,000 חברים בקהילה וקבל את כל העדכונים ישירות לנייד.</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input type="text" placeholder="הכנס טלפון או מייל" className="flex-grow bg-slate-800 border-none rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-[#f59e0b] outline-none" />
                        <button className="btn-primary !bg-[#f59e0b] !text-slate-900 whitespace-nowrap">אני רוצה להצטרף</button>
                    </div>
                </div>
            </section>
        </main>
    );
}