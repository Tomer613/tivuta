import "../globals.css";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { getDictionary } from "@/lib/get-dictionary";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
    title: "TIVUTA | The Haredi Community Ecosystem",
    description: "Consumer benefits, financial solutions, and lifestyle for the working Haredi community.",
};

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
            <body className="antialiased bg-slate-50 min-h-screen flex flex-col" suppressHydrationWarning>
                <AuthProvider>
                    <Navbar />
                    <div className="flex-grow">
                        {children}
                    </div>
                    <Footer locale={locale} dict={dict} />
                </AuthProvider>
            </body>
        </html>
    );
}