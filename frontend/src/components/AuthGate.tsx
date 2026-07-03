'use client';

import { useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    const locale = (params?.locale as string) || 'he';

    useEffect(() => {
        if (!isLoading && !user) {
            const redirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
            router.replace(`/${locale}/login${redirect}`);
        }
    }, [isLoading, user, locale, router, pathname]);

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-[#d4af37]" size={40} />
            </div>
        );
    }

    return <>{children}</>;
}
