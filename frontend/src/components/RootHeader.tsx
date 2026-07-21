'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Globe, UserCircle2, LayoutDashboard } from 'lucide-react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import Logo from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from '@/components/NotificationBell';
import GlobalSearch from '@/components/GlobalSearch';
import CartIcon from '@/components/CartIcon';

const languages = [
    { code: 'he', label: 'עברית' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'yi', label: 'יידיש' },
];

export default function RootHeader() {
    const [showLangMenu, setShowLangMenu] = useState(false);
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    const locale = (params?.locale as string) || 'he';
    const { user, token } = useAuth();

    const changeLanguage = (newLocale: string) => {
        // pathname looks like /{locale}/... — locale is segment index 1
        const segments = pathname.split('/');
        segments[1] = newLocale;
        router.replace(segments.join('/'));
        setShowLangMenu(false);
    };

    return (
        <header className="glass-nav px-6 py-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <Link href={`/${locale}`} className="flex items-center gap-3 group">
                    <Logo light className="group-hover:scale-105" />
                </Link>

                <div className="flex items-center gap-2">
                    {user && <GlobalSearch locale={locale} />}
                    {token && <NotificationBell token={token} />}
                    <CartIcon locale={locale} />
                    {user?.role === 'admin' && (
                        <Link
                            href={`/${locale}/admin/products`}
                            className="w-10 h-10 flex items-center justify-center text-[#f0e6d3]/70 hover:text-[#d4af37] rounded-full transition-all duration-300 hover:scale-110 hover:shadow-[0_0_16px_rgba(212,175,55,0.4)] hover:bg-[#d4af37]/10"
                            aria-label="בק-אופיס"
                        >
                            <LayoutDashboard size={22} />
                        </Link>
                    )}
                    {user && (
                        <Link
                            href={`/${locale}/profile`}
                            className="w-10 h-10 flex items-center justify-center text-[#f0e6d3]/70 hover:text-[#d4af37] rounded-full transition-all duration-300 hover:scale-110 hover:shadow-[0_0_16px_rgba(212,175,55,0.4)] hover:bg-[#d4af37]/10"
                            aria-label="אזור אישי"
                        >
                            <UserCircle2 size={26} />
                        </Link>
                    )}
                    <div className="relative">
                        <button
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            aria-label="Language"
                            className="w-10 h-10 flex items-center justify-center text-[#f0e6d3] rounded-full transition-all duration-300 hover:text-[#d4af37] hover:bg-[#d4af37]/10 hover:scale-110 hover:rotate-12"
                        >
                            <Globe size={22} />
                        </button>
                        {showLangMenu && (
                            <div className="absolute top-12 end-0 bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl shadow-xl py-3 w-32 overflow-hidden z-50">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => changeLanguage(lang.code)}
                                        className={`w-full text-start px-4 py-2 text-sm hover:bg-[#111a2f] transition-colors ${locale === lang.code ? 'font-black text-[#d4af37]' : 'text-[#f0e6d3]'}`}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
