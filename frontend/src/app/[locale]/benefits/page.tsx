import { getTrendingItems, getCategories } from '@/lib/api';
import BackButton from '@/components/BackButton';
import BenefitsContent from '@/components/BenefitsContent';
import { Suspense } from 'react';

export function generateStaticParams() {
  return [
    { locale: 'he' },
    { locale: 'en' },
    { locale: 'fr' },
    { locale: 'yi' },
  ];
}

interface BenefitsTranslation {
    title: string;
    subtitle: string;
    all: string;
    results: string;
    empty: string;
    back: string;
}

const translations: Record<string, BenefitsTranslation> = {
    he: { title: "כל ההטבות", subtitle: "גלה את כל השירותים וההטבות הבלעדיות שמחכות לך בקהילת טיבותא.", all: "הכל", results: "תוצאות נמצאו", empty: "לא נמצאו הטבות", back: "חזור לכל ההטבות" },
    en: { title: "All Benefits", subtitle: "Explore all exclusive services and benefits waiting for you in the TIVUTA community.", all: "All", results: "results found", empty: "No benefits found", back: "Back to all benefits" },
    fr: { title: "Tous les avantages", subtitle: "Découvrez tous les services et avantages exclusifs de la communauté TIVUTA.", all: "Tout", results: "résultats trouvés", empty: "Aucun avantage trouvé", back: "Retour aux avantages" },
    yi: { title: "אלע בענעפיטן", subtitle: "געפינט אלע עקסקלוסיוו בענעפיטן פארן היימישן ציבור.", all: "אלע", results: "תוצאות געפונען", empty: "נישט געפונען קיין בענעפיטן", back: "צוריק צו אלע בענעפיטן" }
};

type SupportedLocale = 'he' | 'en' | 'fr' | 'yi';

export default async function BenefitsPage({ 
    params
}: { 
    params: Promise<{ locale: string }>
}) {
    const { locale: rawLocale } = await params;
    const locale = rawLocale as SupportedLocale;
    
    const allItems = await getTrendingItems();
    const categories = await getCategories();

    const t = translations[locale] || translations.he;

    return (
        <main className="min-h-screen bg-slate-50 text-start">
            {/* Page Header */}
            <header className="bg-white border-b border-slate-200 py-20 px-8">
                <div className="max-w-7xl mx-auto relative">
                    <div className="lg:absolute lg:-start-24 lg:top-0 mb-10 lg:mb-0">
                        <BackButton locale={locale} />
                    </div>
                    <div className="flex flex-col items-start">
                        <h1 className="text-6xl font-black text-slate-900 mb-6 text-start w-full">{t.title}</h1>
                        <p className="text-2xl text-slate-500 max-w-2xl font-light leading-relaxed text-start w-full">
                            {t.subtitle}
                        </p>
                    </div>
                </div>
            </header>

            {/* Client-side content for filtering and search */}
            <Suspense fallback={<div className="p-24 text-center text-slate-400 font-bold">Loading Benefits...</div>}>
                <BenefitsContent 
                    allItems={allItems} 
                    categories={categories} 
                    locale={locale} 
                    t={t} 
                />
            </Suspense>
        </main>
    );
}
