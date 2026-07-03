'use client';

import { useState } from 'react';
import { UserPlus, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { BASE_URL } from '@/lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface RegisterTranslation {
    title: string;
    subtitle: string;
    fname: string;
    lname: string;
    phone: string;
    email: string;
    password: string;
    submit: string;
    have_account: string;
    secure: string;
    error_email: string;
    error_generic: string;
}

const translations: Record<string, RegisterTranslation> = {
    he: {
        title: 'יצירת חשבון ל-TIVUTA',
        subtitle: 'פתיחת חשבון מאפשרת לך לגלוש בעולמות היהלומים, הרכב והביטוחים שלנו',
        fname: 'שם פרטי',
        lname: 'שם משפחה',
        phone: 'מספר טלפון',
        email: 'כתובת אימייל',
        password: 'סיסמה',
        submit: 'צור חשבון',
        have_account: 'יש לך כבר חשבון? התחבר',
        secure: 'מאובטח בסטנדרט הגבוה ביותר',
        error_email: 'האימייל כבר קיים במערכת',
        error_generic: 'משהו השתבש, אנא נסו שנית',
    },
    en: {
        title: 'Create your TIVUTA account',
        subtitle: 'An account lets you browse our diamonds, cars and insurance worlds',
        fname: 'First Name',
        lname: 'Last Name',
        phone: 'Phone Number',
        email: 'Email Address',
        password: 'Password',
        submit: 'Create Account',
        have_account: 'Already have an account? Login',
        secure: 'Secured with the highest standards',
        error_email: 'Email already exists',
        error_generic: 'Something went wrong, please try again',
    },
    fr: {
        title: 'Créer votre compte TIVUTA',
        subtitle: 'Un compte vous permet de parcourir nos univers diamants, voitures et assurances',
        fname: 'Prénom',
        lname: 'Nom',
        phone: 'Téléphone',
        email: 'E-mail',
        password: 'Mot de passe',
        submit: 'Créer un compte',
        have_account: 'Déjà un compte ? Connexion',
        secure: 'Sécurisé',
        error_email: 'Email existe déjà',
        error_generic: 'Une erreur est survenue, veuillez réessayer',
    },
    yi: {
        title: 'שאפן א TIVUTA קאנטע',
        subtitle: 'א קאנטע לאזט אייך זען אונדזערע דימענטן, אויטאס און אינשורענס וועלטן',
        fname: 'ערשטער נאמען',
        lname: 'לעצטער נאמען',
        phone: 'טעלעפאן',
        email: 'ע-פאסט',
        password: 'סיסמה',
        submit: 'שאפן קאנטע',
        have_account: 'שוין דא א קאנטע? אריינלאגן',
        secure: 'זיכערהייט',
        error_email: 'אימייל עקזיסטירט שוין',
        error_generic: 'עפעס איז נישט גוט, פרובירט נאכאמאל',
    },
};

export default function RegisterPage() {
    const params = useParams();
    const router = useRouter();
    const locale = (params?.locale as string) || 'he';
    const { signup, login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        password: '',
    });

    const t = translations[locale] || translations.he;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await signup(formData);

            const loginForm = new FormData();
            loginForm.append('username', formData.email);
            loginForm.append('password', formData.password);
            const response = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                body: loginForm,
            });
            if (response.ok) {
                const data = await response.json();
                await login(data.access_token);
                const redirectTo = new URLSearchParams(window.location.search).get('redirect');
                router.push(redirectTo && redirectTo.startsWith('/') ? redirectTo : `/${locale}`);
            } else {
                router.push(`/${locale}/login`);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : '';
            setError(message.includes('exists') || message.includes('already') ? t.error_email : t.error_generic);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#111a2f] flex items-center justify-center p-8 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1e3a8a] blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-md bg-[#0e1628]/80 backdrop-blur-xl p-12 rounded-[3rem] shadow-2xl border border-white relative z-10"
            >
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-[#1e3a8a] text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg rotate-3">
                        <UserPlus size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-[#f0e6d3] mb-3 text-center">{t.title}</h1>
                    <p className="text-[#f0e6d3]/60 font-medium text-center leading-relaxed">{t.subtitle}</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full p-4 mb-8 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 text-center"
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 flex flex-col items-start">
                            <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest px-2">{t.fname}</label>
                            <input
                                type="text"
                                name="first_name"
                                required
                                value={formData.first_name}
                                onChange={handleChange}
                                className="w-full bg-[#111a2f] border-none rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                            />
                        </div>
                        <div className="space-y-2 flex flex-col items-start">
                            <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest px-2">{t.lname}</label>
                            <input
                                type="text"
                                name="last_name"
                                required
                                value={formData.last_name}
                                onChange={handleChange}
                                className="w-full bg-[#111a2f] border-none rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                            />
                        </div>
                    </div>
                    <div className="space-y-2 flex flex-col items-start">
                        <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest px-2">{t.phone}</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                        />
                    </div>
                    <div className="space-y-2 flex flex-col items-start">
                        <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest px-2">{t.email}</label>
                        <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                            placeholder="email@example.com"
                        />
                    </div>
                    <div className="space-y-2 flex flex-col items-start">
                        <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest px-2">{t.password}</label>
                        <input
                            type="password"
                            name="password"
                            required
                            minLength={6}
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#080d1f] text-white py-5 rounded-2xl text-lg font-bold shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-4 group"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : (
                            <>
                                <span>{t.submit}</span>
                                <UserPlus size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-10 pt-8 border-t border-[#d4af37]/20 text-center">
                    <Link
                        href={`/${locale}/login${typeof window !== 'undefined' && window.location.search ? window.location.search : ''}`}
                        className="text-sm font-bold text-[#f0e6d3]/60 hover:text-[#1e3a8a] transition-colors"
                    >
                        {t.have_account}
                    </Link>
                </div>

                <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-[#f0e6d3]/60 font-bold uppercase tracking-widest">
                    <ShieldCheck size={12} />
                    <span>{t.secure}</span>
                </div>
            </motion.div>
        </main>
    );
}
