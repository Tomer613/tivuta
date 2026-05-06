/**
 * Global Navigation Bar.
 * Upgraded to be functional with search and navigation links.
 */

"use client";

import Link from 'next/link';
import { User, Search, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/benefits?search=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <nav className="glass-nav px-6 py-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                {/* Logo & Brand */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="bg-[#1e3a8a] text-white p-2 rounded-xl group-hover:rotate-6 transition-transform">
                        <ShoppingBag size={24} />
                    </div>
                    <span className="text-2xl font-black text-[#1e3a8a] tracking-tighter italic">TIVUTA</span>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-8">
                    <Link href="/" className="font-bold text-slate-600 hover:text-[#1e3a8a] transition-colors">דף הבית</Link>
                    <Link href="/benefits" className="font-bold text-slate-600 hover:text-[#1e3a8a] transition-colors">כל ההטבות</Link>
                    <Link href="/about" className="font-bold text-slate-600 hover:text-[#1e3a8a] transition-colors">אודות</Link>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <form onSubmit={handleSearch} className="relative hidden md:block">
                        <input 
                            type="text" 
                            placeholder="חפש הטבה..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-100 border-none rounded-full px-10 py-2 text-sm focus:ring-2 focus:ring-[#1e3a8a] outline-none w-48 focus:w-64 transition-all"
                        />
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </form>
                    <div className="h-8 w-px bg-slate-200 mx-2 md:block hidden"></div>
                    <Link href="/join" className="btn-primary flex items-center gap-2 !py-2 !px-4 text-sm">
                        <User size={18} />
                        <span>אזור אישי</span>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
