'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { CreditCard, Coins, Gift, ShieldCheck, Zap, Star, CheckCircle2 } from 'lucide-react';

const BRAND = {
    navy:   '#1B365D',
    silver: '#A8A9AD',
    gold:   '#C5A059',
};

const benefits = [
    {
        icon: Coins,
        title_he: 'מעטפת כלכלית למשפחה',
        desc_he: 'פתיחת חשבון בנק, פתרונות ביטוח, עמלות מוזלות וייעוץ כלכלי חכם — ליווי מלא בדרך לצמיחה.',
        title_en: 'Family Financial Umbrella',
        desc_en: 'Bank account opening, insurance solutions, reduced fees, and smart financial consulting — all in one place.',
    },
    {
        icon: Gift,
        title_he: 'הנחות בלעדיות לחברי טיבותא',
        desc_he: 'גישה לעסקאות שסגרנו עבורך ברשתות המובילות — מזון, אופנה, בריאות, פנאי ועוד.',
        title_en: 'Exclusive Discounts for Tivuta Members',
        desc_en: 'Access to deals we closed for you at leading chains — food, fashion, health, leisure and more.',
    },
    {
        icon: ShieldCheck,
        title_he: 'ביטוח קניות ונסיעות',
        desc_he: 'כל רכישה מבוטחת אוטומטית. טסים לחו"ל? ביטוח נסיעות בסיסי כלול בכרטיס.',
        title_en: 'Purchase & Travel Insurance',
        desc_en: 'Every purchase is automatically insured. Traveling abroad? Basic travel insurance is included.',
    },
    {
        icon: Zap,
        title_he: 'אישור מיידי — 24/6',
        desc_he: 'בקשת כרטיס, תשובה מהירה. ניהול מלא דרך האזור האישי שלך בכל שעות הפעילות.',
        title_en: 'Instant Approval — 24/6',
        desc_en: 'Apply for a card, get a quick response. Full management through your personal area during activity hours.',
    },
    {
        icon: Star,
        title_he: 'צבירת נקודות "טיבותא"',
        desc_he: 'על כל עסקה אתם צוברי נקודות "טיבותא". הנקודות ניתנות למימוש ברשת העסקים השותפים שלנו.',
        title_en: '"Tivuta" Points Accumulation',
        desc_en: 'Every transaction earns you Tivuta points, redeemable at any partner business.',
    },
    {
        icon: CheckCircle2,
        title_he: 'ללא דמי כרטיס שנתיים',
        desc_he: 'אין הפתעות בחשבון. אין עמלות נסתרות. הכרטיס עובד בשבילך — לא להפך.',
        title_en: 'No Annual Card Fees',
        desc_en: 'No surprises on your statement. No hidden fees. The card works for you — not the other way around.',
    },
];

