import ProductQueryPage from '@/components/ProductQueryPage';

export function generateStaticParams() {
    return [{ locale: 'he' }, { locale: 'en' }, { locale: 'fr' }, { locale: 'yi' }];
}

export default function ProductsIndexPage() {
    return <ProductQueryPage />;
}
