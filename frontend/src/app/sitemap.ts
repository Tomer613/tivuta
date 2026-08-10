import type { MetadataRoute } from 'next';
import { LOCALES } from '@/lib/locales';

export const dynamic = 'force-static';

const SITE_URL = 'https://www.tivuta.co.il';

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

    // /world and /products are intentionally NOT listed here: both routes are wrapped in
    // AuthGate (see AuthGate.tsx), so an anonymous crawler with no stored token is served
    // only a loading spinner that client-redirects to /login — there is no actual content
    // behind those URLs to index. Listing them would just waste crawl budget on empty
    // shells. If browsing ever becomes public without login, add them back here.

    return entries;
}
