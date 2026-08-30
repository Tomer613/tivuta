'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Globe, UserCircle2, LayoutDashboard, Menu } from 'lucide-react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import Logo from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from '@/components/NotificationBell';
import GlobalSearch, { GlobalSearchHandle } from '@/components/GlobalSearch';
import CartIcon from '@/components/CartIcon';
import { useOutsideClick } from '@/lib/useOutsideClick';
import { swapLocaleInPath, markManualLocaleOverride } from '@/lib/localePreference';

const languages = [
    { code: 'he', label: 'עברית' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'yi', label: 'יידיש' },
];

export default function RootHeader() {
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [searchActive, setSearchActive] = useState(false);
    const headerMenuRef = useRef<HTMLDivElement>(null);
    const langMenuRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<GlobalSearchHandle>(null);
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    const locale = (params?.locale as string) || 'he';
    const { user, token } = useAuth();

    useEffect(() => {
        Promise.resolve().then(() => setShowMobileMenu(false));
    }, [pathname]);

    useEffect(() => {
        // GlobalSearch is only rendered while `user` is set; if it unmounts mid-search (e.g. on
        // logout) it never gets a chance to call onOpenChange(false), which would otherwise leave
        // searchActive stuck true and permanently hide Cart/Notifications (not auth-gated) on mobile.
        if (!user) Promise.resolve().then(() => setSearchActive(false));
    }, [user]);

    // Skip the header-menu outside-click check while search is active: GlobalSearch's
    // results/backdrop render via a portal to document.body, so they're never "inside"
    // headerMenuRef — without this guard, tapping anywhere in the results list (that isn't a
    // navigating link) would force-close this wrapper and hide the still-open search pill living
    // inside it. Escape isn't gated the same way (`enabled` only affects outside-click, per the
    // hook's own contract) — it should still dismiss everything even mid-search, which is exactly
    // why it also closes the search overlay via its imperative handle here.
    useOutsideClick(headerMenuRef, () => setShowMobileMenu(false), {
        enabled: !searchActive,
        onEscape: () => { setShowMobileMenu(false); searchRef.current?.close(); },
    });
    useOutsideClick(langMenuRef, () => setShowLangMenu(false));

    const changeLanguage = (newLocale: string) => {
        // A manual pick is remembered for the rest of this tab's session, so the preferred-language
        // auto-redirect (AuthContext) doesn't immediately override this deliberate choice.
        markManualLocaleOverride();
        router.replace(swapLocaleInPath(pathname, newLocale));
        setShowLangMenu(false);
    };

    return (
        <header className="glass-nav px-6 py-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <Link href={`/${locale}`} className="flex items-center gap-3 group">
                    <Logo light className="group-hover:scale-105" />
                </Link>

                <div ref={headerMenuRef} className="relative flex items-center gap-2">
                    {/* Activity cluster — search, notifications, cart. Never behind the mobile hamburger:
                        these carry live counts/badges, so tucking them into a dropdown would defeat their
                        at-a-glance purpose. Cart/Bell do still hide on mobile only, and only while the
                        search pill is actively expanded (searchActive), to give the expanding pill room —
                        Search itself is unaffected and stays visible/expanded throughout. */}
                    {user && <GlobalSearch ref={searchRef} locale={locale} onOpenChange={setSearchActive} />}
                    <div className={searchActive ? 'hidden md:contents' : 'contents'}>
                        <CartIcon locale={locale} />
                        {token && <NotificationBell token={token} />}
                    </div>

                    {/* Account/settings cluster — dashboard, profile, language. Collapses into the
                        hamburger dropdown on mobile; always inline on desktop (md:flex neutralizes the
                        dropdown styling below). */}
                    <div
                        className={`${showMobileMenu ? 'flex absolute top-full inset-x-0 mt-2 flex-col items-start gap-3 bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-4 shadow-xl z-40' : 'hidden'} md:flex md:static md:mt-0 md:flex-row md:items-center md:gap-2 md:bg-transparent md:border-0 md:p-0 md:shadow-none`}
                    >
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
                        <div ref={langMenuRef} className="relative">
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
                    <button
                        onClick={() => setShowMobileMenu((v) => !v)}
                        aria-label="תפריט"
                        className="md:hidden w-10 h-10 flex items-center justify-center text-[#f0e6d3]/70 hover:text-[#d4af37] rounded-full transition-all duration-300 hover:bg-[#d4af37]/10"
                    >
                        <Menu size={22} />
                    </button>
                </div>
            </div>
        </header>
    );
}
