/**
 * Professional Footer for Tivuta.
 * Focus: Reliability, accessibility, and local asset usage.
 */

import { Phone, Mail, MapPin, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-slate-900 text-slate-300 py-16 px-8 border-t border-slate-800">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">

                {/* Column 1: Branding */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-2xl font-black text-white italic">TIVUTA</h2>
                    <p className="text-sm leading-relaxed opacity-70">
                        המעטפת המקצועית המובילה לקהילה החרדית העובדת.
                        חדשנות, הוגנות וערך מוסף בכל תחומי החיים.
                    </p>
                    <div className="flex items-center gap-2 text-[#d97706] font-bold text-xs uppercase tracking-widest">
                        <ShieldCheck size={16} />
                        Safe & Secure Portal
                    </div>
                </div>

                {/* Column 2: Quick Links */}
                <div>
                    <h3 className="text-white font-bold mb-6">ניווט מהיר</h3>
                    <ul className="flex flex-col gap-3 text-sm">
                        <li><Link href="/benefits" className="hover:text-white cursor-pointer transition-colors">כל הקטגוריות</Link></li>
                        <li><Link href="/join" className="hover:text-white cursor-pointer transition-colors">אזור אישי</Link></li>
                        <li><Link href="/about" className="hover:text-white cursor-pointer transition-colors">אודות טיבותא</Link></li>
                        <li><Link href="/why-tivuta" className="hover:text-white cursor-pointer transition-colors">למה אנחנו?</Link></li>
                    </ul>
                </div>

                {/* Column 3: Contact */}
                <div>
                    <h3 className="text-white font-bold mb-6">צור קשר</h3>
                    <ul className="flex flex-col gap-4 text-sm">
                        <li className="flex items-center gap-3">
                            <Phone size={18} className="text-[#2563eb]" />
                            <a href="tel:*9876" className="hover:text-white transition-colors">*9876</a>
                        </li>
                        <li className="flex items-center gap-3">
                            <Mail size={18} className="text-[#2563eb]" />
                            <a href="mailto:support@tivuta.co.il" className="hover:text-white transition-colors">support@tivuta.co.il</a>
                        </li>
                        <li className="flex items-center gap-3">
                            <MapPin size={18} className="text-[#2563eb]" />
                            <span>ירושלים / בית שמש</span>
                        </li>
                    </ul>
                </div>

                {/* Column 4: Newsletter/Trust */}
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    <h3 className="text-white font-bold mb-2 text-sm">מוקד שירות חברים</h3>
                    <p className="text-xs opacity-60 mb-4">זמינים עבורכם לכל שאלה בנושא מימוש הטבות.</p>
                    <Link href="/contact" className="w-full bg-[#2563eb] text-white py-4 rounded-2xl font-bold hover:bg-[#1e40af] transition-all text-center block">
                        פתיחת קריאת שירות
                    </Link>
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-800 text-center text-xs opacity-40">
                © {new Date().getFullYear()} TIVUTA Ecosystem. All rights reserved. English code, Hebrew heart.
            </div>
        </footer>
    );
}