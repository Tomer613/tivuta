/**
 * Global Navigation Bar.
 * Features a modern glassmorphism effect and professional Haredi-tailored branding.
 */

import Link from 'next/link';
import { User, Search, ShoppingBag } from 'lucide-react';

export default function Navbar() {
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
                    <button className="font-bold text-slate-600 hover:text-[#1e3a8a] transition-colors">כל ההטבות</button>
                    <button className="font-bold text-slate-600 hover:text-[#1e3a8a] transition-colors">אודות</button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <button className="p-2 text-slate-400 hover:text-[#1e3a8a] transition-colors md:block hidden">
                        <Search size={20} />
                    </button>
                    <div className="h-8 w-px bg-slate-200 mx-2 md:block hidden"></div>
                    <button className="btn-primary flex items-center gap-2 !py-2 !px-4 text-sm">
                        <User size={18} />
                        <span>אזור אישי</span>
                    </button>
                </div>
            </div>
        </nav>
    );
}
