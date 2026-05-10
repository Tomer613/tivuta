/**
 * Category Page
 * Displays sub-categories and items for a specific category.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategoryBySlug, getCategoryItems, getCategories } from '@/lib/api';
import ItemCard from '@/components/ItemCard';
import BackButton from '@/components/BackButton';
import { 
    ScrollText, Utensils, Shirt, ShoppingBasket, Palmtree, 
    Smartphone, HeartPulse, PartyPopper, Home, Users, Landmark, Hammer,
    LayoutGrid, ChevronRight
} from 'lucide-react';

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
    params, 
    searchParams 
}: { 
    params: Promise<{ locale: string, slug: string }>,
    searchParams: Promise<{ sub?: string }>
}) {
    const { locale: rawLocale, slug } = await params;
    const locale = rawLocale as SupportedLocale;
    const { sub: activeSubSlug } = await searchParams;

    const category = await getCategoryBySlug(slug);
    const allItems = await getCategoryItems(slug);

    if (!category) {
        notFound();
    }

    // Filter items based on active sub-category slug
    const filteredItems = activeSubSlug 
        ? allItems.filter((item: any) => {
            const subCat = category.sub_categories.find((s: any) => s.id === item.sub_category_id);
            return subCat?.slug === activeSubSlug;
          })
        : allItems;

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

            {/* Sub-Categories Filter Section */}
            {category.sub_categories && category.sub_categories.length > 0 && (
                <section className="max-w-7xl mx-auto py-12 px-6">
                    <h2 className="text-lg font-black text-slate-400 uppercase tracking-widest mb-8 text-start">
                        {t.sub_categories}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href={`/${locale}/categories/${category.slug}`}
                            className={`px-6 py-3 rounded-full font-bold transition-all active:scale-95 border ${
                                !activeSubSlug 
                                ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-lg shadow-blue-900/20" 
                                : "bg-white text-slate-700 border-slate-200 hover:border-[#1e3a8a]"
                            }`}
                        >
                            {t.all}
                        </Link>

                        {category.sub_categories.map((sub: any) => (
                            <Link
                                key={sub.id}
                                href={`/${locale}/categories/${category.slug}?sub=${sub.slug}`}
                                className={`px-6 py-3 rounded-full font-bold transition-all active:scale-95 border ${
                                    activeSubSlug === sub.slug
                                    ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-lg shadow-blue-900/20" 
                                    : "bg-white text-slate-700 border-slate-200 hover:border-[#1e3a8a]"
                                }`}
                            >
                                {sub[`name_${locale}`] || sub.name_he}
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Items Grid */}
            <section className="max-w-7xl mx-auto py-12 px-6">
                <h2 className="text-3xl font-black text-slate-900 mb-12 text-start">
                    {activeSubSlug 
                        ? category.sub_categories.find((s: any) => s.slug === activeSubSlug)?.[`name_${locale}`] || t.all_items
                        : t.all_items
                    }
                </h2>

                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-10">
                        {filteredItems.map((item: any) => (
                            <ItemCard key={item.id} item={item} locale={locale} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white border border-dashed border-slate-300 rounded-[3rem] p-24 text-center">
                        <p className="text-slate-400 text-xl italic">{t.no_items}</p>
                    </div>
                )}
            </section>
        </main>
    );
}