'use client';

import { useState } from 'react';
import { LogIn, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { BASE_URL } from '@/lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface LoginTranslation {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    submit: string;
    forgot: string;
    no_account: string;
    secure: string;
    error_invalid: string;
}

const translations: Record<string, LoginTranslation> = {
    he: {
        title: 'ברוכים הבאים ל-TIVUTA',
        subtitle: 'התחבר כדי לצפות בעולמות היהלומים, הרכב והביטוחים',
        email: 'כתובת אימייל',
        password: 'סיסמה',
        submit: 'התחבר למערכת',
        forgot: 'שכחתי סיסמה',
        no_account: 'עדיין אין לך חשבון? הצטרף עכשיו',
        secure: 'התחברות מאובטחת',
        error_invalid: 'אימייל או סיסמה שגויים',
    },
    en: {
        title: 'Welcome to TIVUTA',
        subtitle: 'Login to browse diamonds, cars and insurance',
        email: 'Email Address',
        password: 'Password',
        submit: 'Login',
        forgot: 'Forgot Password?',
        no_account: "Don't have an account? Join now",
        secure: 'Secure Login',
        error_invalid: 'Invalid email or password',
    },
    fr: {
        title: 'Bienvenue chez TIVUTA',
        subtitle: 'Connectez-vous pour parcourir diamants, voitures et assurances',
        email: 'E-mail',
        password: 'Mot de passe',
        submit: 'Connexion',
        forgot: 'Mot de passe oublié ?',
        no_account: "Pas de compte ? S'inscrire",
        secure: 'Connexion sécurisée',
        error_invalid: 'Identifiants invalides',
    },
    yi: {
        title: 'ברוכים הבאים TIVUTA',
        subtitle: 'לאגט זיך אריין צו זען דימענטן, אויטאס און אינשורענס',
        email: 'ע-פאסט',
        password: 'סיסמה',
        submit: 'אריינלאגן',
        forgot: 'פארגעסן סיסמה?',
        no_account: 'נישטא קיין קאנטע? שליסן זיך אן יעצט',
        secure: 'זיכערהייט',
        error_invalid: 'טעות אין אימייל אדער סיסמה',
    },
};

export default function LoginPage() {
    const params = useParams();
    const router = useRouter();
    const locale = (params?.locale as string) || 'he';
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const t = translations[locale] || translations.he;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);

            const response = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                await login(data.access_token);
                router.push(`/${locale}`);
            } else {
                setError(t.error_invalid);
            }
        } catch (err) {
            setError('Connection error. Please try again.');
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
                <div className="flex flex-col items-center mb-12">
                    <div className="w-16 h-16 bg-[#1e3a8a] text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg rotate-3">
                        <LogIn size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-[#f0e6d3] mb-3">{t.title}</h1>
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

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2 flex flex-col items-start">
                        <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest px-2">{t.email}</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                            placeholder="email@example.com"
                        />
                    </div>
                    <div className="space-y-2 flex flex-col items-start">
                        <div className="w-full flex justify-between items-center px-2">
                            <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest">{t.password}</label>
                            <Link href={`/${locale}/forgot-password`} className="text-xs font-bold text-[#1e3a8a] hover:underline">{t.forgot}</Link>
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
                                <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-12 pt-8 border-t border-[#d4af37]/20 text-center">
                    <Link href={`/${locale}/register`} className="text-sm font-bold text-[#f0e6d3]/60 hover:text-[#1e3a8a] transition-colors">
                        {t.no_account}
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
