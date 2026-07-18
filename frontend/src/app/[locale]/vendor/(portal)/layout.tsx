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

    return (
        <div className="min-h-screen bg-[#111a2f]">
            <nav className="bg-[#0e1628] border-b border-[#d4af37]/20 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Store size={18} className="text-[#d4af37]" />
                            <span className="text-[#f0e6d3] font-black text-sm">{vendor?.name_he}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {tabs.map((tab) => {
                                const norm = (p: string) => p.replace(/\/$/, '');
                                const isActive = norm(pathname) === norm(tab.href) || norm(pathname).startsWith(norm(tab.href) + '/');
                                return (
                                    <Link
                                        key={tab.href}
                                        href={tab.href}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                            isActive ? 'bg-[#d4af37] text-[#080d1f]' : 'text-[#f0e6d3]/70 hover:text-[#f0e6d3] hover:bg-[#111a2f]'
                                        }`}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-1.5 text-xs text-[#f0e6d3]/40 hover:text-red-400 transition-colors font-semibold"
                    >
                        <LogOut size={13} />
                        {t.logout}
                    </button>
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
