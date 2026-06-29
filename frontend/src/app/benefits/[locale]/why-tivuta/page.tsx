import { Sparkles, BarChart3, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';

export function generateStaticParams() {
  return [
    { locale: 'he' },
    { locale: 'en' },
    { locale: 'fr' },
    { locale: 'yi' },
  ];
}

interface WhyTivutaTranslation {
    hero_t: string;
    hero_s: string;
    p1_t: string;
    p1_d: string;
    p2_t: string;
    p2_d: string;
    cta_t: string;
    cta_join: string;
    cta_list: string;
}

const translations: Record<string, WhyTivutaTranslation> = {
    he: {
        hero_t: "למה כדאי לך להיות חלק מטיבותא?",
        hero_s: "כי אנחנו לא רק פורטל הטבות – אנחנו הכוח של הקהילה שלך בשוק הישראלי.",
        p1_t: "כוח קנייה אדיר",
        p1_d: "כקהילה של עשרות אלפי עובדים, אנחנו מגיעים לספקים מעמדת כוח. זה מאפשר לנו להשיג הנחות ותנאים שפשוט אי אפשר לקבל בצורה פרטית.",
        p2_t: "סינון והתאמה לקהילה",
        p2_d: "אנחנו מבינים את הניואנסים. כל הטבה עוברת סינון של ערכים, כשרות והתאמה לאורח החיים התורני, כדי שתוכל ליהנות בראש שקט.",
        cta_t: "מוכן להתחיל לחסוך?",
        cta_join: "הצטרפות עכשיו",
        cta_list: "לרשימת ההטבות"
    },
    en: {
        hero_t: "Why should you be part of TIVUTA?",
        hero_s: "Because we're not just a benefits portal – we're the power of your community in the Israeli market.",
        p1_t: "Enormous Purchasing Power",
        p1_d: "As a community of tens of thousands of workers, we approach suppliers from a position of power. This allows us to get discounts you can't get privately.",
        p2_t: "Filtering & Adaptation",
        p2_d: "We understand the nuances. Every benefit undergoes values, kosher, and lifestyle filtering so you can enjoy with peace of mind.",
        cta_t: "Ready to start saving?",
        cta_join: "Join Now",
        cta_list: "Browse Benefits"
    },
    fr: {
        hero_t: "Pourquoi rejoindre TIVUTA?",
        hero_s: "Parce que nous ne sommes pas seulement un portail d'avantages – nous sommes la force de votre communauté.",
        p1_t: "Puissance d'achat massive",
        p1_d: "En tant que communauté de dizaines de milliers de travailleurs, nous négocions avec les fournisseurs en position de force.",
        p2_t: "Sélection et adaptation",
        p2_d: "Chaque avantage est filtré pour correspondre aux valeurs et au mode de vie de la communauté.",
        cta_t: "Prêt à économiser?",
        cta_join: "S'inscrire",
        cta_list: "Voir les offres"
    },
    yi: {
        hero_t: "פאר וואס זאלט איר זיין א טייל פון טיבותא?",
        hero_s: "ווייל מיר זענען די כוח פון דער קהילה אין דעם מארק.",
        p1_t: "שטארקע קויפן כוח",
        p1_d: "מיט צענדליגע טויזנטער ארבעטער, קענען מיר באקומען די בעסטע פרייזן פאר אייך.",
        p2_t: "פילטער און צופאזונג",
        p2_d: "יעדער בענעפיט גייט אדורך א שטרענגע פילטער צופאסן פארן היימישן ציבור.",
        cta_t: "גרייט אנצוהויבן שפארן?",
        cta_join: "שליסן זיך אן",
        cta_list: "זען די בענעפיטן"
    }
};

export default async function WhyTivutaPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = translations[locale] || translations.he;

    return (
        <main className="min-h-screen bg-[#0e1628]">
            {/* Header */}
            <header className="bg-[#1e3a8a] py-32 px-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 to-transparent"></div>
                </div>
                <div className="max-w-4xl mx-auto relative z-10">
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tight">{t.hero_t}</h1>
                    <p className="text-2xl text-[#f0e6d3]/80 font-light leading-relaxed">
                        {t.hero_s}
                    </p>
                </div>
            </header>

            {/* Content Sections */}
            <section className="max-w-7xl mx-auto py-24 px-8 space-y-32">
                
                {/* Point 1 - Logical Layout */}
                <div className="grid md:grid-cols-2 gap-16 items-center text-start">
                    <div className="flex flex-col items-start">
                        <div className="w-14 h-14 bg-[#111a2f] text-[#1e3a8a] rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <BarChart3 size={28} />
                        </div>
                        <h2 className="text-4xl font-black text-[#f0e6d3] mb-6">{t.p1_t}</h2>
                        <p className="text-xl text-[#f0e6d3]/60 leading-relaxed text-start">
                            {t.p1_d}
                        </p>
                    </div>
                    <div className="bg-[#111a2f] h-80 rounded-[4rem] border border-[#d4af37]/20 flex items-center justify-center shadow-inner">
                        <div className="text-[#f0e6d3]/40">
                            <Zap size={140} strokeWidth={0.5} />
                        </div>
                    </div>
                </div>

                {/* Point 2 - Natural Grid Flip */}
                <div className="grid md:grid-cols-2 gap-16 items-center text-start">
                    <div className="bg-[#111a2f] h-80 rounded-[4rem] border border-[#d4af37]/20 flex items-center justify-center shadow-inner md:order-first order-last">
                        <div className="text-[#f0e6d3]/40">
                            <ShieldCheck size={140} strokeWidth={0.5} />
                        </div>
                    </div>
                    <div className="flex flex-col items-start">
                        <div className="w-14 h-14 bg-[#d4af37]/10 text-[#d97706] rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <Sparkles size={28} />
                        </div>
                        <h2 className="text-4xl font-black text-[#f0e6d3] mb-6">{t.p2_t}</h2>
                        <p className="text-xl text-[#f0e6d3]/60 leading-relaxed text-start">
                            {t.p2_d}
                        </p>
                    </div>
                </div>

            </section>

            {/* Closing CTA */}
            <section className="bg-[#111a2f] py-32 px-8 text-center border-t border-[#d4af37]/20 rounded-t-[5rem]">
                <h2 className="text-4xl font-black text-[#f0e6d3] mb-10">{t.cta_t}</h2>
                <div className="flex flex-col sm:flex-row justify-center gap-6">
                    <Link href={`/benefits/${locale}/join`} className="btn-primary !px-12 !py-5 !text-xl shadow-2xl">{t.cta_join}</Link>
                    <Link href={`/benefits/${locale}/monthly`} className="btn-secondary !px-12 !py-5 !text-xl bg-[#0e1628]">{t.cta_list}</Link>
                </div>
            </section>
        </main>
    );
}
