import ShoppingListClient from './ShoppingListClient';

export function generateStaticParams() {
    return [{ locale: 'he' }, { locale: 'en' }, { locale: 'fr' }, { locale: 'yi' }];
}

export default function ShoppingListPage() {
    return <ShoppingListClient />;
}
