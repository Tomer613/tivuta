'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { Package, Users, BarChart3, Send, Tag, ExternalLink } from 'lucide-react';
import AdminGuard from '@/components/AdminGuard';

interface T {
    products: string;
    users: string;
    surveys: string;
    distribution: string;
    promotions: string;
}

const translations: Record<string, T> = {
    he: { products: 'מוצרים', users: 'משתמשים', surveys: 'סקרים', distribution: 'הפצה', promotions: 'מבצעים' },
    en: { products: 'Products', users: 'Users', surveys: 'Surveys', distribution: 'Distribution', promotions: 'Promotions' },
    fr: { products: 'Produits', users: 'Utilisateurs', surveys: 'Sondages', distribution: 'Diffusion', promotions: 'Promotions' },
    yi: { products: 'פראדוקטן', users: 'באניצער', surveys: 'סורווייס', distribution: 'פארשפרייטונג', promotions: 'מבצעים' },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const pathname = usePathname();
    const locale = (params?.locale as string) || 'he';
    const t = translations[locale] || translations.he;

    const tabs = [
        { href: `/${locale}/admin/products`, label: t.products, icon: <Package size={18} /> },
        { href: `/${locale}/admin/users`, label: t.users, icon: <Users size={18} /> },
        { href: `/${locale}/admin/surveys`, label: t.surveys, icon: <BarChart3 size={18} /> },
        { href: `/${locale}/admin/distribution`, label: t.distribution, icon: <Send size={18} /> },
        { href: `/${locale}/admin/promotions`, label: t.promotions, icon: <Tag size={18} /> },
    ];

    return (
        <AdminGuard>
            <div className="min-h-screen bg-[#111a2f]">
                <nav className="bg-[#0e1628] border-b border-[#d4af37]/20 px-6 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                                <span className="text-[#d4af37] font-black text-lg tracking-widest">TIVUTA</span>
                                <span className="text-[#d4af37]/25 text-sm">|</span>
                                <span className="text-[#f0e6d3]/35 text-[11px] uppercase tracking-widest font-bold">בק-אופיס</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {tabs.map((tab) => (
                                    <Link
                                        key={tab.href}
                                        href={tab.href}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                            pathname === tab.href
                                                ? 'bg-[#d4af37] text-[#080d1f]'
                                                : 'text-[#f0e6d3] hover:bg-[#111a2f]'
                                        }`}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <Link
                            href={`/${locale}`}
                            className="flex items-center gap-1.5 text-xs text-[#f0e6d3]/40 hover:text-[#d4af37] transition-colors font-semibold"
                        >
                            <ExternalLink size={13} />
                            חזרה לאתר
                        </Link>
                    </div>
                </nav>
                <div className="max-w-7xl mx-auto px-6 py-10">{children}</div>
            </div>
        </AdminGuard>
    );
}
