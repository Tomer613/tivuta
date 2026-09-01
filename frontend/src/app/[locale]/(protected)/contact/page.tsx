'use client';

import { Suspense, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Loader2, CheckCircle2, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { submitContactUs } from '@/lib/api';
import { getErrorMessage } from '@/lib/getErrorMessage';

interface T {
    title: string;
    subtitle: string;
    order_context: (orderId: string) => string;
    subject: string;
    message: string;
    submit: string;
    success_title: string;
    success_body: string;
    back_home: string;
}

const translations: Record<string, T> = {
    he: {
        title: 'צור קשר',
        subtitle: 'יש לך שאלה כללית? נשמח לעזור — נציג שלנו יחזור אליך בהקדם.',
        order_context: (orderId) => `לגבי הזמנה ${orderId}`,
        subject: 'נושא הפנייה',
        message: 'הודעה',
        submit: 'שלח פנייה',
        success_title: 'הפנייה נשלחה בהצלחה!',
        success_body: 'קיבלנו את הודעתך ונציג שלנו ייצור איתך קשר בהקדם.',
        back_home: 'חזרה לדף הבית',
    },
    en: {
        title: 'Contact Us',
        subtitle: "Have a general question? We're happy to help — a representative will get back to you shortly.",
        order_context: (orderId) => `Regarding order ${orderId}`,
        subject: 'Subject',
        message: 'Message',
        submit: 'Send Message',
        success_title: 'Your message was sent!',
        success_body: "We've received your message and a representative will contact you shortly.",
        back_home: 'Back to home',
    },
    fr: {
        title: 'Nous contacter',
        subtitle: 'Une question générale ? Un représentant vous recontactera sous peu.',
        order_context: (orderId) => `Concernant la commande ${orderId}`,
        subject: 'Sujet',
        message: 'Message',
        submit: 'Envoyer le message',
        success_title: 'Votre message a été envoyé !',
        success_body: 'Nous avons bien reçu votre message et vous recontacterons sous peu.',
        back_home: "Retour à l'accueil",
    },
    yi: {
        title: 'קאנטאקט אונדז',
        subtitle: 'האָבן א פֿראַגע? מיר וועלן זיך אָנרופֿן באַלד.',
        order_context: (orderId) => `וועגן דער בעשטעלונג ${orderId}`,
        subject: 'טעמע',
        message: 'מעלדונג',
        submit: 'שיקן מעלדונג',
        success_title: 'אײַער מעלדונג איז געשיקט!',
        success_body: 'מיר האָבן עס באַקומען און וועלן זיך אײַך אָנרופֿן באַלד.',
        back_home: 'צוריק אַהיים',
    },
};

function ContactUsForm() {
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const t = translations[locale] || translations.he;
    const { token } = useAuth();
    const searchParams = useSearchParams();
    const orderId = searchParams?.get('order') ? Number(searchParams.get('order')) : undefined;
    const orderDisplayNumber = orderId ? `ORD-${String(orderId).padStart(6, '0')}` : null;

    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        setIsLoading(true);
        setError(null);
        try {
            await submitContactUs(token, { subject, message, locale, order_id: orderId });
            setDone(true);
        } catch (err) {
            setError(getErrorMessage(err, locale === 'he' ? 'שגיאה בשליחת הפנייה' : 'Failed to send your message'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#111a2f] flex items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-md bg-[#0e1628]/80 backdrop-blur-xl p-6 sm:p-12 rounded-[3rem] shadow-2xl border border-white">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-[#1e3a8a] text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                        <MessageSquare size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-[#f0e6d3] mb-3 text-center">{t.title}</h1>
                    <p className="text-[#f0e6d3]/60 font-medium text-center leading-relaxed">{t.subtitle}</p>
                    {orderDisplayNumber && (
                        <p className="text-[#d4af37] font-bold text-sm mt-2" dir="ltr">{t.order_context(orderDisplayNumber)}</p>
                    )}
                </div>

                {done ? (
                    <div className="text-center">
                        <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                        <p className="text-[#f0e6d3] font-black mb-2">{t.success_title}</p>
                        <p className="text-[#f0e6d3]/60 text-sm mb-8">{t.success_body}</p>
                        <Link href={`/${locale}`} className="text-sm font-bold text-[#1e3a8a] hover:underline">{t.back_home}</Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="w-full p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 text-center">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2 flex flex-col items-start">
                            <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest px-2">{t.subject}</label>
                            <input
                                type="text"
                                required
                                maxLength={200}
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                            />
                        </div>
                        <div className="space-y-2 flex flex-col items-start">
                            <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest px-2">{t.message}</label>
                            <textarea
                                required
                                maxLength={5000}
                                rows={5}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all resize-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[#080d1f] text-white py-5 rounded-2xl text-lg font-bold shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    <span>{t.submit}</span>
                                    <Send size={20} />
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </main>
    );
}

export default function ContactUsPage() {
    return (
        <Suspense fallback={
            <main className="min-h-screen bg-[#111a2f] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#d4af37]" size={32} />
            </main>
        }>
            <ContactUsForm />
        </Suspense>
    );
}
