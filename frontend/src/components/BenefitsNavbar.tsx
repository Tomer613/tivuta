/**
 * Global Navigation Bar for the relocated /benefits site.
 * Fully localized with logical alignment (RTL/LTR).
 */

"use client";

import Link from 'next/link';
import { User, Search, Globe, LogOut, LayoutDashboard, Menu, X, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import NotificationBell from '@/components/NotificationBell';


const languages = [
    { code: 'he', label: 'עברית' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'yi', label: 'יידיש' }
];

interface NavbarUI {
    home: string;
    benefits: string;
    about: string;
    card: string;
    search: string;
    account: string;
    dashboard: string;
    logout: string;
    login: string;
    joinNow: string;
}

const navbarUI: Record<string, NavbarUI> = {
    he: { home: 'דף הבית', benefits: 'הטבות החודש', about: 'אודות', card: 'כרטיס האשראי', search: 'חפש הטבה...', account: 'הצטרפות', dashboard: 'אזור אישי', logout: 'יציאה', login: 'התחבר', joinNow: 'הצטרף עכשיו' },
    en: { home: 'Home', benefits: 'Monthly Benefits', about: 'About', card: 'Credit Card', search: 'Search...', account: 'Join', dashboard: 'Dashboard', logout: 'Logout', login: 'Login', joinNow: 'Join Now' },
    fr: { home: 'Accueil', benefits: 'Mensuels', about: 'À propos', card: 'Carte', search: 'Recherche...', account: 'Rejoindre', dashboard: 'Espace', logout: 'Quitter', login: 'Connexion', joinNow: 'Rejoindre maintenant' },
    yi: { home: 'היים', benefits: 'חודש בענעפיטן', about: 'איבער', card: 'קארטל', search: 'זוכן...', account: 'שליסן', dashboard: 'קאנטע', logout: 'יציאה', login: 'אריינלאגירן', joinNow: 'שליסן יעצט' }
};

export default function BenefitsNavbar() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const { user, logout } = useAuth();
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();

    const locale = params.locale as string || 'he';

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/benefits/${locale}/monthly?search=${encodeURIComponent(searchQuery)}`);
        }
    };

    const changeLanguage = (newLocale: string) => {
        // pathname looks like /benefits/{locale}/... — locale is segment index 2
        const segments = pathname.split('/');
        segments[2] = newLocale;
        const newPathname = segments.join('/');
        router.replace(newPathname);
        setShowLangMenu(false);
    };

    const handleLogout = () => {
        logout();
        router.push(`/benefits/${locale}`);
    };

    const ui = navbarUI[locale] || navbarUI.he;

    return (
        <div className="sticky top-0 z-[100] w-full relative">
            {/* UNDER CONSTRUCTION BANNER */}
            <div className="bg-[#d4af37] text-[#0e1628] text-center p-2.5 font-extrabold text-[15px] shadow-md relative z-50" style={{ direction: 'rtl' }}>
                🚧 האתר בהקמה - גרסת בטא להתרשמות בלבד 🚧
            </div>

            <nav className="glass-nav px-6 py-4 relative z-40">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                {/* Logo & Brand - Logical start */}
                <Link href={`/benefits/${locale}`} className="flex items-center gap-3 group">
                    <Logo light className="group-hover:scale-105" />
                </Link>

                {/* Desktop Menu - Centered or logical layout */}
                <div className="hidden md:flex items-center gap-8">
                    <Link href={`/benefits/${locale}/monthly`} className="font-bold text-[#f0e6d3] hover:text-[#d4af37] transition-colors">{ui.benefits}</Link>
                    <Link href={`/benefits/${locale}/card`} className="font-bold text-[#d4af37] hover:text-[#f5d061] transition-colors">{ui.card}</Link>
                    <Link href={`/benefits/${locale}/about`} className="font-bold text-[#f0e6d3] hover:text-[#d4af37] transition-colors">{ui.about}</Link>
                </div>

                {/* Actions - Logical end */}
                <div className="flex items-center gap-2 md:gap-4">
                    {/* Language Switcher - Hidden on very small screens, moved to menu if needed */}
                    <div className="relative hidden sm:block">
                        <button
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="w-10 h-10 flex items-center justify-center text-[#f0e6d3] hover:bg-[#0e1628]/10 rounded-full transition-all"
                        >
                            <Globe size={20} />
                        </button>
                        {showLangMenu && (
                            <div className="absolute top-12 start-0 bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl shadow-xl py-3 w-32 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
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

                    <form onSubmit={handleSearch} className="relative hidden lg:block group">
                        <input
                            type="text"
                            placeholder={ui.search}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-[#0e1628] border border-[#d4af37]/20 rounded-full ps-12 pe-6 py-2.5 text-sm focus:ring-2 focus:ring-[#d4af37] outline-none w-56 focus:w-80 transition-all duration-300 shadow-inner text-[#f0e6d3] text-start placeholder:text-[#f0e6d3]/50"
                        />
                        <Search size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-[#f0e6d3]/50 group-focus-within:text-[#d4af37] transition-colors" />
                    </form>

                    <div className="h-8 w-px bg-[#d4af37]/20 mx-2 md:block hidden"></div>

                    {user ? (
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="flex items-center relative">
                                <Link href={`/benefits/${locale}/dashboard`} className="btn-primary flex items-center gap-2 !py-2 !px-3 md:!px-4 text-xs md:text-sm whitespace-nowrap bg-[#080d1f] shadow-none hover:bg-slate-800">
                                    <LayoutDashboard size={18} />
                                    <span className="hidden sm:inline">{ui.dashboard}</span>
                                </Link>
                                <div className="absolute -top-3 -start-2 pointer-events-none z-10">
                                    <NotificationBell />
                                </div>
                            </div>

                            <button onClick={handleLogout} className="p-2 text-[#f0e6d3]/60 hover:text-red-500 transition-colors" title={ui.logout}>
                                <LogOut size={20} />
                            </button>
                        </div>

                    ) : (
                        <div className="flex items-center gap-1 md:gap-2">
                            <a href="/landing/" className="text-[#f0e6d3] font-bold text-sm px-2 md:px-4 hover:text-[#d4af37] hidden sm:block">
                                {ui.joinNow}
                            </a>
                            <Link href={`/benefits/${locale}/login`} className="btn-primary flex items-center gap-2 !py-2 !px-3 md:!px-4 text-xs md:text-sm whitespace-nowrap">
                                <User size={18} />
                                <span>{ui.login}</span>
                            </Link>
                        </div>


                    )}

                    {/* Mobile Search Toggle */}
                    <button
                        onClick={() => { setIsMobileSearchOpen(!isMobileSearchOpen); setIsMenuOpen(false); }}
                        className="lg:hidden w-10 h-10 flex items-center justify-center text-[#f0e6d3] hover:bg-[#0e1628]/10 rounded-full transition-all"
                    >
                        {isMobileSearchOpen ? <X size={20} /> : <Search size={20} />}
                    </button>

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => { setIsMenuOpen(!isMenuOpen); setIsMobileSearchOpen(false); }}
                        className="md:hidden w-10 h-10 flex items-center justify-center text-[#f0e6d3] hover:bg-[#0e1628]/10 rounded-full transition-all"
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

        </nav>

            {/* Mobile Search Overlay */}
            <div
                className={`absolute inset-x-0 top-full h-[100vh] bg-[#080d1f]/95 backdrop-blur-md z-30 lg:hidden shadow-2xl border-t border-[#d4af37]/20 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMobileSearchOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                style={{ clipPath: isMobileSearchOpen ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)' }}
            >
                <div className="p-8">
                    <form onSubmit={(e) => { handleSearch(e); setIsMobileSearchOpen(false); }} className="relative w-full max-w-md mx-auto">
                        <input
                            type="text"
                            placeholder={ui.search}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0e1628] border border-[#d4af37]/20 rounded-full ps-14 pe-16 py-4 text-lg focus:ring-2 focus:ring-[#d4af37] outline-none shadow-inner transition-all text-[#f0e6d3] placeholder:text-[#f0e6d3]/50 font-bold"
                        />
                        <Search size={24} className="absolute start-5 top-1/2 -translate-y-1/2 text-[#f0e6d3]/50" />
                        <button type="submit" className="absolute end-2 top-1/2 -translate-y-1/2 bg-[#d4af37] text-[#080d1f] p-3 rounded-full hover:bg-[#f5d061] transition-colors shadow-md">
                            <Search size={20} />
                        </button>
                    </form>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <div
                className={`absolute inset-x-0 top-full h-[100vh] bg-[#080d1f]/95 backdrop-blur-md z-40 md:hidden shadow-2xl border-t border-[#d4af37]/20 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                style={{ clipPath: isMenuOpen ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)' }}
            >
                <div className="flex flex-col p-8 gap-6 h-full overflow-y-auto">
                        <Link
                            href={`/benefits/${locale}/monthly`}
                            onClick={() => setIsMenuOpen(false)}
                            className="text-2xl font-black text-[#f0e6d3] border-b border-[#d4af37]/20 pb-4"
                        >
                            {ui.benefits}
                        </Link>
                        <Link
                            href={`/benefits/${locale}/card`}
                            onClick={() => setIsMenuOpen(false)}
                            className="text-2xl font-black text-[#d4af37] border-b border-[#d4af37]/20 pb-4"
                        >
                            {ui.card}
                        </Link>
                        <Link
                            href={`/benefits/${locale}/about`}
                            onClick={() => setIsMenuOpen(false)}
                            className="text-2xl font-black text-[#f0e6d3] border-b border-[#d4af37]/20 pb-4"
                        >
                            {ui.about}
                        </Link>

                        <div className="mt-8 flex flex-col gap-4 border-t border-[#d4af37]/20 pt-6">
                            <button
                                onClick={() => setShowLangMenu(!showLangMenu)}
                                className="flex items-center justify-between w-full text-[#f0e6d3] hover:text-[#d4af37] transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Globe size={24} className={showLangMenu ? "text-[#d4af37]" : ""} />
                                    <span className="text-xl font-black">שפה / Language</span>
                                </div>
                                <ChevronDown size={24} className={`transition-transform duration-300 ${showLangMenu ? 'rotate-180 text-[#d4af37]' : ''}`} />
                            </button>

                            {showLangMenu && (
                                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                    {languages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => changeLanguage(lang.code)}
                                            className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all ${locale === lang.code ? 'bg-[#d4af37] text-[#080d1f] border-[#d4af37]' : 'bg-[#0e1628] text-[#f0e6d3] border-[#d4af37]/20'}`}
                                        >
                                            {lang.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {!user && (
                            <a
                                href="/landing/"
                                onClick={() => setIsMenuOpen(false)}
                                className="mt-auto bg-[#1e3a8a] text-white py-4 rounded-2xl font-black text-center text-lg shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                            >
                                {ui.joinNow}
                            </a>
                        )}
                    </div>
                </div>
        </div>
    );
}
