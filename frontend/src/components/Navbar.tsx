/**
 * Global Navigation Bar.
 * Fully localized with logical alignment (RTL/LTR).
 */

"use client";

import Link from 'next/link';
import { User, Search, Globe, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

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
}

const navbarUI: Record<string, NavbarUI> = {
    he: { home: 'דף הבית', benefits: 'כל ההטבות', about: 'אודות', card: 'כרטיס האשראי', search: 'חפש הטבה...', account: 'הצטרפות', dashboard: 'אזור אישי', logout: 'יציאה' },
    en: { home: 'Home', benefits: 'Benefits', about: 'About', card: 'Credit Card', search: 'Search...', account: 'Join', dashboard: 'Dashboard', logout: 'Logout' },
    fr: { home: 'Accueil', benefits: 'Avantages', about: 'À propos', card: 'Carte', search: 'Recherche...', account: 'Rejoindre', dashboard: 'Espace', logout: 'Quitter' },
    yi: { home: 'היים', benefits: 'בענעפיטן', about: 'איבער', card: 'קארטל', search: 'זוכן...', account: 'שליסן', dashboard: 'קאנטע', logout: 'יציאה' }
};

export default function Navbar() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user, logout } = useAuth();
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    
    const locale = params.locale as string || 'he';

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/${locale}/benefits?search=${encodeURIComponent(searchQuery)}`);
        }
    };

    const changeLanguage = (newLocale: string) => {
        const segments = pathname.split('/');
        segments[1] = newLocale;
        const newPathname = segments.join('/');
        router.replace(newPathname);
        setShowLangMenu(false);
    };

    const ui = navbarUI[locale] || navbarUI.he;

    return (
        <nav className="glass-nav px-6 py-4 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                {/* Logo & Brand - Logical start */}
                <Link href={`/${locale}`} className="flex items-center gap-3 group">
                    <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/branding/logo.svg`} alt="TIVUTA Logo" className="h-10 w-auto group-hover:scale-105 transition-transform duration-300" />
                </Link>

                {/* Desktop Menu - Centered or logical layout */}
                <div className="hidden md:flex items-center gap-8">
                    <Link href={`/${locale}`} className="font-bold text-slate-600 hover:text-[#1e3a8a] transition-colors">{ui.home}</Link>
                    <Link href={`/${locale}/benefits`} className="font-bold text-slate-600 hover:text-[#1e3a8a] transition-colors">{ui.benefits}</Link>
                    <Link href={`/${locale}/card`} className="font-bold text-amber-600 hover:text-amber-700 transition-colors">{ui.card}</Link>
                    <Link href={`/${locale}/about`} className="font-bold text-slate-600 hover:text-[#1e3a8a] transition-colors">{ui.about}</Link>
                </div>

                {/* Actions - Logical end */}
                <div className="flex items-center gap-2 md:gap-4">
                    {/* Language Switcher - Hidden on very small screens, moved to menu if needed */}
                    <div className="relative hidden sm:block">
                        <button 
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                        >
                            <Globe size={20} />
                        </button>
                        {showLangMenu && (
                            <div className="absolute top-12 start-0 bg-white border border-slate-200 rounded-2xl shadow-xl py-3 w-32 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => changeLanguage(lang.code)}
                                        className={`w-full text-start px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${locale === lang.code ? 'font-black text-[#1e3a8a]' : 'text-slate-600'}`}
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
                            className="bg-slate-100 border-none rounded-full ps-12 pe-6 py-2.5 text-sm focus:ring-2 focus:ring-[#1e3a8a] outline-none w-56 focus:w-80 transition-all duration-300 shadow-inner text-start"
                        />
                        <Search size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1e3a8a] transition-colors" />
                    </form>
                    
                    <div className="h-8 w-px bg-slate-200 mx-2 md:block hidden"></div>
                    
                    {user ? (
                        <div className="flex items-center gap-2 md:gap-3">
                            <Link href={`/${locale}/dashboard`} className="btn-primary flex items-center gap-2 !py-2 !px-3 md:!px-4 text-xs md:text-sm whitespace-nowrap bg-slate-900 shadow-none hover:bg-slate-800">
                                <LayoutDashboard size={18} />
                                <span className="hidden sm:inline">{ui.dashboard}</span>
                            </Link>
                            <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title={ui.logout}>
                                <LogOut size={20} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link href={`/${locale}/login`} className="text-slate-600 font-bold text-sm px-2 md:px-4 hover:text-[#1e3a8a] hidden sm:block">
                                {locale === 'he' ? 'התחבר' : 'Login'}
                            </Link>
                            <Link href={`/${locale}/join`} className="btn-primary flex items-center gap-2 !py-2 !px-3 md:!px-4 text-xs md:text-sm whitespace-nowrap">
                                <User size={18} />
                                <span>{ui.account}</span>
                            </Link>
                        </div>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className="fixed inset-0 top-[73px] bg-white z-40 md:hidden animate-in fade-in slide-in-from-top-5">
                    <div className="flex flex-col p-8 gap-6 h-full overflow-y-auto">
                        <Link 
                            href={`/${locale}`} 
                            onClick={() => setIsMenuOpen(false)}
                            className="text-2xl font-black text-slate-900 border-b border-slate-100 pb-4"
                        >
                            {ui.home}
                        </Link>
                        <Link 
                            href={`/${locale}/benefits`} 
                            onClick={() => setIsMenuOpen(false)}
                            className="text-2xl font-black text-slate-900 border-b border-slate-100 pb-4"
                        >
                            {ui.benefits}
                        </Link>
                        <Link 
                            href={`/${locale}/card`} 
                            onClick={() => setIsMenuOpen(false)}
                            className="text-2xl font-black text-amber-600 border-b border-slate-100 pb-4"
                        >
                            {ui.card}
                        </Link>
                        <Link 
                            href={`/${locale}/about`} 
                            onClick={() => setIsMenuOpen(false)}
                            className="text-2xl font-black text-slate-900 border-b border-slate-100 pb-4"
                        >
                            {ui.about}
                        </Link>

                        <div className="mt-8 flex flex-col gap-4">
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">שפה / Language</p>
                            <div className="grid grid-cols-2 gap-3">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => changeLanguage(lang.code)}
                                        className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all ${locale === lang.code ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {!user && (
                            <Link 
                                href={`/${locale}/login`}
                                onClick={() => setIsMenuOpen(false)}
                                className="mt-auto bg-slate-100 text-slate-900 py-4 rounded-2xl font-bold text-center"
                            >
                                {locale === 'he' ? 'התחבר למערכת' : 'Login to System'}
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
