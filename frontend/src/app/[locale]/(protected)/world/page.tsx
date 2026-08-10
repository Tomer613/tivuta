import type { Metadata } from 'next';
import VerticalQueryPage from '@/components/VerticalQueryPage';
import { normalizeLocale, generateStaticParams } from '@/lib/locales';

export { generateStaticParams };

const TITLE: Record<string, string> = {
    he: 'עולמות הקנייה — יהלומים, רכבים, ביטוח ועוד',
    en: 'Our Worlds — Diamonds, Cars, Insurance & More',
    fr: 'Nos Univers — Diamants, Voitures, Assurance et Plus',
    yi: 'אונדזערע וועלטן — דימענטן, אויטאס, אינשורענס',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale: rawLocale } = await params;
    const locale = normalizeLocale(rawLocale);
    return {
        title: TITLE[locale],
        alternates: {
            canonical: `/${locale}/world`,
            languages: {
                he: '/he/world',
                en: '/en/world',
                fr: '/fr/world',
                yi: '/yi/world',
                'x-default': '/he/world',
            },
        },
    };
}

export default function WorldPage() {
    return <VerticalQueryPage />;
}
