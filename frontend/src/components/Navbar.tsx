/**
 * Global Navigation Bar.
 * Fully localized with logical alignment (RTL/LTR).
 */

"use client";

import Link from 'next/link';
import { User, Search, ShoppingBag, Globe } from 'lucide-react';
import { useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';

const languages = [
    { code: 'he', label: 'עברית' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'yi', label: 'יידיש' }
];

export default function Navbar() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showLangMenu, setShowLangMenu] = useState(false);
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
        he: { home: 'דף הבית', benefits: 'כל ההטבות', about: 'אודות', search: 'חפש הטבה...', account: 'אזור אישי' },
        en: { home: 'Home', benefits: 'Benefits', about: 'About', search: 'Search...', account: 'Account' },
        fr: { home: 'Accueil', benefits: 'Avantages', about: 'À propos', search: 'Chercher...', account: 'Compte' },
        yi: { home: 'היים', benefits: 'בענעפיטן', about: 'איבער אונז', search: 'זוכן...', account: 'מיין קאנטע' }
    }[locale as keyof typeof ui] || ui.he;

    return (
        <nav className="glass-nav px-6 py-4 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                {/* Logo & Brand - Logical start */}
                <Link href={`/${locale}`} className="flex items-center gap-3 group">
                    <div className="bg-[#1e3a8a] text-white p-2 rounded-xl group-hover:rotate-6 transition-transform">
                        <ShoppingBag size={24} />
                    </div>
                    <span className="text-2xl font-black text-[#1e3a8a] tracking-tighter italic">TIVUTA</span>
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
                    
                    <Link href={`/${locale}/join`} className="btn-primary flex items-center gap-2 !py-2 !px-4 text-sm whitespace-nowrap">
                        <User size={18} />
                        <span>{ui.account}</span>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
