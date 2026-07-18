'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useVendorAuth } from '@/context/VendorAuthContext';
import { Loader2 } from 'lucide-react';

export default function VendorGuard({ children }: { children: React.ReactNode }) {
    const { vendor, isLoading } = useVendorAuth();
    const router = useRouter();
    const params = useParams();
    const locale = (params?.locale as string) || 'he';

    useEffect(() => {
        if (!isLoading && !vendor) {
            router.replace(`/${locale}/vendor/login`);
        }
    }, [isLoading, vendor, locale, router]);

    if (isLoading || !vendor) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#111a2f]">
                <Loader2 className="animate-spin text-[#d4af37]" size={40} />
            </div>
        );
    }

    return <>{children}</>;
}
