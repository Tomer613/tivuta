'use client';

import { Suspense, useState } from 'react';
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { vendorResetPassword } from '@/lib/api';
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
    he: { title: 'קביעת סיסמה', subtitle: 'בחר/י סיסמה לחשבון הספק שלך בפורטל TIVUTA', password: 'סיסמה חדשה', submit: 'עדכן סיסמה', success: 'הסיסמה נקבעה בהצלחה!', go_to_login: 'מעבר להתחברות', error: 'הקישור פג תוקף או שגוי' },
    en: { title: 'Set Password', subtitle: 'Choose a password for your TIVUTA vendor account', password: 'New Password', submit: 'Update Password', success: 'Password set successfully!', go_to_login: 'Go to login', error: 'This link is invalid or expired' },
    fr: { title: 'Définir le mot de passe', subtitle: 'Choisissez un mot de passe pour votre compte fournisseur', password: 'Nouveau mot de passe', submit: 'Mettre à jour', success: 'Mot de passe défini !', go_to_login: 'Aller à la connexion', error: 'Ce lien est invalide ou expiré' },
    yi: { title: 'שטעלן סיסמה', subtitle: 'קלייבט א סיסמה פאר אייער פארקויפער קאנטע', password: 'נייע סיסמה', submit: 'אפדעיט סיסמה', success: 'סיסמה איז געשטעלט!', go_to_login: 'גיין צו אריינלאגן', error: 'דער לינק איז אומגילטיג' },
};

export default function VendorResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#111a2f]" />}>
            <VendorResetPasswordForm />
        </Suspense>
    );
}

function VendorResetPasswordForm() {
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
            await vendorResetPassword(token, password);
            setDone(true);
        } catch {
            setError(t.error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#111a2f] flex items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-md bg-[#0e1628] p-6 sm:p-12 rounded-[3rem] shadow-2xl border border-[#d4af37]/20">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-[#d4af37] text-[#080d1f] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                        <KeyRound size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-[#f0e6d3] mb-3 text-center">{t.title}</h1>
                    <p className="text-[#f0e6d3]/60 font-medium text-center leading-relaxed">{t.subtitle}</p>
                </div>

                {done ? (
                    <div className="text-center">
                        <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                        <p className="text-[#f0e6d3] font-bold mb-8">{t.success}</p>
                        <Link href={`/${locale}/vendor/login`} className="text-sm font-bold text-[#d4af37] hover:underline">{t.go_to_login}</Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="w-full p-4 bg-red-500/10 text-red-400 rounded-2xl text-sm font-bold border border-red-500/30 text-center">{error}</div>
                        )}
                        <div className="space-y-2 flex flex-col items-start">
                            <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest px-2">{t.password}</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#111a2f] border border-[#d4af37]/20 rounded-2xl px-6 py-4 text-[#f0e6d3] outline-none focus:ring-2 focus:ring-[#d4af37] transition-all"
                                placeholder="••••••••"
                                dir="ltr"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !token}
                            className="w-full bg-[#d4af37] text-[#080d1f] py-5 rounded-2xl text-lg font-bold shadow-xl hover:bg-[#e0bc4a] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : t.submit}
                        </button>
                    </form>
                )}
            </div>
        </main>
    );
}
