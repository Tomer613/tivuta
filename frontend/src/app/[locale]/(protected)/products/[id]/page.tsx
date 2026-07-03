import { getAllProductIds } from '@/lib/api';
import ProductDetailClient from '@/components/ProductDetailClient';

type SupportedLocale = 'he' | 'en' | 'fr' | 'yi';

export async function generateStaticParams() {
    const products = await getAllProductIds();
    const locales: SupportedLocale[] = ['he', 'en', 'fr', 'yi'];

    const params = [];
    for (const locale of locales) {
        for (const product of products) {
            params.push({ locale, id: product.id.toString() });
        }
    }
    return params;
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <ProductDetailClient productId={Number(id)} />;
}
