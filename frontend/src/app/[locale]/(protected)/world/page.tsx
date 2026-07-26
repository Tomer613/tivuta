import VerticalQueryPage from '@/components/VerticalQueryPage';

export function generateStaticParams() {
    return [{ locale: 'he' }, { locale: 'en' }, { locale: 'fr' }, { locale: 'yi' }];
}

export default function WorldPage() {
    return <VerticalQueryPage />;
}
