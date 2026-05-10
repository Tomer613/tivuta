import { getTrendingItems, getCategories } from '@/lib/api';
import Link from 'next/link';
import { ShoppingBag, LayoutGrid } from 'lucide-react';
import ItemCard from '@/components/ItemCard';
import BackButton from '@/components/BackButton';

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
    params,
    searchParams 
}: { 
    params: Promise<{ locale: string }>,
    searchParams: Promise<{ category?: string, search?: string }> 
}) {
    const { locale: rawLocale } = await params;
    const locale = rawLocale as SupportedLocale;
    const { category, search } = await searchParams;
    const allItems = await getTrendingItems();
    const categories = await getCategories();

    const t = translations[locale] || translations.he;

    const currentCategoryObj = categories.find((c: any) => c.slug === category);
    const categoryId = currentCategoryObj?.id;

    const filteredItems = allItems.filter((item: any) => {
        const matchesCategory = !category || item.cat_id_new === categoryId;
        const title = item[`title_${locale as 'he' | 'en' | 'fr' | 'yi'}`] || item.title_he;
        const desc = item[`description_${locale as 'he' | 'en' | 'fr' | 'yi'}`] || item.description_he;
        
        const matchesSearch = !search || 
            title.toLowerCase().includes(search.toLowerCase()) || 
            desc.toLowerCase().includes(search.toLowerCase());

        return matchesCategory && matchesSearch;
    });

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

            {/* Filter Bar */}
            <section className="max-w-7xl mx-auto py-10 px-8">
                <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    <Link 
                        href={`/${locale}/benefits`} 
                        className={`px-8 py-3 rounded-2xl text-base font-bold whitespace-nowrap transition-all ${!category ? 'bg-[#1e3a8a] text-white shadow-xl shadow-blue-900/20' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                    >
                        {t.all}
                    </Link>
                    {categories.map((cat: any) => (
                        <Link 
                            key={cat.id} 
                            href={`/${locale}/benefits?category=${cat.slug}${search ? `&search=${search}` : ''}`}
                            className={`px-8 py-3 rounded-2xl text-base font-bold whitespace-nowrap transition-all ${category === cat.slug ? 'bg-[#1e3a8a] text-white shadow-xl shadow-blue-900/20' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                        >
                            {cat[`name_${locale as 'he' | 'en' | 'fr' | 'yi'}`] || cat.name_he}
                        </Link>
                    ))}
                </div>
            </section>

            {/* Catalog Grid */}
            <section className="max-w-7xl mx-auto py-8 px-8 mb-24">
                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-10">
                        {filteredItems.map((item: any) => (
                            <ItemCard key={item.id} item={item} locale={locale} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
                        <div className="text-slate-100 flex justify-center mb-8">
                            <LayoutGrid size={100} strokeWidth={1} />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-4">{t.empty}</h3>
                        <Link href={`/${locale}/benefits`} className="text-[#1e3a8a] font-black text-lg underline underline-offset-8">
                            {t.back}
                        </Link>
                    </div>
                )}
            </section>
        </main>
    );
}
