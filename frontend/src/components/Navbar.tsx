/**
 * Global Navigation Bar.
 * Fully localized with logical alignment (RTL/LTR).
 */

"use client";

import Link from 'next/link';
import { User, Search, ShoppingBag, Globe, LogOut, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const languages = [
    { code: 'he', label: 'עברית' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'yi', label: 'יידיש' }
];

export default function Navbar() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showLangMenu, setShowLangMenu] = useState(false);
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

    const ui = {
        he: { home: 'דף הבית', benefits: 'כל ההטבות', about: 'אודות', search: 'חפש הטבה...', account: 'הצטרפות', dashboard: 'אזור אישי', logout: 'יציאה' },
        en: { home: 'Home', benefits: 'Benefits', about: 'About', search: 'Search...', account: 'Join', dashboard: 'Dashboard', logout: 'Logout' }
    }[locale as 'he' | 'en'] || ui.he;

    return (
        <nav className="glass-nav px-6 py-4 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                {/* Logo & Brand - Logical start */}
                <Link href={`/${locale}`} className="flex items-center gap-3 group">
                    <img src="/images/logo.svg" alt="TIVUTA Logo" className="h-10 w-auto group-hover:scale-105 transition-transform duration-300" />
                </Link>

                {/* Desktop Menu - Centered or logical layout */}
                <div className="hidden md:flex items-center gap-8">
                    <Link href={`/${locale}`} className="font-bold text-slate-600 hover:text-[#1e3a8a] transition-colors">{ui.home}</Link>
                    <Link href={`/${locale}/benefits`} className="font-bold text-slate-600 hover:text-[#1e3a8a] transition-colors">{ui.benefits}</Link>
                    <Link href={`/${locale}/about`} className="font-bold text-slate-600 hover:text-[#1e3a8a] transition-colors">{ui.about}</Link>
                </div>

                {/* Actions - Logical end */}
                <div className="flex items-center gap-4">
                    {/* Language Switcher */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                        >
                            <Globe size={20} />
                        </button>
                        {showLangMenu && (
                            <div className="absolute top-12 start-0 bg-white border border-slate-200 rounded-2xl shadow-xl py-3 w-32 overflow-hidden animate-in fade-in slide-in-from-top-2">
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

                    <form onSubmit={handleSearch} className="relative hidden md:block group">
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
                        <div className="flex items-center gap-3">
                            <Link href={`/${locale}/dashboard`} className="btn-primary flex items-center gap-2 !py-2 !px-4 text-sm whitespace-nowrap bg-slate-900 shadow-none hover:bg-slate-800">
                                <LayoutDashboard size={18} />
                                <span>{ui.dashboard}</span>
                            </Link>
                            <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title={ui.logout}>
                                <LogOut size={20} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link href={`/${locale}/login`} className="text-slate-600 font-bold text-sm px-4 hover:text-[#1e3a8a]">
                                {locale === 'he' ? 'התחבר' : 'Login'}
                            </Link>
                            <Link href={`/${locale}/join`} className="btn-primary flex items-center gap-2 !py-2 !px-4 text-sm whitespace-nowrap">
                                <User size={18} />
                                <span>{ui.account}</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
