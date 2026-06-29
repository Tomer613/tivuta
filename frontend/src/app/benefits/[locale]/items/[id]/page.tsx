/**
 * Item Detail Page.
 * Professional layout with localized content.
 */

import { notFound } from 'next/navigation';
import { getTrendingItems } from '@/lib/api';
import BackButton from '@/components/BackButton';
import { ShieldCheck, Zap, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type SupportedLocale = 'he' | 'en' | 'fr' | 'yi';

export async function generateStaticParams() {
  const items = await getTrendingItems();
  const locales: SupportedLocale[] = ['he', 'en', 'fr', 'yi'];
  
  const params = [];
  for (const locale of locales) {
    for (const item of items) {
      params.push({ locale, id: item.id.toString() });
    }
  }
  return params;
}

interface ItemTranslation {
    home: string;
    exclusive: string;
    open: string;
    details: string;
    redeem: string;
    trust: string;
    speed: string;
    security: string;
    security_desc: string;
}

const translations: Record<string, ItemTranslation> = {
    he: { home: "דף הבית", exclusive: "הטבה בלעדית", open: "פתיחת הצעה", details: "פרטי ההטבה", redeem: "מימוש עכשיו", trust: "נבדק ואושר", speed: "מימוש מיידי", security: "אבטחה מלאה", security_desc: "כל המידע מוצפן ומאובטח לפי הסטנדרטים המחמירים ביותר." },
    en: { home: "Home", exclusive: "Exclusive Offer", open: "Open Offer", details: "Benefit Details", redeem: "Redeem Now", trust: "Vetted & Approved", speed: "Instant Redeem", security: "Full Security", security_desc: "All information is encrypted and secured according to strict standards." },
    fr: { home: "Accueil", exclusive: "Offre Exclusive", open: "Voir l'offre", details: "Détails", redeem: "En profiter", trust: "Vérifié", speed: "Immédiat", security: "Sécurisé", security_desc: "Toutes les informations sont cryptées." },
    yi: { home: "היים", exclusive: "עקסקלוסיוו", open: "עפענען", details: "פרטים", redeem: "ניצן יעצט", trust: "געקאנטראלירט", speed: "זאפארט", security: "זיכערהייט", security_desc: "אלע אינפארמאציע איז זיכער." }
};

export default async function ItemPage({ params }: { params: Promise<{ locale: string, id: string }> }) {
    const { locale: rawLocale, id } = await params;
    const locale = rawLocale as SupportedLocale;

    const items = await getTrendingItems();
    const item = items.find((i: any) => i.id.toString() === id);

    if (!item) {
        notFound();
    }

    const t = translations[locale] || translations.he;
    const title = item[`title_${locale}`] || item.title_he;
    const desc = item[`description_${locale}`] || item.description_he;

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const imagePath = item.image_url
        ? `${basePath}/images/items/${item.image_url}`
        : `${basePath}/images/items/placeholder.jpg`;

    return (
        <main className="min-h-screen bg-[#111a2f]">
            {/* Breadcrumbs & Header */}
            <div className="bg-[#0e1628] border-b border-[#d4af37]/20 pt-32 pb-12 px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-10">
                    <BackButton locale={locale} />
                    
                    <div className="flex-grow">
                        <div className="flex items-center gap-2 text-[#f0e6d3]/60 text-sm mb-4 font-bold uppercase tracking-widest justify-center md:justify-start">
                            <Link href={`/benefits/${locale}`} className="hover:text-[#1e3a8a]">{t.home}</Link>
                            <ChevronRight size={14} />
                            <span className="text-[#1e3a8a]">{t.exclusive}</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-[#f0e6d3] leading-tight text-center md:text-start">{title}</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto py-16 px-8 grid grid-cols-1 lg:grid-cols-3 gap-16">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-12">
                    <div className="bg-[#0e1628] rounded-[4rem] p-12 shadow-sm border border-[#d4af37]/20">
                        <div className="w-full h-80 md:h-96 relative rounded-3xl overflow-hidden mb-12 border border-[#d4af37]/10">
                            <Image 
                                src={imagePath}
                                alt={title}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <h2 className="text-2xl font-black mb-6 border-s-8 border-[#d4af37] ps-6">{t.details}</h2>
                        <p className="text-xl text-[#f0e6d3] leading-relaxed text-start">{desc}</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-[#0e1628] p-8 rounded-3xl border border-[#d4af37]/20 flex flex-col items-center text-center">
                            <ShieldCheck className="text-green-600 mb-4" size={40} />
                            <span className="font-bold text-[#f0e6d3]">{t.trust}</span>
                        </div>
                        <div className="bg-[#0e1628] p-8 rounded-3xl border border-[#d4af37]/20 flex flex-col items-center text-center">
                            <Zap className="text-[#d4af37] mb-4" size={40} />
                            <span className="font-bold text-[#f0e6d3]">{t.speed}</span>
                        </div>
                        <div className="bg-[#0e1628] p-8 rounded-3xl border border-[#d4af37]/20 flex flex-col items-center text-center">
                            <Clock className="text-blue-600 mb-4" size={40} />
                            <span className="font-bold text-[#f0e6d3]">24/7 Support</span>
                        </div>
                    </div>
                </div>

                {/* Sidebar CTA */}
                <div className="lg:col-span-1">
                    <div className="sticky top-32 space-y-6">
                        <div className="bg-[#111a2f] border border-[#d4af37]/20 rounded-[3rem] p-10 text-[#f0e6d3] shadow-2xl shadow-[#111a2f]/40">
                            <h3 className="text-2xl font-black mb-8">{t.open}</h3>
                            <button className="w-full bg-[#d4af37] text-[#080d1f] py-6 rounded-2xl font-black text-xl hover:bg-[#f5d061] transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-[#d4af37]/20">
                                {t.redeem}
                            </button>
                            <p className="mt-8 text-sm opacity-60 text-center leading-relaxed">
                                {t.security_desc}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}