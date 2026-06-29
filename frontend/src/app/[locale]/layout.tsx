import "../globals.css";
import localFont from 'next/font/local';
import RootHeader from "@/components/RootHeader";
import AccessibilityWidget from "@/components/AccessibilityWidget";
import { AuthProvider } from "@/context/AuthContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";

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

export const metadata = {
    title: "TIVUTA",
    description: "TIVUTA - diamonds, cars and insurance for our members.",
};

export function generateStaticParams() {
    return [
        { locale: 'he' },
        { locale: 'en' },
        { locale: 'fr' },
        { locale: 'yi' },
    ];
}

export default async function RootLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const isRTL = locale === 'he' || locale === 'yi';

    return (
        <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'} className="scroll-smooth notranslate" translate="no" suppressHydrationWarning>
            <head>
                <meta name="google" content="notranslate" />
                <link rel="icon" href="data:;base64,iVBORw0KGgo=" />
            </head>
            <body className={`${heebo.variable} font-sans antialiased bg-[#111a2f] min-h-screen flex flex-col`} suppressHydrationWarning>
                <AccessibilityProvider>
                    <AuthProvider>
                        <RootHeader />
                        <div className="flex-grow">
                            {children}
                        </div>
                    </AuthProvider>
                    <AccessibilityWidget />
                </AccessibilityProvider>
            </body>
        </html>
    );
}
