import Link from 'next/link';
import { getCategories, getTrendingItems } from '@/lib/api';
import { 
    LayoutGrid, 
    ScrollText,
    Utensils,
    Shirt,
    ShoppingBasket,
    Palmtree,
    Smartphone,
    HeartPulse,
    PartyPopper,
    Home,
    Users,
    Landmark,
    Hammer
} from 'lucide-react';
import ItemCard from '@/components/ItemCard';
import DynamicSlogan from '@/components/DynamicSlogan';
import SectionTitle from '@/components/SectionTitle';
import Logo from '@/components/Logo';
import PartnerLogos from '@/components/PartnerLogos';
import { getDictionary } from '@/lib/get-dictionary';

export function generateStaticParams() {
  return [
    { locale: 'he' },
    { locale: 'en' },
    { locale: 'fr' },
    { locale: 'yi' },
  ];
}

const translations: Record<string, Record<string, string>> = {
    he: { recommended: "מומלץ עבורך", featured: "הבחירות שלנו", newsletter_t: "אל תפספס שום הטבה", newsletter_s: "הצטרף ל-15,000 חברים בקהילה וקבל את כל העדכונים ישירות לנייד.", phone_p: "הכנס טלפון או מייל", join_btn: "אני רוצה להצטרף" },
    en: { recommended: "Recommended for You", featured: "Our Top Picks", newsletter_t: "Don't Miss Any Benefit", newsletter_s: "Join 15,000 community members and get all updates directly to your mobile.", phone_p: "Enter phone or email", join_btn: "Join Now" },
    fr: { recommended: "Recommandé pour vous", featured: "Nos sélections", newsletter_t: "Ne manquez aucun avantage", newsletter_s: "Rejoignez 15 000 membres et recevez toutes les mises à jour.", phone_p: "Email ou téléphone", join_btn: "Rejoindre" },
    yi: { recommended: "רעקאמענדירט פאר אייך", featured: "אונזערע אויסוואלן", newsletter_t: "פארפאסט נישט קיין בענעפיט", newsletter_s: "שליסן זיך אן אין אונזער קהילה.", phone_p: "טעלעפאן אדער ע-פאסט", join_btn: "שליסן זיך אן" }
};

type SupportedLocale = 'he' | 'en' | 'fr' | 'yi';

interface HomeCategory {
    id: number;
    slug: string;
    name_he: string;
    name_en?: string;
    name_fr?: string;
    name_yi?: string;
}

