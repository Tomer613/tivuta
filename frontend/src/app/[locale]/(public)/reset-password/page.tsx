'use client';

import { Suspense, useState } from 'react';
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { resetPassword } from '@/lib/api';
import Link from 'next/link';

interface T {
    title: string;
    subtitle: string;
    password: string;
    submit: string;
    success: string;
    go_to_login: string;
    error: string;
}

const translations: Record<string, T> = {
    he: { title: 'איפוס סיסמה', subtitle: 'בחר/י סיסמה חדשה לחשבון שלך', password: 'סיסמה חדשה', submit: 'עדכן סיסמה', success: 'הסיסמה עודכנה בהצלחה!', go_to_login: 'מעבר להתחברות', error: 'הקישור פג תוקף או שגוי' },
    en: { title: 'Reset Password', subtitle: 'Choose a new password for your account', password: 'New Password', submit: 'Update Password', success: 'Password updated successfully!', go_to_login: 'Go to login', error: 'This link is invalid or expired' },
    fr: { title: 'Réinitialiser le mot de passe', subtitle: 'Choisissez un nouveau mot de passe', password: 'Nouveau mot de passe', submit: 'Mettre à jour', success: 'Mot de passe mis à jour !', go_to_login: 'Aller à la connexion', error: 'Ce lien est invalide ou expiré' },
    yi: { title: 'איבערשטעלן סיסמה', subtitle: 'קלייבט א נייע סיסמה', password: 'נייע סיסמה', submit: 'אפדעיט סיסמה', success: 'סיסמה איז געענדערט!', go_to_login: 'גיין צו אריינלאגן', error: 'דער לינק איז אומגילטיג' },
};

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#111a2f]" />}>
            <ResetPasswordForm />
        </Suspense>
    );
}

function ResetPasswordForm() {
    const params = useParams();
    const searchParams = useSearchParams();
    const locale = (params?.locale as string) || 'he';
    const t = translations[locale] || translations.he;
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await resetPassword(token, password);
            setDone(true);
        } catch (err: any) {
            setError(t.error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#111a2f] flex items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-md bg-[#0e1628]/80 backdrop-blur-xl p-6 sm:p-12 rounded-[3rem] shadow-2xl border border-white">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-[#1e3a8a] text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                        <KeyRound size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-[#f0e6d3] mb-3 text-center">{t.title}</h1>
                    <p className="text-[#f0e6d3]/60 font-medium text-center leading-relaxed">{t.subtitle}</p>
                </div>

                {done ? (
                    <div className="text-center">
                        <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                        <p className="text-[#f0e6d3] font-bold mb-8">{t.success}</p>
                        <Link href={`/${locale}/login`} className="text-sm font-bold text-[#1e3a8a] hover:underline">{t.go_to_login}</Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="w-full p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 text-center">{error}</div>
                        )}
                        <div className="space-y-2 flex flex-col items-start">
                            <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest px-2">{t.password}</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !token}
                            className="w-full bg-[#080d1f] text-white py-5 rounded-2xl text-lg font-bold shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : t.submit}
                        </button>
                    </form>
                )}
            </div>
        </main>
    );
}