export default function CardClient({ locale }: { locale: string }) {
    const isHe = locale === 'he' || locale === 'yi';

    const t = {
        badge:          isHe ? 'כרטיס האשראי של טיבותא'         : 'The Tivuta Credit Card',
        headline1:      isHe ? 'הכרטיס שדואג לך'                 : 'The Card That Works',
        headline2:      isHe ? 'באמת.'                            : 'For You.',
        sub:            isHe ? 'לטובתך ולהנאתך — לא רק סלוגן. כרטיס האשראי של טיבותא מחזיר לך כסף, נותן הנחות אמיתיות, ועובד בשבילך בכל קנייה.'
                              : 'For your benefit and pleasure — not just a slogan. The Tivuta credit card gives you cashback, real discounts, and works for you on every purchase.',
        cta:            isHe ? 'הגשת בקשה לכרטיס'               : 'Apply for a Card',
        benefits_title: isHe ? 'מה מחזיקי הכרטיס מקבלים?'       : 'What Do Cardholders Get?',
        benefits_sub:   isHe ? 'הטבות אמיתיות. לא הבטחות.'       : 'Real benefits. Not promises.',
        cta2_title:     isHe ? 'מוכן לקבל את הכרטיס?'            : 'Ready to Get the Card?',
        cta2_sub:       isHe ? 'תהליך הצטרפות פשוט. אישור מהיר. התחלה מיידית.' : 'Simple onboarding. Fast approval. Immediate start.',
        cta2_btn:       isHe ? 'להגשת בקשה'                      : 'Apply Now',
    };

    return (
        <main className="min-h-screen bg-[#111a2f]">

            {/* ─── Hero — deep luxurious dark ─── */}
            <section className="relative bg-[#0d1b35] py-28 px-6 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 start-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 end-0 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
                </div>

                <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">

                    {/* Text */}
                    <motion.div
                        initial={{ opacity: 0, x: isHe ? 40 : -40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-white order-2 lg:order-1"
                    >
                        <div className="inline-flex items-center gap-2 bg-amber-400/15 text-amber-300 px-4 py-2 rounded-full text-sm font-bold mb-6 border border-amber-400/25">
                            <CreditCard size={15} />
                            <span>{t.badge}</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
                            {t.headline1}<br />
                            <span className="text-amber-400">{t.headline2}</span>
                        </h1>
                        <p className="text-blue-200/80 text-lg font-light leading-relaxed mb-10 max-w-lg">
                            {t.sub}
                        </p>
                        <Link
                            href={`/${locale}/join`}
                            className="inline-block bg-amber-400 text-[#f0e6d3] font-black text-lg px-10 py-4 rounded-2xl hover:bg-amber-300 transition-all shadow-2xl shadow-amber-500/20 hover:scale-105 active:scale-100"
                        >
                            {t.cta}
                        </Link>
                    </motion.div>

                    {/* Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.9, delay: 0.15 }}
                        className="flex justify-center items-center order-1 lg:order-2"
                    >
                        <CardVisual />
                    </motion.div>
                </div>
            </section>

            {/* ─── Benefits grid ─── */}
            <section className="max-w-6xl mx-auto py-24 px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-black mb-3" style={{ color: BRAND.navy }}>{t.benefits_title}</h2>
                    <p className="text-xl font-light text-[#f0e6d3]/60">{t.benefits_sub}</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {benefits.map((b, i) => {
                        const Icon = b.icon;
                        const title = isHe ? b.title_he : b.title_en;
                        const desc  = isHe ? b.desc_he  : b.desc_en;
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08 }}
                                whileHover={{
                                    y: -6,
                                    backgroundColor: '#111a2f',
                                    borderColor: `${BRAND.gold}99`,
                                    boxShadow: `0 16px 48px -8px rgba(212,175,55,0.22)`,
                                    transition: { duration: 0.22 },
                                }}
                                className="p-8 rounded-3xl cursor-default"
                                style={{
                                    background: 'linear-gradient(145deg, #0e1628, #111a2f)',
                                    border: `1px solid rgba(212,175,55,0.22)`,
                                    boxShadow: '0 2px 16px rgba(212,175,55,0.06)',
                                }}
                            >
                                <motion.div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                                    style={{ background: `linear-gradient(135deg, rgba(197,160,89,0.16), rgba(168,169,173,0.1))` }}
                                    whileHover={{ scale: 1.15, transition: { duration: 0.2 } }}
                                >
                                    <Icon size={22} style={{ color: BRAND.gold }} />
                                </motion.div>
                                <h3 className="font-black text-lg mb-2" style={{ color: BRAND.navy }}>{title}</h3>
                                <p className="text-sm leading-relaxed text-[#f0e6d3]/60">{desc}</p>
                            </motion.div>
                        );
                    })}
                </div>
            </section>

            {/* ─── Bottom CTA ─── */}
            <section className="bg-[#0d1b35] py-24 px-6 mx-6 rounded-[3.5rem] mb-24 text-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 end-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 start-0 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl" />
                </div>
                <div className="relative z-10">
                    <h2 className="text-4xl font-black text-white mb-4">{t.cta2_title}</h2>
                    <p className="text-blue-200 mb-10 text-lg font-light">{t.cta2_sub}</p>
                    <Link
                        href={`/${locale}/join`}
                        className="inline-block bg-amber-400 text-[#f0e6d3] font-black text-xl px-14 py-5 rounded-2xl hover:bg-amber-300 transition-all hover:scale-105 active:scale-100 shadow-2xl shadow-amber-500/20"
                    >
                        {t.cta2_btn}
                    </Link>
                </div>
            </section>
        </main>
    );
}

