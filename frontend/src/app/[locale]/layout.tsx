import "../globals.css";
import type { Metadata } from 'next';
import { Suspense } from 'react';
import localFont from 'next/font/local';
import RootHeader from "@/components/RootHeader";
import SiteFooter from "@/components/SiteFooter";
import AccessibilityWidget from "@/components/AccessibilityWidget";
import SentryInit from "@/components/SentryInit";
import PageviewTracker from "@/components/PageviewTracker";
import { AuthProvider } from "@/context/AuthContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { CartProvider } from "@/context/CartContext";
import { normalizeLocale, type Locale, generateStaticParams } from "@/lib/locales";

const heebo = localFont({
    src: [
        { path: '../../../public/fonts/Heebo-Thin.ttf', weight: '100', style: 'normal' },
        { path: '../../../public/fonts/Heebo-Light.ttf', weight: '300', style: 'normal' },
        { path: '../../../public/fonts/Heebo-Regular.ttf', weight: '400', style: 'normal' },
        { path: '../../../public/fonts/Heebo-Medium.ttf', weight: '500', style: 'normal' },
        { path: '../../../public/fonts/Heebo-Bold.ttf', weight: '700', style: 'normal' },
        { path: '../../../public/fonts/Heebo-ExtraBold.ttf', weight: '800', style: 'normal' },
        { path: '../../../public/fonts/Heebo-Black.ttf', weight: '900', style: 'normal' },
    ],
    variable: '--font-heebo',
});

const SITE_URL = 'https://www.tivuta.co.il';

const LOCALE_META: Record<Locale, { title: string; description: string; ogLocale: string }> = {
    he: {
        title: 'טיוטה — יהלומים, רכבים, ביטוח ועוד עולמות קנייה לחברי הקהילה',
        description: 'טיוטה הוא מרקטפלייס רב-עולמות לחברי הקהילה החרדית: יהלומים, רכבים, ביטוח ועוד, עם הטבות בלעדיות ומועדון נאמנות.',
        ogLocale: 'he_IL',
    },
    en: {
        title: 'Tivuta — Diamonds, Cars, Insurance & More for Our Community',
        description: 'Tivuta is a curated multi-vertical marketplace for the community: diamonds, cars, insurance and more, with exclusive member benefits and a loyalty program.',
        ogLocale: 'en_US',
    },
    fr: {
        title: 'Tivuta — Diamants, Voitures, Assurance et Plus pour Notre Communauté',
        description: 'Tivuta est une marketplace multi-univers pour la communauté : diamants, voitures, assurance et plus, avec des avantages exclusifs et un programme de fidélité.',
        ogLocale: 'fr_FR',
    },
    yi: {
        title: 'טיוטה — דימענטן, אויטאס, אינשורענס און מער פאר אונדזער קהילה',
        description: 'טיוטה איז א מולטי-וועלט מארקעטפלעיס פאר דער קהילה: דימענטן, אויטאס, אינשורענס און מער, מיט עקסקלוסיווע מיטגלידער בענעפיטן.',
        ogLocale: 'yi',
    },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale: rawLocale } = await params;
    const locale = normalizeLocale(rawLocale);
    const meta = LOCALE_META[locale];

    // Only set once the www.tivuta.co.il property is verified in Google Search Console
    // (DNS TXT verification is recommended over this meta tag — see CLAUDE.md's SEO plan
    // notes) and NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION is set in the build environment.
    // Left unset otherwise so production HTML never ships a dead placeholder value.
    const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

    return {
        metadataBase: new URL(SITE_URL),
        title: { template: '%s | Tivuta', default: meta.title },
        description: meta.description,
        openGraph: {
            title: meta.title,
            description: meta.description,
            siteName: 'Tivuta',
            locale: meta.ogLocale,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: meta.title,
            description: meta.description,
        },
        ...(googleVerification ? { verification: { google: googleVerification } } : {}),
    };
}

export { generateStaticParams };

export default async function RootLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const isRTL = locale === 'he' || locale === 'yi';

    const organizationJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Tivuta',
        url: SITE_URL,
        logo: `${SITE_URL}/branding/logo.svg`,
        contactPoint: {
            '@type': 'ContactPoint',
            email: 'support@tivuta.co.il',
            contactType: 'customer service',
        },
    };

    return (
        <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'} className="scroll-smooth notranslate" translate="no" suppressHydrationWarning>
            <head>
                <meta name="google" content="notranslate" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
                />
            </head>
            <body className={`${heebo.variable} font-sans antialiased bg-[#111a2f] min-h-screen flex flex-col`} suppressHydrationWarning>
                <AccessibilityProvider>
                    <AuthProvider>
                        <CartProvider>
                            <RootHeader />
                            <div className="flex-grow">
                                {children}
                            </div>
                            <SiteFooter />
                        </CartProvider>
                    </AuthProvider>
                    <AccessibilityWidget />
                </AccessibilityProvider>
                <SentryInit />
                <Suspense fallback={null}>
                    <PageviewTracker />
                </Suspense>
            </body>
        </html>
    );
}
