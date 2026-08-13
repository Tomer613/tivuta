import { getAllItems, getCategories } from '@/lib/api';
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

const translations: Record<string, Record<string, string>> = {
    he: { 
        title_monthly: "הטבות החודש", 
        title_featured: "מומלץ עבורך",
        title_all: "כל ההטבות",
        subtitle_monthly: "גלה את כל השירותים וההטבות הבלעדיות שמחכות לך בקהילת טיבותא.", 
        subtitle_featured: "הטבות שנבחרו במיוחד עבור חברי הקהילה שלנו.",
        subtitle_all: "צפה בכל המגוון העצום של השירותים וההנחות של טיבותא.",
        all: "הכל", 
        results: "תוצאות נמצאו", 
        empty: "לא נמצאו הטבות", 
        back: "חזור להטבות",
        pool_monthly: "הטבות החודש",
        pool_featured: "מומלץ עבורך",
        pool_all: "כל הקטלוג",
        browse_all: "רוצה לראות עוד? צפה בכל הקטלוג",
        login_required: "כדי לראות הטבות המותאמות אישית עבורך, עליך להתחבר למערכת.",
        login_btn: "התחבר עכשיו"
    },
    en: { 
        title_monthly: "Monthly Benefits", 
        title_featured: "Recommended for You",
        title_all: "All Benefits",
        subtitle_monthly: "Explore all exclusive services and benefits waiting for you in the TIVUTA community.", 
        subtitle_featured: "Handpicked deals specially selected for our community members.",
        subtitle_all: "Explore the full range of TIVUTA services and discounts.",
        all: "All", 
        results: "results found", 
        empty: "No benefits found", 
        back: "Back to Benefits",
        pool_monthly: "Monthly Deals",
        pool_featured: "Recommended",
        pool_all: "Full Catalog",
        browse_all: "Want to see more? Browse the full catalog",
        login_required: "To see personalized benefits, please log in to your account.",
        login_btn: "Log In Now"
    },
    fr: { 
        title_monthly: "Mensuels", 
        title_featured: "Recommandé pour vous",
        title_all: "Tous les avantages",
        subtitle_monthly: "Découvrez tous les services et avantages exclusifs de la communauté TIVUTA.", 
        subtitle_featured: "Offres sélectionnées spécialement pour nos membres.",
        subtitle_all: "Découvrez toute la gamme des services TIVUTA.",
        all: "Tout", 
        results: "résultats trouvés", 
        empty: "Aucun avantage trouvé", 
        back: "Retour aux avantages",
        pool_monthly: "Offres du Mois",
        pool_featured: "Recommandé",
        pool_all: "Tout le catalogue",
        browse_all: "Voulez-vous en voir plus ? Voir tout le catalogue",
        login_required: "Pour voir les avantages personnalisés, veuillez vous connecter.",
        login_btn: "Se connecter"
    },
    yi: { 
        title_monthly: "חודש בענעפיטן", 
        title_featured: "רעקאמענדירט פאר אייך",
        title_all: "אלע בענעפיטן",
        subtitle_monthly: "געפינט אלע עקסקלוסיוו בענעפיטן פארן היימישן ציבור.", 
        subtitle_featured: "בענעפיטן ספעציעל אויסגעקליבן פאר אונזערע מיטגלידער.",
        subtitle_all: "זען אלע טעקלהעס סערוויסעס און בענעפיטן.",
        all: "אלע", 
        results: "תוצאות געפונען", 
        empty: "נישט געפונען קיין בענעפיטן", 
        back: "צוריק צו בענעפיטן",
        pool_monthly: "חודש בענעפיטן",
        pool_featured: "רעקאמענדירט",
        pool_all: "אלע בענעפיטן",
        browse_all: "ווילט איר זען מער? זען אלע בענעפיטן",
        login_required: "צו זען רעקאמענדירטע בענעפיטן, ביטע לאג-אין.",
        login_btn: "לאג-אין יעצט"
    }
};

type SupportedLocale = 'he' | 'en' | 'fr' | 'yi';

export default async function BenefitsPage({ 
    params
}: { 
    params: Promise<{ locale: string }>
}) {
    const { locale: rawLocale } = await params;
    const locale = rawLocale as SupportedLocale;
    
    const allItems = await getAllItems();
    const categories = await getCategories();

    const t = translations[locale] || translations.he;

    return (
        <main className="min-h-screen bg-[#111a2f] text-start">
            <Suspense fallback={<div className="p-24 text-center text-[#f0e6d3]/60 font-bold">Loading Benefits...</div>}>
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
