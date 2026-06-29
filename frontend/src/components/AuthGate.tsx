'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const locale = (params?.locale as string) || 'he';

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace(`/${locale}/login`);
        }
    }, [isLoading, user, locale, router]);

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-[#d4af37]" size={40} />
            </div>
        );
    }

    return <>{children}</>;
}
