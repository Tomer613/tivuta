'use client';

import { useState } from 'react';
import { Store, Loader2, Eye, EyeOff, LogIn } from 'lucide-react';
import { useVendorAuth } from '@/context/VendorAuthContext';
import { vendorLogin } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';

interface T {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    submit: string;
    error_invalid: string;
}

const translations: Record<string, T> = {
    he: { title: 'פורטל ספקים - TIVUTA', subtitle: 'דיווח עסקאות לתוכנית הנאמנות', email: 'כתובת אימייל', password: 'סיסמה', submit: 'התחברות', error_invalid: 'אימייל או סיסמה שגויים' },
    en: { title: 'TIVUTA Vendor Portal', subtitle: 'Report sales for the loyalty program', email: 'Email Address', password: 'Password', submit: 'Login', error_invalid: 'Invalid email or password' },
    fr: { title: 'Portail Fournisseur TIVUTA', subtitle: 'Signaler des ventes pour le programme de fidélité', email: 'E-mail', password: 'Mot de passe', submit: 'Connexion', error_invalid: 'Identifiants invalides' },
    yi: { title: 'TIVUTA פארטאל פאר פארקויפער', subtitle: 'רעפארטירן פארקויפן', email: 'ע-פאסט', password: 'סיסמה', submit: 'אריינלאגן', error_invalid: 'טעות אין אימייל אדער סיסמה' },
};

export default function VendorLoginPage() {
    const params = useParams();
    const router = useRouter();
    const locale = (params?.locale as string) || 'he';
    const { login } = useVendorAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const t = translations[locale] || translations.he;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const data = await vendorLogin(email, password);
            await login(data.access_token);
            router.push(`/${locale}/vendor/dashboard`);
        } catch (err: any) {
            setError(err.message || t.error_invalid);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#111a2f] flex items-center justify-center p-8">
            <div className="w-full max-w-md bg-[#0e1628] p-12 rounded-[3rem] shadow-2xl border border-[#d4af37]/20">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-[#d4af37] text-[#080d1f] rounded-2xl flex items-center justify-center mb-6 shadow-lg rotate-3">
                        <Store size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-[#f0e6d3] mb-3 text-center">{t.title}</h1>
                    <p className="text-[#f0e6d3]/60 font-medium text-center leading-relaxed">{t.subtitle}</p>
                </div>

                {error && (
                    <div className="w-full p-4 mb-8 bg-red-500/10 text-red-400 rounded-2xl text-sm font-bold border border-red-500/30 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2 flex flex-col items-start">
                        <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest px-2">{t.email}</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#111a2f] border border-[#d4af37]/20 rounded-2xl px-6 py-4 text-[#f0e6d3] outline-none focus:ring-2 focus:ring-[#d4af37] transition-all"
                            placeholder="vendor@example.com"
                            dir="ltr"
                        />
                    </div>
                    <div className="space-y-2 flex flex-col items-start">
                        <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest px-2">{t.password}</label>
                        <div className="relative w-full">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#111a2f] border border-[#d4af37]/20 rounded-2xl px-6 py-4 text-[#f0e6d3] outline-none focus:ring-2 focus:ring-[#d4af37] transition-all"
                                placeholder="••••••••"
                                dir="ltr"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute inset-y-0 left-4 flex items-center text-[#f0e6d3]/60 hover:text-[#d4af37] transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#d4af37] text-[#080d1f] py-5 rounded-2xl text-lg font-bold shadow-xl hover:bg-[#e0bc4a] transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-4"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : (
                            <>
                                <span>{t.submit}</span>
                                <LogIn size={20} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </main>
    );
}
