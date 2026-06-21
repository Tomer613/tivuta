/**
 * BackButton Component
 * Returns the user to the previous page.
 * Implements specific requirement: physical right-side placement and "arrow from right" for LTR.
 */

"use client";

import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface BackButtonProps {
    locale: string;
    className?: string;
}

interface BackTranslation {
    back: string;
}

const translations: Record<string, BackTranslation> = {
    he: { back: 'חזרה' },
    en: { back: 'Back' },
    fr: { back: 'Retour' },
    yi: { back: 'צוריק' }
};

export default function BackButton({ locale, className = "" }: BackButtonProps) {
    const router = useRouter();
    const isRTL = locale === 'he' || locale === 'yi';

    const t = translations[locale] || translations.he;

    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

    const handleBack = () => {
        // Logical navigation that preserves the current locale
        if (pathname.includes('/items/')) {
            router.push(`/${locale}/benefits`);
        } else if (pathname.includes('/categories/') || pathname.includes('/benefits')) {
            router.push(`/${locale}`);
        } else {
            // Fallback for other pages
            router.back();
        }
    };

    return (
        <button 
            onClick={handleBack}
            className={`group flex items-center justify-center w-14 h-14 bg-[#0e1628]/90 backdrop-blur-md border border-[#d4af37]/20 rounded-full text-[#1e3a8a] shadow-xl hover:bg-[#0e1628] hover:scale-110 transition-all active:scale-90 z-30 ${className}`}
            id="global-back-button"
            aria-label={t.back}
        >
            {isRTL ? (
                <ArrowRight size={28} className="group-hover:translate-x-1 transition-transform" />
            ) : (
                <ArrowLeft size={28} className="group-hover:-translate-x-1 transition-transform" />
            )}
        </button>
    );
}
