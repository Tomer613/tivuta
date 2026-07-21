'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function CartIcon({ locale }: { locale: string }) {
    const { totalCount } = useCart();

    return (
        <Link
            href={`/${locale}/cart`}
            className="relative w-9 h-9 rounded-full bg-[#111a2f] border border-[#d4af37]/20 flex items-center justify-center hover:border-[#d4af37]/50 transition-colors"
            aria-label="עגלה"
        >
            <ShoppingCart size={17} className="text-[#f0e6d3]/70" />
            {totalCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[#d4af37] text-[#080d1f] text-[9px] font-black rounded-full flex items-center justify-center">
                    {totalCount > 99 ? '99+' : totalCount}
                </span>
            )}
        </Link>
    );
}