interface HomeItem {
    id: number;
    title_he: string;
    title_en: string;
    title_fr: string;
    title_yi: string;
    description_he: string;
    description_en: string;
    description_fr: string;
    description_yi: string;
    price: number | null;
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale: rawLocale } = await params;
    const locale = rawLocale as SupportedLocale;
    const dict = await getDictionary(locale);
    const categories: HomeCategory[] = await getCategories();
    const trendingItems: HomeItem[] = await getTrendingItems();
    
    const t = translations[locale] || translations.he;

    const categoryIcons: Record<string, React.ReactNode> = {
        judaism: <ScrollText size={32} />,
        dining: <Utensils size={32} />,
        fashion: <Shirt size={32} />,
        groceries: <ShoppingBasket size={32} />,
        travel_attractions: <Palmtree size={32} />,
        electronics: <Smartphone size={32} />,
        health_beauty: <HeartPulse size={32} />,
        events: <PartyPopper size={32} />,
        real_estate_auto: <Home size={32} />,
        family: <Users size={32} />,
        finance: <Landmark size={32} />,
        home_renovation: <Hammer size={32} />,
        default: <LayoutGrid size={32} />
    };

    return (
        <main className="min-h-screen bg-[#080d1f] text-start">
            {/* Premium Hero Section */}
            <section className="relative bg-[#080d1f] py-12 md:py-16 lg:py-20 px-6 overflow-hidden">
                <div className="absolute top-0 start-0 w-full h-full opacity-10">
                    <div className="absolute top-10 start-10 w-64 h-64 bg-[#d4af37] rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 end-10 w-96 h-96 bg-[#1e3a8a] rounded-full blur-3xl"></div>
                </div>

                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="text-[#d4af37] text-lg md:text-2xl font-bold mb-4 md:mb-6 animate-float">
                        <span>{dict.hero.badge}</span>
                    </div>
                    <h1 className="text-4xl md:text-7xl font-black text-white mb-4 md:mb-6 leading-[1.1] flex flex-col items-center">
                        <Logo height="h-20 md:h-28" light className="-mb-2" />
                        <DynamicSlogan locale={locale} initialSlogan={dict.hero.title_sub} />
                    </h1>
                    <p className="text-lg md:text-2xl text-[#f0e6d3]/80 font-light max-w-3xl mx-auto leading-relaxed mb-8">
                        {dict.hero.description}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/landing/" className="bg-[#d4af37] text-[#080d1f] hover:bg-[#f5d061] shadow-lg hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-[1.05] !px-8 md:!px-10 !py-3 md:!py-4 text-lg md:text-xl font-bold rounded-2xl transition-all whitespace-nowrap">{dict.common.join_now}</Link>
                        <Link href={`/benefits/${locale}/why-tivuta`} className="btn-secondary !bg-transparent !text-white !border-white/30 hover:!bg-[#0e1628]/10 !px-8 md:!px-10 !py-3 md:!py-4 text-lg md:text-xl">{dict.common.why_tivuta}</Link>
                    </div>
                </div>

                <div className="mt-8 w-full relative">
                    <PartnerLogos />
                </div>

            </section>

            {/* Category Navigation */}
            <section className="max-w-7xl mx-auto -mt-12 px-6 relative z-20">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    {categories.map((cat, index: number) => (
                        <div key={cat.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                            <Link
                                href={`/benefits/${locale}/monthly?pool=all&category=${cat.slug}`}
                                className="takhles-card p-8 text-center group flex flex-col items-center justify-center gap-4 h-full"
                            >
                                <div className="w-16 h-16 bg-[#111a2f] border border-[#d4af37]/20 text-[#d4af37] rounded-2xl flex items-center justify-center group-hover:bg-[#d4af37] group-hover:text-[#080d1f] transition-all duration-500 shadow-inner group-hover:scale-110">
                                    {categoryIcons[cat.slug] || categoryIcons.default}
                                </div>
                                <span className="font-bold text-[#f0e6d3] text-lg">
                                    {cat[`name_${locale as 'he' | 'en' | 'fr' | 'yi'}`] || cat.name_he}
                                </span>
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            {/* Recommended Section */}
            <section className="max-w-7xl mx-auto py-24 px-6">
                <SectionTitle recommended={t.recommended} featured={t.featured} />

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-10">
                    {trendingItems.map((item, index: number) => (
                        <div key={item.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms`, opacity: 0 }}>
                            <ItemCard item={item} locale={locale} />
                        </div>
                    ))}
                </div>
            </section>

            {/* Newsletter / CTA Section - Logical layout */}
            <section className="bg-[#0e1628] border border-[#d4af37]/20 py-24 px-6 mx-6 rounded-[4rem] mb-24 text-center relative overflow-hidden">
                <div className="absolute top-0 end-0 w-64 h-64 bg-[#d4af37]/10 rounded-full blur-3xl -me-32 -mt-32"></div>
                <div className="max-w-3xl mx-auto relative z-10">
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-6 text-center">{t.newsletter_t}</h2>
                    <p className="text-[#f0e6d3]/60 mb-12 text-xl font-light text-center">{t.newsletter_s}</p>
                    
                    {/* Newsletter Input - Logical flex-row */}
                    <div className="flex flex-col sm:flex-row gap-4 bg-[#0e1628]/5 p-2 rounded-3xl backdrop-blur-md border border-white/10 items-stretch">
                        <input 
                            type="text" 
                            placeholder={t.phone_p} 
                            className="flex-grow bg-transparent border-none rounded-2xl px-8 py-5 text-white focus:ring-0 outline-none text-lg text-start" 
                        />
                        <Link href="/landing/" className="bg-[#d4af37] text-[#080d1f] hover:bg-[#f5d061] !py-5 !px-12 !text-xl font-black rounded-2xl shadow-lg hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-105 transition-all whitespace-nowrap flex items-center justify-center">
                            {dict.common.join_now}
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}