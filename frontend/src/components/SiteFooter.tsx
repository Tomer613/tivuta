'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Phone, Mail, MapPin, ShieldCheck, Gem, Car, Shield } from 'lucide-react';

const tr: Record<string, Record<string, string>> = {
    he: {
        tagline: 'המעטפת המקצועית המובילה לקהילה החרדית.',
        quick_links: 'ניווט מהיר',
        home: 'דף הבית',
        diamonds: 'עולם היהלומים',
        cars: 'עולם הרכב',
        insurance: 'עולם הביטוחים',
        profile: 'האזור האישי',
        contact_us: 'צור קשר',
        service_center: 'מוקד שירות חברים',
        service_desc: 'זמינים עבורכם לכל שאלה ובקשה, בכל שעות היום.',
        open_ticket: 'שלח פנייה',
        rights: 'כל הזכויות שמורות',
        accessibility: 'הצהרת נגישות',
        secure: 'Safe & Secure Portal',
    },
    en: {
        tagline: 'The leading professional ecosystem for the working Haredi community.',
        quick_links: 'Quick Links',
        home: 'Home',
        diamonds: 'Diamonds World',
        cars: 'Cars World',
        insurance: 'Insurance World',
        profile: 'My Profile',
        contact_us: 'Contact Us',
        service_center: 'Member Service Center',
        service_desc: 'Available for any question or request, at any hour.',
        open_ticket: 'Contact Us',
        rights: 'All rights reserved',
        accessibility: 'Accessibility Statement',
        secure: 'Safe & Secure Portal',
    },
    fr: {
        tagline: "L'écosystème professionnel leader pour la communauté Harédi.",
        quick_links: 'Navigation rapide',
        home: 'Accueil',
        diamonds: 'Univers Diamants',
        cars: 'Univers Automobile',
        insurance: 'Univers Assurance',
        profile: 'Mon Espace',
        contact_us: 'Nous contacter',
        service_center: 'Centre de service',
        service_desc: 'Disponibles pour toute question, à tout moment.',
        open_ticket: 'Envoyer un message',
        rights: 'Tous droits réservés',
        accessibility: "Déclaration d'accessibilité",
        secure: 'Safe & Secure Portal',
    },
    yi: {
        tagline: 'די פראפעסיאנעלע הילף פארן חרדישן ציבור.',
        quick_links: 'שנעלע לינקס',
        home: 'היים',
        diamonds: 'דימענט וועלט',
        cars: 'אויטא וועלט',
        insurance: 'אינשורענס וועלט',
        profile: 'מיין פּרופֿיל',
        contact_us: 'קאנטאקט',
        service_center: 'מיטגליד סערוויס',
        service_desc: 'פאר יעדע פראגע, צו יעדן צייט.',
        open_ticket: 'שרייב אונדז',
        rights: 'אלע רעכטן פארבהאלטן',
        accessibility: 'נגישות',
        secure: 'Safe & Secure Portal',
    },
};

export default function SiteFooter() {
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const t = tr[locale] || tr.he;
    const base = process.env.NEXT_PUBLIC_BASE_PATH || '';

    return (
        <footer className="bg-[#080d1f] text-[#f0e6d3]/70 py-16 px-8 border-t border-[#d4af37]/20">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-start">

                {/* Column 1: Branding */}
                <div className="flex flex-col gap-4 items-start">
                    <img
                        src={`${base}/branding/logo.svg`}
                        alt="TIVUTA"
                        className="h-10 w-auto brightness-0 invert"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                    <p className="text-sm leading-relaxed opacity-70">{t.tagline}</p>
                    <div className="flex items-center gap-2 text-[#d4af37] font-bold text-xs uppercase tracking-widest">
                        <ShieldCheck size={15} />
                        {t.secure}
                    </div>
                </div>

                {/* Column 2: Quick Links */}
                <div className="flex flex-col items-start">
                    <h3 className="text-[#f0e6d3] font-bold mb-6 border-s-4 border-[#d4af37] ps-3">{t.quick_links}</h3>
                    <ul className="flex flex-col gap-3 text-sm">
                        <li>
                            <Link href={`/${locale}`} className="hover:text-white transition-colors">{t.home}</Link>
                        </li>
                        <li>
                            <Link href={`/${locale}/diamonds`} className="flex items-center gap-2 hover:text-white transition-colors">
                                <Gem size={13} className="text-[#d4af37]" /> {t.diamonds}
                            </Link>
                        </li>
                        <li>
                            <Link href={`/${locale}/cars`} className="flex items-center gap-2 hover:text-white transition-colors">
                                <Car size={13} className="text-[#d4af37]" /> {t.cars}
                            </Link>
                        </li>
                        <li>
                            <Link href={`/${locale}/insurance`} className="flex items-center gap-2 hover:text-white transition-colors">
                                <Shield size={13} className="text-[#d4af37]" /> {t.insurance}
                            </Link>
                        </li>
                        <li>
                            <Link href={`/${locale}/profile`} className="hover:text-white transition-colors">{t.profile}</Link>
                        </li>
                        <li>
                            <Link href={`/${locale}/accessibility-statement`} className="hover:text-white transition-colors text-xs opacity-60">{t.accessibility}</Link>
                        </li>
                    </ul>
                </div>

                {/* Column 3: Contact */}
                <div className="flex flex-col items-start">
                    <h3 className="text-[#f0e6d3] font-bold mb-6 border-s-4 border-[#d4af37] ps-3">{t.contact_us}</h3>
                    <ul className="flex flex-col gap-4 text-sm">
                        <li className="flex items-center gap-3">
                            <Phone size={17} className="text-[#d4af37] shrink-0" />
                            <a href="tel:*9876" className="hover:text-white transition-colors">*9876</a>
                        </li>
                        <li className="flex items-center gap-3">
                            <Mail size={17} className="text-[#d4af37] shrink-0" />
                            <a href="mailto:support@tivuta.co.il" className="hover:text-white transition-colors">support@tivuta.co.il</a>
                        </li>
                        <li className="flex items-center gap-3">
                            <MapPin size={17} className="text-[#d4af37] shrink-0" />
                            <span>{locale === 'he' || locale === 'yi' ? 'ירושלים / בית שמש' : 'Israel'}</span>
                        </li>
                    </ul>
                </div>

                {/* Column 4: Service CTA */}
                <div className="bg-[#0e1628] p-6 rounded-2xl border border-[#d4af37]/20 flex flex-col items-start">
                    <h3 className="text-[#f0e6d3] font-bold mb-2 text-sm">{t.service_center}</h3>
                    <p className="text-xs opacity-60 mb-5 leading-relaxed">{t.service_desc}</p>
                    <a
                        href="mailto:support@tivuta.co.il"
                        className="w-full bg-[#d4af37] text-[#080d1f] py-3 rounded-2xl font-bold hover:bg-[#f5d061] transition-all text-center text-sm block"
                    >
                        {t.open_ticket}
                    </a>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-[#d4af37]/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs opacity-40">
                <p>© {new Date().getFullYear()} TIVUTA Ecosystem. {t.rights}.</p>
                <a
                    href="https://smart-studio.dev/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                >
                    <span className="uppercase tracking-wide">Built by</span>
                    <img
                        src={`${base}/branding/smart-logo.svg`}
                        alt="Smart Studio"
                        className="h-5 w-auto"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </a>
            </div>
        </footer>
    );
}
