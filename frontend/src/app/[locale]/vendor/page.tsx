'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useVendorAuth } from '@/context/VendorAuthContext';

export default function VendorIndexPage() {
    const { vendor, isLoading } = useVendorAuth();
    const router = useRouter();
    const params = useParams();
    const locale = (params?.locale as string) || 'he';

    useEffect(() => {
        if (isLoading) return;
        router.replace(vendor ? `/${locale}/vendor/dashboard` : `/${locale}/vendor/login`);
    }, [isLoading, vendor, locale, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#111a2f]">
            <Loader2 className="animate-spin text-[#d4af37]" size={40} />
        </div>
    );
}
