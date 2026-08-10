import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const SITE_URL = 'https://www.tivuta.co.il';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/*/admin', '/*/vendor', '/*/profile'],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
