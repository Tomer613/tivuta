import type { MetadataRoute } from 'next';
import { getVerticals } from '@/lib/api';

export const dynamic = 'force-static';

const SITE_URL = 'https://www.tivuta.co.il';
const LOCALES = ['he', 'en', 'fr', 'yi'] as const;

// Static, locale-repeated routes that exist regardless of live product/vertical data.
const STATIC_PATHS = [
    '', // homepage
    '/login',
    '/register',
    '/cart',
];

const BENEFITS_PATHS = [
    '', // benefits homepage
    '/about',
    '/why-tivuta',
    '/card',
    '/contact',
    '/join',
    '/monthly',
];

function languageAlternates(pathBuilder: (locale: string) => string) {
    return Object.fromEntries(LOCALES.map((locale) => [locale, `${SITE_URL}${pathBuilder(locale)}`]));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const entries: MetadataRoute.Sitemap = [];

    for (const path of STATIC_PATHS) {
        for (const locale of LOCALES) {
            entries.push({
                url: `${SITE_URL}/${locale}${path}`,
                changeFrequency: path === '' ? 'daily' : 'monthly',
                priority: path === '' ? 1 : 0.5,
                alternates: { languages: languageAlternates((l) => `/${l}${path}`) },
            });
        }
    }

    for (const path of BENEFITS_PATHS) {
        for (const locale of LOCALES) {
            entries.push({
                url: `${SITE_URL}/benefits/${locale}${path}`,
                changeFrequency: 'monthly',
                priority: 0.4,
                alternates: { languages: languageAlternates((l) => `/benefits/${l}${path}`) },
            });
        }
    }

    // getVerticals() already falls back to a known static list if the backend is
    // unreachable at build time, so this can never break the GitHub Actions build.
    const verticals = await getVerticals();
    for (const vertical of verticals.filter((v) => v.is_active)) {
        for (const locale of LOCALES) {
            entries.push({
                url: `${SITE_URL}/${locale}/world?slug=${vertical.slug}`,
                changeFrequency: 'daily',
                priority: 0.8,
                alternates: { languages: languageAlternates((l) => `/${l}/world?slug=${vertical.slug}`) },
            });
        }
    }

    return entries;
}