function CardVisual() {
    return (
        /* LTR so left/right always map to visual left/right regardless of page direction */
        <div className="relative select-none" style={{ perspective: '1200px', direction: 'ltr' }}>
            {/* Diffused ground shadow */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[280px] h-8 rounded-full"
                 style={{ background: 'rgba(0,0,0,0.45)', filter: 'blur(22px)' }} />

            <motion.div
                animate={{
                    y:       [0, -16, 0],
                    rotate:  [0, 0.7, 0, -0.7, 0],
                    rotateX: [0, 3, 0],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-[340px] h-[214px] rounded-[22px] overflow-hidden"
                style={{
                    /* Rich multi-stop radial — bright light source top-right */
                    background: `
                        radial-gradient(ellipse at 78% 12%, #4a7ed8 0%, #2a55a8 18%, ${BRAND.navy} 52%, #0c1c38 100%)
                    `,
                    boxShadow: `
                        0 50px 100px -20px rgba(0,0,0,0.85),
                        0 20px 50px -10px rgba(0,0,0,0.5),
                        0 0 0 1.5px rgba(197,160,89,0.4) inset,
                        0 0 90px -25px rgba(197,160,89,0.4),
                        0 0 40px -10px rgba(74,126,216,0.3)
                    `,
                }}
            >
                {/* Top metallic sheen */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 35%)',
                }} />

                {/* Wide diagonal shimmer — gold + white */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    background: `linear-gradient(
                        108deg,
                        transparent 18%,
                        rgba(197,160,89,0.18) 36%,
                        rgba(255,255,255,0.10) 46%,
                        rgba(197,160,89,0.12) 56%,
                        transparent 72%
                    )`,
                }} />

                {/* Very subtle diagonal texture for depth */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage: `repeating-linear-gradient(
                        45deg,
                        transparent, transparent 8px,
                        rgba(255,255,255,0.012) 8px, rgba(255,255,255,0.012) 9px
                    )`,
                }} />

                {/* Decorative arcs — stronger gold */}
                <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full"
                     style={{ border: '1px solid rgba(197,160,89,0.28)' }} />
                <div className="absolute -top-22 -right-22 w-76 h-76 rounded-full"
                     style={{ border: '1px solid rgba(197,160,89,0.12)' }} />

                {/* TOP-LEFT: NFC / Contactless */}
                <div className="absolute top-5 left-5">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.45 }}>
                        <path d="M12 3C7.03 3 3 7.03 3 12"    stroke={BRAND.silver} strokeWidth="2.2" strokeLinecap="round"/>
                        <path d="M12 7C9.24 7 7 9.24 7 12"    stroke={BRAND.silver} strokeWidth="2.2" strokeLinecap="round"/>
                        <circle cx="12" cy="12" r="1.8" fill={BRAND.silver}/>
                        <path d="M12 3C16.97 3 21 7.03 21 12"  stroke={BRAND.silver} strokeWidth="2.2" strokeLinecap="round"/>
                        <path d="M12 7C14.76 7 17 9.24 17 12"  stroke={BRAND.silver} strokeWidth="2.2" strokeLinecap="round"/>
                    </svg>
                </div>

                {/* TOP-RIGHT: Logo + slogan right-aligned together. */}
                <div className="absolute top-5 right-5"
                     style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <img
                        src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/branding/logo.svg`}
                        alt="TIVUTA"
                        className="h-7 w-auto brightness-0 invert"
                        style={{ opacity: 0.95, marginRight: '-9px' }}
                    />
                    <span style={{
                        color: BRAND.gold,
                        fontSize: '9px',
                        letterSpacing: '0.16em',
                        marginTop: '5px',
                        fontWeight: 500,
                        opacity: 0.95,
                        whiteSpace: 'nowrap',
                    }}>
                        לטובתך ולהנאתך
                    </span>
                </div>

                {/* LEFT-CENTER: EMV Chip */}
                <div className="absolute left-5" style={{ top: '50%', transform: 'translateY(-50%)' }}>
                    <div
                        className="w-10 rounded-[5px] relative overflow-hidden"
                        style={{
                            height: 30,
                            background: `linear-gradient(145deg, #b08030 0%, ${BRAND.gold} 32%, #edcf7a 52%, ${BRAND.gold} 72%, #9a6c18 100%)`,
                            boxShadow: '0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.32), 0 0 12px -4px rgba(197,160,89,0.6)',
                        }}
                    >
                        <div className="absolute inset-x-0" style={{ top: '50%',  height: 1, background: 'rgba(107,69,0,0.32)' }} />
                        <div className="absolute inset-y-0" style={{ left: '33%', width:  1, background: 'rgba(107,69,0,0.32)' }} />
                        <div className="absolute inset-y-0" style={{ left: '66%', width:  1, background: 'rgba(107,69,0,0.32)' }} />
                        <div className="absolute inset-x-0" style={{ top: '28%',  height: 1, background: 'rgba(107,69,0,0.16)' }} />
                        <div className="absolute inset-x-0" style={{ top: '72%',  height: 1, background: 'rgba(107,69,0,0.16)' }} />
                    </div>
                </div>

                {/* BOTTOM: Card number + name */}
                <div className="absolute bottom-4 left-5 right-5">
                    <div className="flex items-center gap-4 mb-2">
                        {[0, 1, 2].map(g => (
                            <div key={g} className="flex gap-[3px]">
                                {[0, 1, 2, 3].map(d => (
                                    <div key={d} className="w-[4.5px] h-[4.5px] rounded-full"
                                         style={{ background: BRAND.silver, opacity: 0.55 }} />
                                ))}
                            </div>
                        ))}
                        <span className="text-sm font-mono tracking-wider"
                              style={{ color: BRAND.silver, opacity: 0.75 }}>3621</span>
                    </div>
                    <div className="text-xs tracking-widest font-medium uppercase"
                         style={{ color: BRAND.silver, opacity: 0.65 }}>
                        ישראל ישראלי
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
