/**
 * Premium Item View.
 * Optimized for clarity, trust, and conversion.
 */

import { getTrendingItems } from '@/lib/api';
import Link from 'next/link';
import { ChevronLeft, ShieldCheck, Tag, Info, CheckCircle2, Clock } from 'lucide-react';

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    // Logic: In production, use a specific getItemsById endpoint.
    // For now, we'll find the item from the trending list for the demo.
    const items = await getTrendingItems();
    const item = items.find((i: any) => i.id.toString() === id);

    if (!item) return <div className="p-20 text-center font-black text-2xl">מוצר לא נמצא</div>;

    return (
        <main className="min-h-screen bg-slate-50">
            {/* Context Navigation */}
            <nav className="p-6 bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm font-bold text-slate-400">
                    <Link href="/" className="hover:text-[#1e3a8a]">דף הבית</Link>
                    <ChevronLeft size={16} />
                    <span className="text-slate-900">{item.title}</span>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto py-16 px-8">
                <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 grid md:grid-cols-2 gap-0">
                    
                    {/* Visual Section */}
                    <div className="bg-slate-50 p-12 flex flex-col justify-center items-center border-l border-slate-100 relative overflow-hidden">
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        
                        <div className="relative z-10 w-full max-w-md aspect-square bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center border border-slate-100 group">
                            <div className="text-slate-200 group-hover:scale-110 transition-transform duration-700">
                                <ShieldCheck size={160} strokeWidth={0.5} />
                            </div>
                            <div className="absolute bottom-8 bg-[#1e3a8a] text-white px-6 py-2 rounded-full text-xs font-black tracking-widest uppercase shadow-lg">
                                Verified Service
                            </div>
                        </div>

                        <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-md">
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                                <CheckCircle2 className="text-green-500" size={20} />
                                <span className="text-xs font-bold text-slate-600">אמינות מוכחת</span>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                                <Clock className="text-blue-500" size={20} />
                                <span className="text-xs font-bold text-slate-600">שירות מהיר</span>
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-16 flex flex-col">
                        <div className="inline-flex items-center gap-2 text-[#d97706] font-black text-sm mb-6 bg-[#d97706]/10 px-4 py-1 rounded-full self-start">
                            <Tag size={16} />
                            <span>הטבה בלעדית לחברי הקהילה</span>
                        </div>

                        <h1 className="text-5xl font-black text-slate-900 mb-6 leading-tight">{item.title}</h1>
                        
                        <div className="flex items-baseline gap-2 mb-10">
                            <span className="text-5xl font-black text-[#1e3a8a]">
                                {item.price ? `₪${item.price}` : "פתוח לחברים"}
                            </span>
                            {item.price && <span className="text-slate-400 line-through text-xl">₪{(item.price * 1.3).toFixed(0)}</span>}
                        </div>

                        <div className="space-y-8 mb-12">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#1e3a8a]">
                                    <Info size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 mb-1">פרטי ההטבה</h3>
                                    <p className="text-slate-500 leading-relaxed italic">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto space-y-4">
                            <button className="w-full btn-primary !py-6 !text-2xl shadow-blue-900/20 shadow-2xl">
                                מימוש הטבה עכשיו
                            </button>
                            <p className="text-center text-slate-400 text-xs font-medium">
                                * המימוש כפוף לתקנון הקהילה ותנאי השירות של הספק
                            </p>
                        </div>
                    </div>
                </div>

                {/* Additional Info Cards */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 flex flex-col gap-3">
                        <ShieldCheck className="text-[#1e3a8a]" size={32} />
                        <h4 className="font-bold text-slate-900">אחריות וביטחון</h4>
                        <p className="text-sm text-slate-500 leading-relaxed">כל השירותים עוברים סינון קפדני והתאמה לצרכי הקהילה החרדית.</p>
                    </div>
                    {/* More cards can be added here */}
                </div>
            </div>
        </main>
    );
}