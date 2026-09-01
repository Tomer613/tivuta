import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import OrderConfirmClient from '@/components/OrderConfirmClient';
import { normalizeLocale, generateStaticParams } from '@/lib/locales';

export { generateStaticParams };

const TITLE: Record<string, string> = {
    he: 'אישור הזמנה',
    en: 'Order Confirmation',
    fr: 'Confirmation de commande',
    yi: 'באשטעטיקן בעשטעלונג',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale: rawLocale } = await params;
    const locale = normalizeLocale(rawLocale);
    return {
        title: TITLE[locale],
        robots: { index: false, follow: false }, // token-gated, single-use — never worth indexing
    };
}

function OrderConfirmFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#111a2f]">
            <Loader2 className="animate-spin text-[#d4af37]" size={40} />
        </div>
    );
}

export default function OrderConfirmPage() {
    return (
        <Suspense fallback={<OrderConfirmFallback />}>
            <OrderConfirmClient />
        </Suspense>
    );
}
