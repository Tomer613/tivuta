import type { Metadata } from 'next';
import ProductQueryPage from '@/components/ProductQueryPage';

export function generateStaticParams() {
    return [{ locale: 'he' }, { locale: 'en' }, { locale: 'fr' }, { locale: 'yi' }];
}

const TITLE: Record<string, string> = {
    he: 'מוצרים',
    en: 'Products',
    fr: 'Produits',
    yi: 'פראדוקטן',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale: rawLocale } = await params;
    const locale = ['he', 'en', 'fr', 'yi'].includes(rawLocale) ? rawLocale : 'he';
    return {
        title: TITLE[locale],
        alternates: {
            canonical: `/${locale}/products`,
            languages: {
                he: '/he/products',
                en: '/en/products',
                fr: '/fr/products',
                yi: '/yi/products',
                'x-default': '/he/products',
            },
        },
    };
}

export default function ProductsIndexPage() {
    return <ProductQueryPage />;
}
