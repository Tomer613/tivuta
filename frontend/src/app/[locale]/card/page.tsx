import CardClient from './CardClient';

export function generateStaticParams() {
    return [
        { locale: 'he' },
        { locale: 'en' },
        { locale: 'fr' },
        { locale: 'yi' },
    ];
}

export default async function CardPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    return <CardClient locale={locale} />;
}
