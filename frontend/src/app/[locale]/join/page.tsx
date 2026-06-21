/**
 * Join Now Page.
 * Client component for handling registration.
 */
'use client';

import { useState } from 'react';
import { CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';

interface JoinTranslation {
    title: string;
    subtitle: string;
    feature1: string;
    feature2: string;
    feature3: string;
    form_title: string;
    fname: string;
    lname: string;
    phone: string;
    email: string;
    password: string;
    submit: string;
    secure: string;
    error_email: string;
}

const translations: Record<string, JoinTranslation> = {
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
        password: "סיסמה",
        submit: "שגר בקשה להצטרפות",
        secure: "מאובטח בסטנדרט הגבוה ביותר",
        error_email: "האימייל כבר קיים במערכת"
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
        password: "Password",
        submit: "Submit Registration",
        secure: "Secured with the highest standards",
        error_email: "Email already exists"
    },
    fr: {
        title: "Il est temps de gagner.",
        subtitle: "Rejoignez la communauté qui se soucie vraiment de vous.",
        feature1: "Inscription gratuite",
        feature2: "Accès immédiat",
        feature3: "Service client WhatsApp",
        form_title: "Inscription rapide",
        fname: "Prénom",
        lname: "Nom",
        phone: "Téléphone",
        email: "E-mail",
        password: "Mot de passe",
        submit: "S'inscrire",
        secure: "Sécurisé",
        error_email: "Email existe déjà"
    },
    yi: {
        title: "צייט אנצוהויבן פארדינען.",
        subtitle: "שליסן זיך אן אין דער קהילה וואס דארף אייך.",
        feature1: "פרייע רעגיסטראציע",
        feature2: "זאפארט צוטריט",
        feature3: "וואטסאפ סערוויס",
        form_title: "שנעלע רעגיסטראציע",
        fname: "ערשטער נאמען",
        lname: "לעצטער נאמען",
        phone: "טעלעפאן",
        email: "ע-פאסט",
        password: "סיסמה",
        submit: "רעגיסטרירן",
        secure: "זיכערהייט",
        error_email: "אימייל עקזיסטירט שוין"
    }
};

export default function JoinPage() {
    const params = useParams();
    const locale = params.locale as string || 'he';
    const { signup } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        password: ''
    });

    const t = translations[locale] || translations.he;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await signup(formData);
        } catch (err: any) {
            setError(err.message || 'Signup failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <main className="min-h-screen bg-[#111a2f] py-24 px-8 overflow-hidden">
            <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center text-start">
                
                {/* Left Side: Marketing Info */}
                <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="flex flex-col items-start"
                >
                    <h1 className="text-6xl font-black text-[#f0e6d3] mb-8 leading-tight text-start">
                        {t.title.split(' ').slice(0, -1).join(' ')} <br />
                        <span className="text-[#1e3a8a]">{t.title.split(' ').slice(-1)}</span>
                    </h1>
                    <p className="text-2xl text-[#f0e6d3]/60 mb-12 font-light leading-relaxed text-start">
                        {t.subtitle}
                    </p>
                    
                    <div className="space-y-6">
                        {[t.feature1, t.feature2, t.feature3].map((f, i) => (
                            <motion.div 
                                key={i} 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 * i }}
                                className="flex items-center gap-4"
                            >
                                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                                    <CheckCircle2 size={24} />
                                </div>
                                <span className="text-xl font-bold text-[#f0e6d3]">{f}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Right Side: Registration Form */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="bg-[#0e1628] p-12 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-[#d4af37]/20 flex flex-col items-start w-full relative overflow-hidden"
                >
                    <h2 className="text-3xl font-black text-[#f0e6d3] mb-8 text-start">{t.form_title}</h2>
                    
                    {error && (
                        <div className="w-full p-4 mb-6 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">
                            {error}
                        </div>
                    )}

                    <form className="space-y-6 w-full" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2 items-start">
                                <label className="text-sm font-bold text-[#f0e6d3] px-2">{t.fname}</label>
                                <input 
                                    type="text" 
                                    name="first_name"
                                    required
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    className="w-full bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] text-start transition-all" 
                                />
                            </div>
                            <div className="flex flex-col gap-2 items-start">
                                <label className="text-sm font-bold text-[#f0e6d3] px-2">{t.lname}</label>
                                <input 
                                    type="text" 
                                    name="last_name"
                                    required
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    className="w-full bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] text-start transition-all" 
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 items-start">
                            <label className="text-sm font-bold text-[#f0e6d3] px-2">{t.phone}</label>
                            <input 
                                type="tel" 
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] text-start transition-all" 
                            />
                        </div>
                        <div className="flex flex-col gap-2 items-start">
                            <label className="text-sm font-bold text-[#f0e6d3] px-2">{t.email}</label>
                            <input 
                                type="email" 
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] text-start transition-all" 
                            />
                        </div>
                        <div className="flex flex-col gap-2 items-start">
                            <label className="text-sm font-bold text-[#f0e6d3] px-2">{t.password}</label>
                            <input 
                                type="password" 
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] text-start transition-all" 
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-[#1e3a8a] text-white py-5 rounded-2xl text-xl font-bold shadow-xl shadow-[#1e3a8a]/20 hover:bg-[#1e3a8a]/90 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : t.submit}
                        </button>
                    </form>
                    
                    <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#f0e6d3]/60 font-bold uppercase tracking-widest self-center">
                        <ShieldCheck size={16} />
                        <span>{t.secure}</span>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
