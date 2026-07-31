'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { LayoutDashboard, ReceiptText, Wallet, LogOut, Store } from 'lucide-react';
import VendorGuard from '@/components/VendorGuard';
import { useVendorAuth } from '@/context/VendorAuthContext';

interface T {
    dashboard: string;
    report: string;
    settlements: string;
    logout: string;
}

const translations: Record<string, T> = {
    he: { dashboard: 'בקרה', report: 'דיווח עסקה', settlements: 'התחשבנות', logout: 'התנתקות' },
    en: { dashboard: 'Dashboard', report: 'Report Sale', settlements: 'Settlements', logout: 'Logout' },
    fr: { dashboard: 'Tableau', report: 'Signaler une vente', settlements: 'Règlements', logout: 'Déconnexion' },
    yi: { dashboard: 'בקרה', report: 'רעפארטירן פארקויף', settlements: 'אפרעכענונג', logout: 'ארויסלאגן' },
};

function VendorPortalNav({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const pathname = usePathname();
    const locale = (params?.locale as string) || 'he';
    const t = translations[locale] || translations.he;
    const { vendor, logout } = useVendorAuth();

    const tabs = [
        { href: `/${locale}/vendor/dashboard`, label: t.dashboard, icon: <LayoutDashboard size={18} /> },
        { href: `/${locale}/vendor/report`, label: t.report, icon: <ReceiptText size={18} /> },
        { href: `/${locale}/vendor/settlements`, label: t.settlements, icon: <Wallet size={18} /> },
    ];

    const logoutButton = (extraClass: string) => (
        <button
            onClick={logout}
            className={`${extraClass} items-center gap-1.5 text-xs text-[#f0e6d3]/40 hover:text-red-400 transition-colors font-semibold shrink-0`}
        >
            <LogOut size={13} />
            {t.logout}
        </button>
    );

    return (
        <div className="min-h-screen bg-[#111a2f]">
            <nav className="bg-[#0e1628] border-b border-[#d4af37]/20 px-6 py-4">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                            <Store size={18} className="text-[#d4af37]" />
                            <span className="text-[#f0e6d3] font-black text-sm">{vendor?.name_he}</span>
                        </div>
                        {logoutButton('flex md:hidden')}
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto flex-nowrap no-scrollbar -mx-6 px-6 md:mx-0 md:px-0 md:flex-wrap">
                        {tabs.map((tab) => {
                            const norm = (p: string) => p.replace(/\/$/, '');
                            const isActive = norm(pathname) === norm(tab.href) || norm(pathname).startsWith(norm(tab.href) + '/');
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all shrink-0 whitespace-nowrap ${
                                        isActive ? 'bg-[#d4af37] text-[#080d1f]' : 'text-[#f0e6d3]/70 hover:text-[#f0e6d3] hover:bg-[#111a2f]'
                                    }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </div>
                    {logoutButton('hidden md:flex')}
                </div>
            </nav>
            <div className="max-w-5xl mx-auto px-6 py-10">{children}</div>
        </div>
    );
}

export default function VendorPortalLayout({ children }: { children: React.ReactNode }) {
    return (
        <VendorGuard>
            <VendorPortalNav>{children}</VendorPortalNav>
        </VendorGuard>
    );
}
