'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getProduct, getPromotionStatus, enterPromotion, createLead } from '@/lib/api';
import { PromotionBrief } from '@/components/ProductTile';
import AppointmentModal from '@/components/AppointmentModal';
import { CalendarCheck, MessageCircle, CheckCircle2, Loader2, Trophy, Users, Tag } from 'lucide-react';

interface PromotionStatus {
    promotion_id: number;
    type: string;
    name_he: string;
    participants_count: number;
    limit: number | null;
    remaining: number | null;
    is_full: boolean;
    is_closed: boolean;
    end_date: string | null;
    winner_name: string | null;
    has_entered: boolean;
}

type Locale = 'he' | 'en' | 'fr' | 'yi';

const T = {
    he: {
        schedule: 'קביעת פגישה', contact: 'יצירת קשר', price: 'מחיר', on_request: 'לפי בקשה',
        raffle_join: 'הגרל אותי', raffle_joined: '✓ נרשמת להגרלה', raffle_closed: 'ההגרלה הסתיימה',
        raffle_winner: 'הזוכה', raffle_you_won: '🏆 זכית!', raffle_participants: 'משתתפים רשומים',
        first_n_join: 'הצטרף למבצע', first_n_joined: '✓ מקומך שמור', first_n_full: 'כל המקומות אזלו',
        first_n_remaining: 'מקומות נותרו מתוך', done: 'הפנייה נשלחה ✓', scheduled: 'הפגישה נקבעה ✓',
        days: 'ימים', hours: 'שעות', minutes: 'דקות', seconds: 'שניות', promo_ends: 'ההגרלה נסגרת בעוד',
    },
    en: {
        schedule: 'Schedule Viewing', contact: 'Contact Me', price: 'Price', on_request: 'On request',
        raffle_join: 'Enter Raffle', raffle_joined: '✓ Entered raffle', raffle_closed: 'Raffle ended',
        raffle_winner: 'Winner', raffle_you_won: '🏆 You won!', raffle_participants: 'participants',
        first_n_join: 'Join Offer', first_n_joined: '✓ Spot reserved', first_n_full: 'All spots taken',
        first_n_remaining: 'spots remaining of', done: 'Request sent ✓', scheduled: 'Appointment booked ✓',
        days: 'd', hours: 'h', minutes: 'm', seconds: 's', promo_ends: 'Raffle closes in',
    },
    fr: {
        schedule: 'Planifier', contact: 'Contacter', price: 'Prix', on_request: 'Sur demande',
        raffle_join: 'Participer', raffle_joined: '✓ Inscrit', raffle_closed: 'Tirage terminé',
        raffle_winner: 'Gagnant', raffle_you_won: '🏆 Vous avez gagné!', raffle_participants: 'participants',
        first_n_join: "Rejoindre l'offre", first_n_joined: '✓ Place réservée', first_n_full: 'Complet',
        first_n_remaining: 'places restantes sur', done: 'Demande envoyée ✓', scheduled: 'Rendez-vous confirmé ✓',
        days: 'j', hours: 'h', minutes: 'm', seconds: 's', promo_ends: 'Le tirage se ferme dans',
    },
    yi: {
        schedule: 'מאכן א באגעגעניש', contact: 'קאנטאקטירן', price: 'פרייז', on_request: 'אויף פארלאנג',
        raffle_join: 'אריין אין גורל', raffle_joined: '✓ אריינגעשריבן', raffle_closed: 'גורל פארענדיגט',
        raffle_winner: 'געווינער', raffle_you_won: '🏆 דו האסט געווונען!', raffle_participants: 'טיילנעמער',
        first_n_join: 'צוטרעטן', first_n_joined: '✓ ארט פארזיכערט', first_n_full: 'אלע ערטער פארנומען',
        first_n_remaining: 'ערטער פון', done: 'פארשיקט ✓', scheduled: 'באשטעטיגט ✓',
        days: 'ט', hours: 'שע', minutes: 'מ', seconds: 'ס', promo_ends: 'גורל שליסט זיך אין',
    },
};

function useCountdown(endDate: string | null) {
    const [remaining, setRemaining] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
    const ref = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!endDate) return;
        const calc = () => {
            const diff = new Date(endDate).getTime() - Date.now();
            if (diff <= 0) { setRemaining({ d: 0, h: 0, m: 0, s: 0 }); return; }
            setRemaining({
                d: Math.floor(diff / 86400000),
                h: Math.floor((diff % 86400000) / 3600000),
                m: Math.floor((diff % 3600000) / 60000),
                s: Math.floor((diff % 60000) / 1000),
            });
        };
        calc();
        ref.current = setInterval(calc, 1000);
        return () => { if (ref.current) clearInterval(ref.current); };
    }, [endDate]);

    return remaining;
}

