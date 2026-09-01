'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Clock, Loader2, ShieldCheck, CreditCard } from 'lucide-react';
import { getOrderConfirmation, confirmOrder, OrderConfirmData } from '@/lib/api';
import { useCountdown } from '@/lib/useCountdown';

interface T {
    title: string;
    loading: string;
    not_found: string;
    item: string;
    qty: string;
    total: string;
    notes_from_admin: string;
    confirm_button: string;
    confirming: string;
    confirm_error: string;
    time_left: string;
    expired: string;
    already_confirmed: string;
    confirmed_message: string;
    cancelled_title: string;
    cancelled_message: string;
    payment_title: string;
    payment_placeholder: string;
    community: string;
    custom_note: string;
}

const translations: Record<string, T> = {
    he: {
        title: 'אישור הזמנה', loading: 'טוען...', not_found: 'קישור האישור לא נמצא או שאינו תקין',
        item: 'פריט', qty: 'כמות', total: 'סה"כ לתשלום', notes_from_admin: 'הערה מהצוות',
        confirm_button: 'אישור סופי של ההזמנה', confirming: 'מאשר...', confirm_error: 'שגיאה באישור ההזמנה',
        time_left: 'יש לאשר תוך', expired: 'תוקף האישור פג — ההזמנה תבוטל בקרוב',
        already_confirmed: 'ההזמנה כבר אושרה', confirmed_message: 'תודה! ההזמנה שלך אושרה סופית.',
        cancelled_title: 'ההזמנה בוטלה', cancelled_message: 'הזמנה זו בוטלה ואינה זמינה יותר לאישור.',
        payment_title: 'תשלום', payment_placeholder: 'אפשרות התשלום המקוונת תתווסף בקרוב. הצוות שלנו יצור איתך קשר להשלמת התשלום.',
        community: 'קהילה', custom_note: 'בקשות/מוצרים נוספים',
    },
    en: {
        title: 'Order Confirmation', loading: 'Loading...', not_found: 'This confirmation link was not found or is invalid',
        item: 'Item', qty: 'Qty', total: 'Total due', notes_from_admin: 'Note from our team',
        confirm_button: 'Confirm my order', confirming: 'Confirming...', confirm_error: 'Failed to confirm order',
        time_left: 'Confirm within', expired: 'The confirmation window has expired — this order will be cancelled soon',
        already_confirmed: 'Order already confirmed', confirmed_message: 'Thank you! Your order has been confirmed.',
        cancelled_title: 'Order cancelled', cancelled_message: 'This order was cancelled and is no longer available for confirmation.',
        payment_title: 'Payment', payment_placeholder: 'Online payment will be added soon. Our team will contact you to complete payment.',
        community: 'Community', custom_note: 'Additional items/requests',
    },
    fr: {
        title: 'Confirmation de commande', loading: 'Chargement...', not_found: "Ce lien de confirmation est introuvable ou invalide",
        item: 'Article', qty: 'Qté', total: 'Total à payer', notes_from_admin: 'Note de notre équipe',
        confirm_button: 'Confirmer ma commande', confirming: 'Confirmation...', confirm_error: 'Échec de la confirmation',
        time_left: 'À confirmer sous', expired: 'Le délai de confirmation a expiré — cette commande sera bientôt annulée',
        already_confirmed: 'Commande déjà confirmée', confirmed_message: 'Merci ! Votre commande a été confirmée.',
        cancelled_title: 'Commande annulée', cancelled_message: "Cette commande a été annulée et n'est plus disponible pour confirmation.",
        payment_title: 'Paiement', payment_placeholder: "Le paiement en ligne sera bientôt disponible. Notre équipe vous contactera pour finaliser le paiement.",
        community: 'Communauté', custom_note: 'Articles/demandes supplémentaires',
    },
    yi: {
        title: 'באשטעטיקן בעשטעלונג', loading: 'לאדט...', not_found: 'דער לינק איז נישט געפונען אדער נישט גילטיק',
        item: 'זאך', qty: 'כמות', total: 'סך הכל צו באצאלן', notes_from_admin: 'הערה פונעם צוות',
        confirm_button: 'באשטעטיקן מיין בעשטעלונג', confirming: 'באשטעטיקט...', confirm_error: 'טעות ביים באשטעטיקן',
        time_left: 'צו באשטעטיקן אינערהאלב', expired: 'די צייט איז אויסגעלאפן — די בעשטעלונג וועט באלד ווערן אָפּגעזאָגט',
        already_confirmed: 'שוין באשטעטיגט', confirmed_message: 'א דאנק! אײַער בעשטעלונג איז באשטעטיגט געוואָרן.',
        cancelled_title: 'בעשטעלונג אָפּגעזאָגט', cancelled_message: 'די בעשטעלונג איז אָפּגעזאָגט געוואָרן און איז מער נישט צוגענגלעך.',
        payment_title: 'צאלונג', payment_placeholder: 'אָנליין צאלונג וועט באלד צוגעלייגט ווערן. אונדזער צוות וועט זיך מיט אײַך פארבינדן.',
        community: 'קהילה', custom_note: 'נאך זאכן/פארלאנגען',
    },
};

