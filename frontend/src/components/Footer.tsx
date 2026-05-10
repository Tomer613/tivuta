/**
 * Professional Footer for Tivuta.
 * Fully localized with logical alignment (RTL/LTR).
 */

import { Phone, Mail, MapPin, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function Footer({ locale = 'he', dict }: { locale?: string, dict?: any }) {
    const d = dict?.footer || {
        quick_links: "ניווט מהיר",
        contact_us: "צור קשר",
        service_center: "מוקד שירות חברים",
        service_desc: "זמינים עבורכם לכל שאלה בנושא מימוש הטבות.",
        open_ticket: "פתיחת קריאת שירות"
    };

    // Locale-based link labels (fallback)
    const links = {
        he: { benefits: "כל הקטגוריות", account: "אזור אישי", about: "אודות טיבותא", why: "למה אנחנו?" },
        en: { benefits: "All Categories", account: "Personal Area", about: "About TIVUTA", why: "Why Us?" },
        fr: { benefits: "Catégories", account: "Espace Client", about: "À propos", why: "Pourquoi nous?" },
        yi: { benefits: "אלע קאטעגאריעס", account: "מיין קאנטע", about: "איבער טיבותא", why: "פאר וואס מיר?" }
    }[locale as keyof typeof links] || links.he;

    return (
        <footer className="bg-slate-900 text-slate-300 py-16 px-8 border-t border-slate-800">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-start">

                {/* Column 1: Branding */}
                <div className="flex flex-col gap-4 items-start">
                    <img src="/images/logo.svg" alt="TIVUTA" className="h-10 w-auto brightness-0 invert" />
                    <p className="text-sm leading-relaxed opacity-70 text-start">
                        {locale === 'he' ? 'המעטפת המקצועית המובילה לקהילה החרדית העובדת.' :
                            locale === 'yi' ? 'די פראפעסיאנעלע הילף פארן חרדישן ציבור.' :
                                locale === 'fr' ? 'L’écosystème professionnel leader pour la communauté Harédi.' :
                                    'The leading professional ecosystem for the working Haredi community.'}
                    </p>
                    <div className="flex items-center gap-2 text-[#d97706] font-bold text-xs uppercase tracking-widest">
                        <ShieldCheck size={16} />
                        Safe & Secure Portal
                    </div>
                </div>

                {/* Column 2: Quick Links */}
                <div className="flex flex-col items-start">
                    <h3 className="text-white font-bold mb-6 border-s-4 border-[#2563eb] ps-3">{d.quick_links}</h3>
                    <ul className="flex flex-col gap-3 text-sm items-start">
                        <li><Link href={`/${locale}/benefits`} className="hover:text-white transition-colors">{links.benefits}</Link></li>
                        <li><Link href={`/${locale}/join`} className="hover:text-white transition-colors">{links.account}</Link></li>
                        <li><Link href={`/${locale}/about`} className="hover:text-white transition-colors">{links.about}</Link></li>
                        <li><Link href={`/${locale}/why-tivuta`} className="hover:text-white transition-colors">{links.why}</Link></li>
                    </ul>
                </div>

                {/* Column 3: Contact */}
                <div className="flex flex-col items-start">
                    <h3 className="text-white font-bold mb-6 border-s-4 border-[#2563eb] ps-3">{d.contact_us}</h3>
                    <ul className="flex flex-col gap-4 text-sm items-start">
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
                            <span>{locale === 'he' ? 'ירושלים / בית שמש' : locale === 'yi' ? 'ארץ ישראל' : 'Israel'}</span>
                        </li>
                    </ul>
                </div>

                {/* Column 4: Service Center */}
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 flex flex-col items-start">
                    <h3 className="text-white font-bold mb-2 text-sm">{d.service_center}</h3>
                    <p className="text-xs opacity-60 mb-4 text-start">{d.service_desc}</p>
                    <Link href={`/${locale}/contact`} className="w-full bg-[#2563eb] text-white py-4 rounded-2xl font-bold hover:bg-[#1e40af] transition-all text-center block">
                        {d.open_ticket}
                    </Link>
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-800 flex flex-col items-center gap-6 text-xs">
                <p className="opacity-40">© {new Date().getFullYear()} TIVUTA Ecosystem. All rights reserved.</p>

                <a
                    href="https://smart-studio.dev/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="branding-link"
                >
                    <span className="opacity-50 tracking-wide uppercase text-[10px]">{d.built_by || "Built by"}</span>
                    <img
                        src="/branding/smart-logo.svg"
                        alt="Smart Studio"
                        className="branding-logo h-6 w-auto translate-x-[3px]"
                    />
                </a>
            </div>
        </footer>
    );
}