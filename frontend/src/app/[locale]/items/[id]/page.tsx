/**
 * Premium Item View.
 * Full multi-language content synchronization.
 */

import { getTrendingItems } from '@/lib/api';
import Link from 'next/link';
import { ChevronLeft, ShieldCheck, Tag, Info, CheckCircle2, Clock } from 'lucide-react';

export default async function ItemPage({ 
    params 
}: { 
    params: Promise<{ locale: string, id: string }> 
}) {
    const { locale, id } = await params;
    const items = await getTrendingItems();
    const item = items.find((i: any) => i.id.toString() === id);

    if (!item) return <div className="p-20 text-center font-black text-2xl">404</div>;

    const t = {
        he: { home: 'דף הבית', exclusive: 'הטבה בלעדית לחברי הקהילה', open: 'פתוח לחברים', details: 'פרטי ההטבה', redeem: 'מימוש הטבה עכשיו', trust: 'אמינות מוכחת', speed: 'שירות מהיר', security: 'אחריות וביטחון', security_desc: 'כל השירותים עוברים סינון קפדני והתאמה לצרכי הקהילה החרדית.' },
        en: { home: 'Home', exclusive: 'Exclusive Member Benefit', open: 'Open to Members', details: 'Benefit Details', redeem: 'Redeem Now', trust: 'Proven Reliability', speed: 'Fast Service', security: 'Trust & Security', security_desc: 'All services undergo strict filtering and adaptation to the community needs.' },
        fr: { home: 'Accueil', exclusive: 'Avantage Membre Exclusif', open: 'Ouvert aux Membres', details: 'Détails de l\'avantage', redeem: 'Profiter maintenant', trust: 'Fiabilité prouvée', speed: 'Service Rapide', security: 'Sécurité et Confiance', security_desc: 'Tous les services sont rigoureusement sélectionnés pour la communauté.' },
        yi: { home: 'היים', exclusive: 'עקסקלוסיוו בענעפיט', open: 'אפן פאר מיטגלידער', details: 'פרטי ההטבה', redeem: 'נוצן די בענעפיט', trust: 'געטרוי', speed: 'שנעלע סערוויס', security: 'זיכערקייט', security_desc: 'אלע סערוויסעס זענען געפילטערט פארן היימישן ציבור.' }
    }[locale as keyof typeof t] || t.he;

    const title = item[`title_${locale as 'he' | 'en' | 'fr' | 'yi'}`] || item.title_he;
    const description = item[`description_${locale as 'he' | 'en' | 'fr' | 'yi'}`] || item.description_he;

    return (
        <main className="min-h-screen bg-slate-50">
            {/* Context Navigation */}
            <nav className="p-8 bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm font-bold text-slate-400">
                    <Link href={`/${locale}`} className="hover:text-[#1e3a8a]">{t.home}</Link>
                    <ChevronLeft size={16} />
                    <span className="text-slate-900">{title}</span>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto py-16 px-8">
                <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100 grid md:grid-cols-2 gap-0">
                    
                    {/* Visual Section */}
                    <div className="bg-slate-50 p-16 flex flex-col justify-center items-center border-e border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 end-0 w-80 h-80 bg-blue-100/50 rounded-full blur-3xl -me-40 -mt-40"></div>
                        
                        <div className="relative z-10 w-full max-w-sm aspect-square bg-white rounded-[3.5rem] shadow-xl flex items-center justify-center border border-slate-100 group">
                            <div className="text-slate-200 group-hover:scale-110 transition-transform duration-1000">
                                <ShieldCheck size={180} strokeWidth={0.3} />
                            </div>
                            <div className="absolute bottom-10 bg-[#1e3a8a] text-white px-8 py-3 rounded-full text-xs font-black tracking-widest uppercase shadow-2xl">
                                Verified Service
                            </div>
                        </div>

                        <div className="mt-16 grid grid-cols-2 gap-6 w-full max-w-sm">
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm">
                                <CheckCircle2 className="text-green-500" size={24} />
                                <span className="text-xs font-black text-slate-600 uppercase">{t.trust}</span>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm">
                                <Clock className="text-blue-500" size={24} />
                                <span className="text-xs font-black text-slate-600 uppercase">{t.speed}</span>
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-20 flex flex-col">
                        <div className="inline-flex items-center gap-2 text-[#d97706] font-black text-xs mb-8 bg-[#d97706]/10 px-5 py-2 rounded-full self-start tracking-widest uppercase">
                            <Tag size={16} />
                            <span>{t.exclusive}</span>
                        </div>

                        <h1 className="text-6xl font-black text-slate-900 mb-8 leading-tight">{title}</h1>
                        
                        <div className="flex items-baseline gap-4 mb-12">
                            <span className="text-6xl font-black text-[#1e3a8a]">
                                {item.price ? `₪${item.price}` : t.open}
                            </span>
                            {item.price && <span className="text-slate-300 line-through text-2xl">₪{(item.price * 1.3).toFixed(0)}</span>}
                        </div>

                        <div className="space-y-10 mb-16">
                            <div className="flex gap-6">
                                <div className="flex-shrink-0 w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-[#1e3a8a] shadow-inner">
                                    <Info size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 mb-2">{t.details}</h3>
                                    <p className="text-xl text-slate-500 leading-relaxed font-light italic">
                                        {description}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto space-y-6">
                            <button className="w-full btn-primary !py-8 !text-3xl shadow-blue-900/30 shadow-[0_20px_50px_rgba(30,58,138,0.3)] hover:scale-[1.02] transition-transform">
                                {t.redeem}
                            </button>
                            <p className="text-center text-slate-400 text-xs font-medium opacity-60">
                                * {locale === 'he' ? 'המימוש כפוף לתקנון הקהילה ותנאי השירות של הספק' : 'Redemption subject to community terms and provider conditions.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 flex flex-col gap-5 shadow-sm">
                        <ShieldCheck className="text-[#1e3a8a]" size={40} />
                        <h4 className="text-xl font-black text-slate-900">{t.security}</h4>
                        <p className="text-slate-500 leading-relaxed">{t.security_desc}</p>
                    </div>
                </div>
            </div>
        </main>
    );
}