export default function OrderConfirmClient() {
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const t = translations[locale] || translations.he;
    const searchParams = useSearchParams();
    const token = searchParams?.get('token') || '';

    const [data, setData] = useState<OrderConfirmData | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [confirmError, setConfirmError] = useState('');

    useEffect(() => {
        if (!token) { Promise.resolve().then(() => { setLoading(false); setNotFound(true); }); return; }
        getOrderConfirmation(token)
            .then(setData)
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [token]);

    const countdown = useCountdown(data?.status === 'awaiting_customer' ? data.confirmation_deadline : null);

    const handleConfirm = async () => {
        if (!token) return;
        setConfirming(true);
        setConfirmError('');
        try {
            const updated = await confirmOrder(token);
            setData(updated);
        } catch (err) {
            setConfirmError(err instanceof Error ? err.message : t.confirm_error);
        } finally {
            setConfirming(false);
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-[#111a2f] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#d4af37]" size={40} />
            </main>
        );
    }

    if (notFound || !data) {
        return (
            <main className="min-h-screen bg-[#111a2f] flex items-center justify-center px-6">
                <div className="text-center max-w-sm">
                    <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
                    <p className="text-[#f0e6d3] font-bold">{t.not_found}</p>
                </div>
            </main>
        );
    }

    const expired = data.status === 'awaiting_customer' && !countdown;

    return (
        <main className="min-h-screen bg-[#111a2f] py-12 px-6">
            <div className="max-w-xl mx-auto">
                <h1 className="text-2xl font-black text-[#f0e6d3] mb-1 flex items-center gap-2">
                    <ShieldCheck size={26} className="text-[#d4af37]" />
                    {t.title}
                </h1>
                <p className="text-[#d4af37] font-black text-lg mb-6" dir="ltr">{data.order_number}</p>

                {data.status === 'cancelled' && (
                    <div className="bg-[#0e1628] border border-red-500/30 rounded-2xl p-5 mb-6 flex items-start gap-3">
                        <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-[#f0e6d3]">{t.cancelled_title}</p>
                            <p className="text-sm text-[#f0e6d3]/60 mt-1">{t.cancelled_message}</p>
                        </div>
                    </div>
                )}

                {data.status === 'customer_confirmed' && (
                    <div className="bg-[#0e1628] border border-green-500/30 rounded-2xl p-5 mb-6 flex items-start gap-3">
                        <CheckCircle2 size={20} className="text-green-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-[#f0e6d3]">{t.already_confirmed}</p>
                            <p className="text-sm text-[#f0e6d3]/60 mt-1">{t.confirmed_message}</p>
                        </div>
                    </div>
                )}

                {data.status === 'awaiting_customer' && (
                    <div className={`rounded-2xl p-4 mb-6 flex items-center gap-2 ${expired ? 'bg-red-500/10 border border-red-500/30' : 'bg-[#d4af37]/10 border border-[#d4af37]/30'}`}>
                        <Clock size={16} className={expired ? 'text-red-400' : 'text-[#d4af37]'} />
                        {expired ? (
                            <span className="text-sm text-red-400 font-bold">{t.expired}</span>
                        ) : (
                            <span className="text-sm text-[#d4af37] font-bold" dir="ltr">
                                {t.time_left}: {countdown && `${String(countdown.h + countdown.d * 24).padStart(2, '0')}:${String(countdown.m).padStart(2, '0')}:${String(countdown.s).padStart(2, '0')}`}
                            </span>
                        )}
                    </div>
                )}

                {data.gabbai_community_name_snapshot && (
                    <p className="text-sm text-[#f0e6d3]/60 mb-4">
                        <strong className="text-[#f0e6d3]">{t.community}:</strong> {data.gabbai_community_name_snapshot}
                    </p>
                )}

                {/* Real prices — always shown here regardless of any per-vertical hide_prices toggle */}
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-hidden mb-6">
                    <table className="w-full text-sm">
                        <thead className="bg-[#111a2f] text-[#f0e6d3]/50 text-xs uppercase">
                            <tr>
                                <th className="p-3 text-start">{t.item}</th>
                                <th className="p-3 text-center">{t.qty}</th>
                                <th className="p-3 text-end">{t.total}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((item) => (
                                <tr key={item.id} className="border-t border-[#d4af37]/10">
                                    <td className="p-3">
                                        <p className="text-[#f0e6d3] font-semibold">{item.product_title_he || '—'}</p>
                                        {item.notes && (
                                            <p className="text-xs text-[#d4af37]/70 mt-0.5">{t.notes_from_admin}: {item.notes}</p>
                                        )}
                                    </td>
                                    <td className="p-3 text-center text-[#f0e6d3]/70">{item.quantity ?? 1}</td>
                                    <td className="p-3 text-end text-[#f0e6d3] font-bold" dir="ltr">
                                        {item.unit_price_snapshot != null ? `₪${(item.unit_price_snapshot * (item.quantity ?? 1)).toLocaleString()}` : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[#d4af37]/20 bg-[#111a2f]">
                        <span className="text-[#f0e6d3]/70 font-bold">{t.total}</span>
                        <span className="text-xl font-black text-[#d4af37]" dir="ltr">₪{data.total.toLocaleString()}</span>
                    </div>
                </div>

                {data.custom_items_note && (
                    <p className="text-sm text-[#f0e6d3]/60 mb-6">
                        <strong className="text-[#f0e6d3]">{t.custom_note}:</strong> {data.custom_items_note}
                    </p>
                )}

                {data.status === 'awaiting_customer' && !expired && (
                    <>
                        {confirmError && <p className="text-red-400 text-sm mb-3 text-center">{confirmError}</p>}
                        <button
                            onClick={handleConfirm}
                            disabled={confirming}
                            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 mb-6"
                        >
                            {confirming ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                            {confirming ? t.confirming : t.confirm_button}
                        </button>
                    </>
                )}

                {/* Payment — explicitly a placeholder, not built yet */}
                <div className="bg-[#0e1628]/60 border border-[#d4af37]/10 rounded-2xl p-4 flex items-start gap-3">
                    <CreditCard size={18} className="text-[#f0e6d3]/30 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-[#f0e6d3]/50">{t.payment_title}</p>
                        <p className="text-xs text-[#f0e6d3]/30 mt-0.5">{t.payment_placeholder}</p>
                    </div>
                </div>
            </div>
        </main>
    );
}
