import "../../globals.css";
import localFont from 'next/font/local';
import BenefitsFooter from "@/components/BenefitsFooter";
import BenefitsNavbar from "@/components/BenefitsNavbar";
import { getDictionary } from "@/lib/get-dictionary";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import AccessibilityWidget from "@/components/AccessibilityWidget";


const heebo = localFont({
    src: [
        { path: '../../../../public/fonts/Heebo-Thin.ttf', weight: '100', style: 'normal' },
        { path: '../../../../public/fonts/Heebo-Light.ttf', weight: '300', style: 'normal' },
        { path: '../../../../public/fonts/Heebo-Regular.ttf', weight: '400', style: 'normal' },
        { path: '../../../../public/fonts/Heebo-Medium.ttf', weight: '500', style: 'normal' },
        { path: '../../../../public/fonts/Heebo-Bold.ttf', weight: '700', style: 'normal' },
        { path: '../../../../public/fonts/Heebo-ExtraBold.ttf', weight: '800', style: 'normal' },
        { path: '../../../../public/fonts/Heebo-Black.ttf', weight: '900', style: 'normal' },
    ],
    variable: '--font-heebo',
});

export const metadata = {
    title: "TIVUTA | The Haredi Community Ecosystem",
    description: "Consumer benefits, financial solutions, and lifestyle for the working Haredi community.",
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
    const dict = await getDictionary(locale);

    return (
        <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'} className="scroll-smooth notranslate" translate="no" suppressHydrationWarning>
            <head>
                <meta name="google" content="notranslate" />
                <link rel="icon" href="data:;base64,iVBORw0KGgo=" />
            </head>
            <body className={`${heebo.variable} font-sans antialiased bg-[#111a2f] min-h-screen flex flex-col`} suppressHydrationWarning>
                <AccessibilityProvider>
                    <AuthProvider>
                        <NotificationProvider>
                            <BenefitsNavbar />
                            <div className="flex-grow">
                                {children}
                            </div>
                            <BenefitsFooter locale={locale} dict={dict} />
                        </NotificationProvider>
                    </AuthProvider>
                    <AccessibilityWidget />
                </AccessibilityProvider>

            </body>
        </html>
    );
}