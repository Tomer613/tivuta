import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ProductQueryPage from '@/components/ProductQueryPage';
import { normalizeLocale, generateStaticParams } from '@/lib/locales';

export { generateStaticParams };

const TITLE: Record<string, string> = {
    he: 'מוצרים',
    en: 'Products',
    fr: 'Produits',
    yi: 'פראדוקטן',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale: rawLocale } = await params;
    const locale = normalizeLocale(rawLocale);
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

function ProductsFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#111a2f]">
            <Loader2 className="animate-spin text-[#d4af37]" size={40} />
        </div>
    );
}

export default function ProductsIndexPage() {
    return (
        <Suspense fallback={<ProductsFallback />}>
            <ProductQueryPage />
        </Suspense>
    );
}
