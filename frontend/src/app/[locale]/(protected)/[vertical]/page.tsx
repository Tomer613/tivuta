import { getVerticals } from '@/lib/api';
import VerticalListingClient from '@/components/VerticalListingClient';

type SupportedLocale = 'he' | 'en' | 'fr' | 'yi';

export async function generateStaticParams() {
    const verticals = await getVerticals();
    const locales: SupportedLocale[] = ['he', 'en', 'fr', 'yi'];

    const params = [];
    for (const locale of locales) {
        for (const vertical of verticals) {
            params.push({ locale, vertical: vertical.slug });
        }
    }
    return params;
}

export default async function VerticalPage({ params }: { params: Promise<{ vertical: string }> }) {
    const { vertical } = await params;
    return <VerticalListingClient vertical={vertical} />;
}
