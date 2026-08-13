'use client';

import { useState } from 'react';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { vendorForgotPassword } from '@/lib/api';
import Link from 'next/link';

interface T {
    title: string;
    subtitle: string;
    email: string;
    submit: string;
    success: string;
    back_to_login: string;
    error: string;
}

const translations: Record<string, T> = {
    he: { title: 'שכחת סיסמה?', subtitle: 'נשלח לך קישור לאיפוס הסיסמה למייל הכניסה שלך לפורטל הספקים', email: 'כתובת אימייל', submit: 'שלח קישור איפוס', success: 'אם הכתובת קיימת במערכת, קישור לאיפוס סיסמה נשלח אליה.', back_to_login: 'חזרה להתחברות', error: 'שגיאה בשליחת קישור האיפוס. נסה/י שוב בעוד מספר דקות.' },
    en: { title: 'Forgot Password?', subtitle: "We'll send a reset link to your vendor portal login email", email: 'Email Address', submit: 'Send Reset Link', success: 'If that email exists in our system, a reset link has been sent.', back_to_login: 'Back to login', error: 'Failed to send the reset link. Please try again in a few minutes.' },
    fr: { title: 'Mot de passe oublié ?', subtitle: 'Nous vous enverrons un lien de réinitialisation', email: 'E-mail', submit: 'Envoyer le lien', success: 'Si cet e-mail existe, un lien de réinitialisation a été envoyé.', back_to_login: 'Retour à la connexion', error: "Échec de l'envoi du lien. Veuillez réessayer dans quelques minutes." },
    yi: { title: 'פארגעסן סיסמה?', subtitle: 'מיר וועלן שיקן א לינק', email: 'ע-פאסט', submit: 'שיקן לינק', success: 'אויב די אימייל עקזיסטירט, איז א לינק געשיקט געווארן.', back_to_login: 'צוריק צו אריינלאגן', error: 'עס איז נישט געלונגען צו שיקן דעם לינק. פרובירט נאכאמאל שפעטער.' },
};

export default function VendorForgotPasswordPage() {
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const t = translations[locale] || translations.he;
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await vendorForgotPassword(email, locale);
            setDone(true);
        } catch {
            // The only realistic failures here (rate limit, network, 5xx) never carry a
            // meaningful single-string detail worth surfacing — always show the translated
            // generic message rather than an unlocalized fallback string from api.ts.
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
                        <Mail size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-[#f0e6d3] mb-3 text-center">{t.title}</h1>
                    <p className="text-[#f0e6d3]/60 font-medium text-center leading-relaxed">{t.subtitle}</p>
                </div>

                {done ? (
                    <div className="text-center">
                        <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                        <p className="text-[#f0e6d3] font-bold mb-8">{t.success}</p>
                        <Link href={`/${locale}/vendor/login`} className="text-sm font-bold text-[#d4af37] hover:underline">{t.back_to_login}</Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="w-full p-4 bg-red-500/10 text-red-400 rounded-2xl text-sm font-bold border border-red-500/30 text-center">{error}</div>
                        )}
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
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[#d4af37] text-[#080d1f] py-5 rounded-2xl text-lg font-bold shadow-xl hover:bg-[#e0bc4a] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : t.submit}
                        </button>
                        <div className="text-center pt-4">
                            <Link href={`/${locale}/vendor/login`} className="text-sm font-bold text-[#f0e6d3]/60 hover:text-[#d4af37]">{t.back_to_login}</Link>
                        </div>
                    </form>
                )}
            </div>
        </main>
    );
}
