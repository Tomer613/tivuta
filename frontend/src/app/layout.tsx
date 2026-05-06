import "./globals.css";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata = {
    title: "TIVUTA | המעטפת לקהילה החרדית העובדת",
    description: "Consumer benefits, financial solutions, and lifestyle for the working Haredi community.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="he" dir="rtl" className="scroll-smooth notranslate" translate="no" suppressHydrationWarning>
            <head>
                <meta name="google" content="notranslate" />
                <link rel="icon" href="data:;base64,iVBORw0KGgo=" />
            </head>
            <body className="antialiased bg-slate-50 min-h-screen flex flex-col" suppressHydrationWarning>
                <Navbar />
                <div className="flex-grow">
                    {children}
                </div>
                <Footer />
            </body>
        </html>
    );
}