function CountdownDisplay({ endDate, locale }: { endDate: string; locale: Locale }) {
    const t = T[locale] || T.he;
    const rem = useCountdown(endDate);
    if (!rem) return null;
    return (
        <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[#f0e6d3]/60 text-sm">{t.promo_ends}</span>
            {[
                { val: rem.d, label: t.days },
                { val: rem.h, label: t.hours },
                { val: rem.m, label: t.minutes },
                { val: rem.s, label: t.seconds },
            ].map(({ val, label }) => (
                <div key={label} className="text-center bg-[#111a2f] rounded-xl px-3 py-2 min-w-[52px]">
                    <div className="text-xl font-black text-[#d4af37]">{String(val).padStart(2, '0')}</div>
                    <div className="text-[10px] text-[#f0e6d3]/40 uppercase">{label}</div>
                </div>
            ))}
        </div>
    );
}

function PromoZone({ promo, status, onEnter, locale }: {
    promo: PromotionBrief;
    status: PromotionStatus | null;
    onEnter: () => void;
    locale: Locale;
}) {
    const t = T[locale] || T.he;

    if (promo.type === 'raffle') {
        return (
            <div className="bg-[#111a2f] border border-[#d4af37]/30 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-[#d4af37] font-black text-lg">
                    <Tag size={20} /> {promo.name_he}
                </div>

                {status ? (
                    <>
                        <div className="flex items-center gap-2 text-[#f0e6d3]/70 text-sm">
                            <Users size={16} /> {status.participants_count} {t.raffle_participants}
                        </div>

                        {!status.is_closed && promo.end_date && (
                            <CountdownDisplay endDate={promo.end_date} locale={locale} />
                        )}

                        {status.is_closed ? (
                            <div className="space-y-2">
                                <p className="text-[#f0e6d3]/60 font-semibold">{t.raffle_closed}</p>
                                {status.winner_name && (
                                    <p className="text-[#d4af37] font-black text-lg">
                                        {t.raffle_winner}: {status.winner_name}
                                    </p>
                                )}
                                {status.has_entered && status.winner_name?.includes('') && (
                                    <p className="text-green-400 font-black">{t.raffle_you_won}</p>
                                )}
                            </div>
                        ) : status.has_entered ? (
                            <div className="flex items-center gap-2 text-green-400 font-bold">
                                <CheckCircle2 size={18} /> {t.raffle_joined}
                            </div>
                        ) : (
                            <button onClick={onEnter} className="btn-primary w-full flex items-center justify-center gap-2">
                                <Trophy size={18} /> {t.raffle_join}
                            </button>
                        )}
                    </>
                ) : (
                    <button onClick={onEnter} className="btn-primary w-full flex items-center justify-center gap-2">
                        <Trophy size={18} /> {t.raffle_join}
                    </button>
                )}
            </div>
        );
    }

    if (promo.type === 'first_n') {
        const limit = promo.config?.limit ?? 0;
        return (
            <div className="bg-[#111a2f] border border-[#d4af37]/30 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-[#d4af37] font-black text-lg">
                    <Tag size={20} /> {promo.name_he}
                </div>

                {status ? (
                    <>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm text-[#f0e6d3]/70">
                                <span>{status.remaining ?? 0} {t.first_n_remaining} {limit}</span>
                                <span>{status.participants_count}/{limit}</span>
                            </div>
                            <div className="w-full bg-[#0e1628] rounded-full h-2">
                                <div
                                    className="bg-[#d4af37] h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, (status.participants_count / (limit || 1)) * 100)}%` }}
                                />
                            </div>
                        </div>

                        {status.is_full ? (
                            <button disabled className="btn-primary w-full opacity-40 cursor-not-allowed">{t.first_n_full}</button>
                        ) : status.has_entered ? (
                            <div className="flex items-center gap-2 text-green-400 font-bold">
                                <CheckCircle2 size={18} /> {t.first_n_joined}
                            </div>
                        ) : (
                            <button onClick={onEnter} className="btn-primary w-full">{t.first_n_join}</button>
                        )}
                    </>
                ) : (
                    <button onClick={onEnter} className="btn-primary w-full">{t.first_n_join}</button>
                )}
            </div>
        );
    }

    return null;
}

export default function ProductDetailClient({ productId }: { productId: number }) {
    const params = useParams();
    const locale = ((params?.locale as string) || 'he') as Locale;
    const { token } = useAuth();
    const t = T[locale] || T.he;

    const [product, setProduct] = useState<any>(null);
    const [promoStatuses, setPromoStatuses] = useState<Record<number, PromotionStatus>>({});
    const [leadStatus, setLeadStatus] = useState<'idle' | 'submitting' | 'done'>('idle');
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        getProduct(token, productId)
            .then(setProduct)
            .finally(() => setLoading(false));
    }, [token, productId]);

    useEffect(() => {
        if (!token || !product) return;
        const interactive = (product.promotions || []).filter(
            (p: PromotionBrief) => p.type === 'raffle' || p.type === 'first_n'
        );
        interactive.forEach((p: PromotionBrief) => {
            getPromotionStatus(token, p.id)
                .then((s: PromotionStatus) => setPromoStatuses((prev) => ({ ...prev, [p.id]: s })))
                .catch(() => {});
        });
    }, [token, product]);

    const handleEnter = async (promo: PromotionBrief) => {
        if (!token || !product) return;
        try {
            await enterPromotion(token, promo.id, product.id);
            const s = await getPromotionStatus(token, promo.id);
            setPromoStatuses((prev) => ({ ...prev, [promo.id]: s }));
        } catch (err: any) {
            alert(err.message || 'שגיאה');
        }
    };

    const handleContact = async () => {
        if (!token || !product) return;
        setLeadStatus('submitting');
        try {
            await createLead(token, { product_id: product.id, locale });
            setLeadStatus('done');
        } catch { setLeadStatus('idle'); }
    };

    const handleScheduled = async (date: Date) => {
        if (!token || !product) return;
        setLeadStatus('submitting');
        try {
            await createLead(token, { product_id: product.id, scheduled_at: date.toISOString(), locale });
            setLeadStatus('done');
        } catch { setLeadStatus('idle'); }
        finally { setShowModal(false); }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#111a2f] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#d4af37]" size={40} />
            </div>
        );
    }

    if (!product) {
        return <div className="min-h-screen bg-[#111a2f] flex items-center justify-center text-[#f0e6d3]/40">מוצר לא נמצא</div>;
    }

    const locKey = locale as 'he' | 'en' | 'fr' | 'yi';
    const title = product[`title_${locKey}`] || product.title_he;
    const description = product[`description_${locKey}`] || product.description_he;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const imagePath = product.image_url ? `${basePath}/images/products/${product.image_url}` : `${basePath}/images/products/placeholder.jpg`;
    const actionType = product.vertical === 'diamonds' ? 'appointment' : 'contact';
    const interactivePromos: PromotionBrief[] = (product.promotions || []).filter(
        (p: PromotionBrief) => p.type === 'raffle' || p.type === 'first_n'
    );

    return (
        <main className="min-h-screen bg-[#111a2f] py-12 px-6">
            <div className="max-w-4xl mx-auto">
                <div className="grid md:grid-cols-2 gap-10">
                    {/* Image */}
                    <div className="rounded-3xl overflow-hidden h-80 md:h-auto bg-[#0e1628]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePath} alt={title} className="w-full h-full object-cover" />
                    </div>

                    {/* Details */}
                    <div className="flex flex-col gap-6">
                        <h1 className="text-3xl font-black text-[#f0e6d3]">{title}</h1>
                        <p className="text-[#f0e6d3]/60 leading-relaxed">{description}</p>

                        <div>
                            <span className="text-[10px] font-black text-[#f0e6d3]/40 uppercase tracking-widest">{t.price}</span>
                            <p className="text-3xl font-black text-[#d4af37]">
                                {product.price ? `₪${product.price.toLocaleString()}` : t.on_request}
                            </p>
                        </div>

                        {/* Appointment / Contact */}
                        <div className="border-t border-[#d4af37]/20 pt-4">
                            {leadStatus === 'done' ? (
                                <div className="flex items-center gap-2 text-green-400 font-bold">
                                    <CheckCircle2 size={18} />
                                    {actionType === 'appointment' ? t.scheduled : t.done}
                                </div>
                            ) : actionType === 'appointment' ? (
                                <button
                                    onClick={() => setShowModal(true)}
                                    disabled={leadStatus === 'submitting'}
                                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    <CalendarCheck size={18} /> {t.schedule}
                                </button>
                            ) : (
                                <button
                                    onClick={handleContact}
                                    disabled={leadStatus === 'submitting'}
                                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    <MessageCircle size={18} /> {t.contact}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Promotion zones */}
                {interactivePromos.length > 0 && (
                    <div className="mt-10 space-y-4">
                        {interactivePromos.map((promo) => (
                            <PromoZone
                                key={promo.id}
                                promo={promo}
                                status={promoStatuses[promo.id] ?? null}
                                onEnter={() => handleEnter(promo)}
                                locale={locale}
                            />
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <AppointmentModal
                    locale={locale}
                    productTitle={title}
                    onClose={() => setShowModal(false)}
                    onConfirm={handleScheduled}
                />
            )}
        </main>
    );
}
