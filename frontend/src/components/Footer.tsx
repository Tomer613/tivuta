/**
 * Professional Footer for Tivuta.
 * Focus: Reliability, accessibility, and local asset usage.
 */

import { Phone, Mail, MapPin, ShieldCheck } from 'lucide-react';

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
                        <li className="hover:text-white cursor-pointer transition-colors">כל הקטגוריות</li>
                        <li className="hover:text-white cursor-pointer transition-colors">אזור אישי</li>
                        <li className="hover:text-white cursor-pointer transition-colors">שאלות ותשובות</li>
                        <li className="hover:text-white cursor-pointer transition-colors">תקנון האתר</li>
                    </ul>
                </div>

                {/* Column 3: Contact */}
                <div>
                    <h3 className="text-white font-bold mb-6">צור קשר</h3>
                    <ul className="flex flex-col gap-4 text-sm">
                        <li className="flex items-center gap-3">
                            <Phone size={18} className="text-[#1e3a8a]" />
                            <span>*9876</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Mail size={18} className="text-[#1e3a8a]" />
                            <span>support@tivuta.co.il</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <MapPin size={18} className="text-[#1e3a8a]" />
                            <span>בית שמש, ישראל</span>
                        </li>
                    </ul>
                </div>

                {/* Column 4: Newsletter/Trust */}
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    <h3 className="text-white font-bold mb-2 text-sm">מוקד שירות חברים</h3>
                    <p className="text-xs opacity-60 mb-4">זמינים עבורכם לכל שאלה בנושא מימוש הטבות.</p>
                    <button className="w-full bg-[#1e3a8a] text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
                        פתיחת קריאת שירות
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-800 text-center text-xs opacity-40">
                © {new Date().getFullYear()} TIVUTA Ecosystem. All rights reserved. English code, Hebrew heart.
            </div>
        </footer>
    );
}