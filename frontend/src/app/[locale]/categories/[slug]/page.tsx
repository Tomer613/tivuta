/**
 * Category Page (Server Side)
 * Fetches data and delegates rendering to CategoryContent (Client Side).
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategoryBySlug, getCategoryItems, getCategories } from '@/lib/api';
import BackButton from '@/components/BackButton';
import CategoryContent from '@/components/CategoryContent';
import { 
    ScrollText, Utensils, Shirt, ShoppingBasket, Palmtree, 
    Smartphone, HeartPulse, PartyPopper, Home, Users, Landmark, Hammer,
    LayoutGrid, ChevronRight
} from 'lucide-react';
import { Suspense } from 'react';

type SupportedLocale = 'he' | 'en' | 'fr' | 'yi';

export async function generateStaticParams() {
  const categories = await getCategories();
  const locales: SupportedLocale[] = ['he', 'en', 'fr', 'yi'];
  
  const params = [];
  for (const locale of locales) {
    for (const cat of categories) {
      params.push({ locale, slug: cat.slug });
    }
  }
  return params;
}

interface CategoryTranslation {
    sub_categories: string;
    all_items: string;
    no_items: string;
    all: string;
}

const translations: Record<string, CategoryTranslation> = {
    he: { sub_categories: "תת-קטגוריות", all_items: "כל ההטבות והשירותים", no_items: "אין פריטים להצגה בתת-קטגוריה זו כרגע.", all: "הכל" },
    en: { sub_categories: "Sub-Categories", all_items: "All Benefits & Services", no_items: "No items to display in this sub-category yet.", all: "All" },
    fr: { sub_categories: "Sous-catégories", all_items: "Tous les services", no_items: "Aucun article à afficher.", all: "Tout" },
    yi: { sub_categories: "תת-קאטעגאריעס", all_items: "אלע בענעפיטן", no_items: "קיין זאכן צו ווייזן.", all: "אלע" }
};

export default async function CategoryPage({ 
    params
}: { 
    params: Promise<{ locale: string, slug: string }>
}) {
    const { locale: rawLocale, slug } = await params;
    const locale = rawLocale as SupportedLocale;

    const category = await getCategoryBySlug(slug);
    const allItems = await getCategoryItems(slug);

    if (!category) {
        notFound();
    }

    const categoryIcons: Record<string, React.ReactNode> = {
        judaism: <ScrollText size={48} />,
        dining: <Utensils size={48} />,
        fashion: <Shirt size={48} />,
        groceries: <ShoppingBasket size={48} />,
        travel_attractions: <Palmtree size={48} />,
        electronics: <Smartphone size={48} />,
        health_beauty: <HeartPulse size={48} />,
        events: <PartyPopper size={48} />,
        real_estate_auto: <Home size={48} />,
        family: <Users size={48} />,
        finance: <Landmark size={48} />,
        home_renovation: <Hammer size={48} />,
        default: <LayoutGrid size={48} />
    };

    const isRTL = locale === 'he' || locale === 'yi';
    const categoryName = category[`name_${locale}`] || category.name_he;
    const t = translations[locale] || translations.he;

    return (
        <main className="min-h-screen bg-slate-50">
            {/* Header Section */}
            <section className="bg-white border-b border-slate-200 pt-32 pb-16 px-6">
                <div className="max-w-7xl mx-auto relative">
                    <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-start">
                        <BackButton locale={locale} />

                        <div className="w-24 h-24 bg-[#1e3a8a] text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-900/20 flex-shrink-0">
                            {categoryIcons[category.slug] || categoryIcons.default}
                        </div>

                        <div>
                            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2 font-bold uppercase tracking-widest justify-center md:justify-start">
                                <Link href={`/${locale}`} className="hover:text-[#1e3a8a] transition-colors">TIVUTA</Link>
                                <ChevronRight size={14} className={isRTL ? "rotate-180" : ""} />
                                <span className="text-slate-900">{categoryName}</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900">
                                {categoryName}
                            </h1>
                        </div>
                    </div>
                </div>
            </section>

            {/* Client-side content for filtering */}
            <Suspense fallback={<div className="p-24 text-center">Loading...</div>}>
                <CategoryContent 
                    category={category} 
                    allItems={allItems} 
                    locale={locale} 
                    t={t} 
                />
            </Suspense>
        </main>
    );
}