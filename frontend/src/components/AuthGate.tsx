'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const SLOW_MESSAGE: Record<string, string> = {
    he: 'מתחברים לשרת... בכניסה הראשונה לאחר זמן מה זה יכול לקחת עד דקה',
    en: 'Connecting... this can take up to a minute on the first visit in a while',
    fr: 'Connexion en cours... cela peut prendre jusqu’à une minute lors de la première visite',
    yi: 'מיר שאפונירן... דאס קען נעמען ביז א מינוט',
};

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    const locale = (params?.locale as string) || 'he';
    const [showSlowMessage, setShowSlowMessage] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) {
            const redirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
            router.replace(`/${locale}/login${redirect}`);
        }
    }, [isLoading, user, locale, router, pathname]);

    useEffect(() => {
        if (!isLoading) {
            Promise.resolve().then(() => setShowSlowMessage(false));
            return;
        }
        const timer = setTimeout(() => setShowSlowMessage(true), 4000);
        return () => clearTimeout(timer);
    }, [isLoading]);

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
                <Loader2 className="animate-spin text-[#d4af37]" size={40} />
                {showSlowMessage && (
                    <p className="text-[#f0e6d3]/50 text-sm max-w-sm">{SLOW_MESSAGE[locale] || SLOW_MESSAGE.he}</p>
                )}
            </div>
        );
    }

    return <>{children}</>;
}
