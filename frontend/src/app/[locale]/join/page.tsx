/**
 * Join Now Page.
 * Localized for multi-language support with logical alignment.
 */

import { CheckCircle2, ShieldCheck } from 'lucide-react';

export default async function JoinPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;

    const t = {
        he: {
            title: "הגיע הזמן להתחיל להרוויח.",
            subtitle: "הצטרף לקהילה שדואגת לך באמת. הטבות בבנקים, הנחות ברשתות השיווק ואירועי פנאי מותאמים.",
            feature1: "הצטרפות חינם וללא התחייבות",
            feature2: "גישה מיידית לכל ההטבות",
            feature3: "שירות לקוחות אישי בווטסאפ",
            form_title: "טופס הצטרפות מהיר",
            fname: "שם פרטי",
            lname: "שם משפחה",
            phone: "מספר טלפון",
            email: "כתובת אימייל",
            submit: "שגר בקשה להצטרפות",
            secure: "מאובטח בסטנדרט הגבוה ביותר"
        },
        en: {
            title: "It's Time to Start Earning.",
            subtitle: "Join the community that truly cares. Bank benefits, retail discounts, and tailored leisure events.",
            feature1: "Free joining, no commitment",
            feature2: "Immediate access to all benefits",
            feature3: "Personal WhatsApp customer service",
            form_title: "Quick Registration",
            fname: "First Name",
            lname: "Last Name",
            phone: "Phone Number",
            email: "Email Address",
            submit: "Submit Registration",
            secure: "Secured with the highest standards"
        },
        fr: {
            title: "Il est temps de commencer à gagner.",
            subtitle: "Rejoignez la communauté qui se soucie vraiment de vous. Avantages bancaires et réductions.",
            feature1: "Adhésion gratuite, sans engagement",
            feature2: "Accès immédiat à tous les avantages",
            feature3: "Service client WhatsApp personnel",
            form_title: "Inscription Rapide",
            fname: "Prénom",
            lname: "Nom",
            phone: "Téléphone",
            email: "E-mail",
            submit: "Envoyer l'inscription",
            secure: "Sécurisé selon les normes les plus strictes"
        },
        yi: {
            title: "ס'איז צייט אנצוהויבן פארדינען.",
            subtitle: "שליסן זיך אן אין אונזער קהילה.",
            feature1: "אומזיסטע רעגיסטראציע",
            feature2: "צוטריט צו אלע בענעפיטן",
            feature3: "פערזענליכע קאסטומער סערוויס",
            form_title: "שנעלע רעגיסטראציע",
            fname: "ערשטע נאמען",
            lname: "לעצטע נאמען",
            phone: "טעלעפאן",
            email: "ע-פאסט",
            submit: "שיקן די רעגיסטראציע",
            secure: "געזיכערט אויפן העכסטן פארמאט"
        }
    }[locale as keyof typeof t] || t.he;

    return (
        <main className="min-h-screen bg-slate-50 py-24 px-8">
            <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center text-start">
                
                {/* Left Side: Marketing Info */}
                <div className="flex flex-col items-start">
                    <h1 className="text-6xl font-black text-slate-900 mb-8 leading-tight text-start">
                        {t.title.split(' ').slice(0, -1).join(' ')} <br />
                        <span className="text-[#1e3a8a]">{t.title.split(' ').slice(-1)}</span>
                    </h1>
                    <p className="text-2xl text-slate-500 mb-12 font-light leading-relaxed text-start">
                        {t.subtitle}
                    </p>
                    
                    <div className="space-y-6">
                        {[t.feature1, t.feature2, t.feature3].map((f, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                                    <CheckCircle2 size={24} />
                                </div>
                                <span className="text-xl font-bold text-slate-700">{f}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side: Registration Form */}
                <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col items-start w-full">
                    <h2 className="text-3xl font-black text-slate-900 mb-8 text-start">{t.form_title}</h2>
                    <form className="space-y-6 w-full">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2 items-start">
                                <label className="text-sm font-bold text-slate-600 px-2">{t.fname}</label>
                                <input type="text" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] text-start" />
                            </div>
                            <div className="flex flex-col gap-2 items-start">
                                <label className="text-sm font-bold text-slate-600 px-2">{t.lname}</label>
                                <input type="text" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] text-start" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 items-start">
                            <label className="text-sm font-bold text-slate-600 px-2">{t.phone}</label>
                            <input type="tel" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] text-start" />
                        </div>
                        <div className="flex flex-col gap-2 items-start">
                            <label className="text-sm font-bold text-slate-600 px-2">{t.email}</label>
                            <input type="email" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] text-start" />
                        </div>
                        
                        <button type="button" className="w-full btn-primary !py-5 !text-xl shadow-xl mt-4">
                            {t.submit}
                        </button>
                    </form>
                    
                    <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-widest self-center">
                        <ShieldCheck size={16} />
                        <span>{t.secure}</span>
                    </div>
                </div>
            </div>
        </main>
    );
}
