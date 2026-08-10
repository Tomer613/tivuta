'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    getProduct, getPromotionStatus, enterPromotion, productImageUrl, getVerticals, Vertical,
    getFavoriteIds, addFavorite, removeFavorite, getProductReviews, submitReview, trackProductView,
    RecentlyViewedProduct,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { Product, PromotionBrief, promotionLabel } from '@/components/ProductTile';
import ProductActionButtons from '@/components/ProductActionButtons';
import { useAttrLabels } from '@/lib/useVerticals';
import { CheckCircle2, Loader2, Trophy, Users, Tag, ArrowRight, Heart, Share2, Star } from 'lucide-react';

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
    is_current_user_winner: boolean;
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
        add_to_cart: 'הוסף לסל', send: 'שלח', dec_qty: 'הפחת כמות', inc_qty: 'הוסף כמות',
        reviews: 'ביקורות', rate_product: 'דרגו את המוצר', comment_placeholder: 'הערה (אופציונלי)',
        submit_review: 'שלח דירוג', review_thanks: 'תודה על הדירוג!', add_fav: 'הוסף למועדפים', remove_fav: 'הסר מהמועדפים', share: 'שתף בווצאפ',
        specs: 'מפרט',
    },
    en: {
        schedule: 'Schedule Viewing', contact: 'Contact Me', price: 'Price', on_request: 'On request',
        raffle_join: 'Enter Raffle', raffle_joined: '✓ Entered raffle', raffle_closed: 'Raffle ended',
        raffle_winner: 'Winner', raffle_you_won: '🏆 You won!', raffle_participants: 'participants',
        first_n_join: 'Join Offer', first_n_joined: '✓ Spot reserved', first_n_full: 'All spots taken',
        first_n_remaining: 'spots remaining of', done: 'Request sent ✓', scheduled: 'Appointment booked ✓',
        days: 'd', hours: 'h', minutes: 'm', seconds: 's', promo_ends: 'Raffle closes in',
        add_to_cart: 'Add to Cart', send: 'Send', dec_qty: 'Decrease quantity', inc_qty: 'Increase quantity',
        reviews: 'Reviews', rate_product: 'Rate this product', comment_placeholder: 'Comment (optional)',
        submit_review: 'Submit', review_thanks: 'Thanks for rating!', add_fav: 'Add to favorites', remove_fav: 'Remove from favorites', share: 'Share on WhatsApp',
        specs: 'Specifications',
    },
    fr: {
        schedule: 'Planifier', contact: 'Contacter', price: 'Prix', on_request: 'Sur demande',
        raffle_join: 'Participer', raffle_joined: '✓ Inscrit', raffle_closed: 'Tirage terminé',
        raffle_winner: 'Gagnant', raffle_you_won: '🏆 Vous avez gagné!', raffle_participants: 'participants',
        first_n_join: "Rejoindre l'offre", first_n_joined: '✓ Place réservée', first_n_full: 'Complet',
        first_n_remaining: 'places restantes sur', done: 'Demande envoyée ✓', scheduled: 'Rendez-vous confirmé ✓',
        days: 'j', hours: 'h', minutes: 'm', seconds: 's', promo_ends: 'Le tirage se ferme dans',
        add_to_cart: 'Ajouter au panier', send: 'Envoyer', dec_qty: 'Réduire la quantité', inc_qty: 'Augmenter la quantité',
        reviews: 'Avis', rate_product: 'Évaluez ce produit', comment_placeholder: 'Commentaire (optionnel)',
        submit_review: 'Envoyer', review_thanks: 'Merci pour votre avis!', add_fav: 'Ajouter aux favoris', remove_fav: 'Retirer des favoris', share: 'Partager sur WhatsApp',
        specs: 'Caractéristiques',
    },
    yi: {
        schedule: 'מאכן א באגעגעניש', contact: 'קאנטאקטירן', price: 'פרייז', on_request: 'אויף פארלאנג',
        raffle_join: 'אריין אין גורל', raffle_joined: '✓ אריינגעשריבן', raffle_closed: 'גורל פארענדיגט',
        raffle_winner: 'געווינער', raffle_you_won: '🏆 דו האסט געווונען!', raffle_participants: 'טיילנעמער',
        first_n_join: 'צוטרעטן', first_n_joined: '✓ ארט פארזיכערט', first_n_full: 'אלע ערטער פארנומען',
        first_n_remaining: 'ערטער פון', done: 'פארשיקט ✓', scheduled: 'באשטעטיגט ✓',
        days: 'ט', hours: 'שע', minutes: 'מ', seconds: 'ס', promo_ends: 'גורל שליסט זיך אין',
        add_to_cart: 'צולייגן אין קארב', send: 'שיקן', dec_qty: 'רעדוצירן כמות', inc_qty: 'פארמערן כמות',
        reviews: 'ביקורות', rate_product: 'דרגירט דעם פראדוקט', comment_placeholder: 'הערה (אויף ווילן)',
        submit_review: 'שיקט דירוג', review_thanks: 'א דאנק פארן דירוג!', add_fav: 'צולייגן צו פאוואריטן', remove_fav: 'אראפנעמען פון פאוואריטן', share: 'טיילן אויף וואטסאפ',
        specs: 'מפרט',
    },
};

function StarRating({ rating, onChange }: { rating: number; onChange?: (v: number) => void }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} type="button" onClick={() => onChange?.(i)} className={onChange ? 'cursor-pointer' : 'cursor-default'}>
                    <Star size={16} fill={i <= rating ? '#d4af37' : 'none'} className={i <= rating ? 'text-[#d4af37]' : 'text-[#f0e6d3]/20'} />
                </button>
            ))}
        </div>
    );
}

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
                                {status.is_current_user_winner && (
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
    const router = useRouter();
    const t = T[locale] || T.he;

    const [product, setProduct] = useState<Product | null>(null);
    const [verticals, setVerticals] = useState<Vertical[]>([]);
    const [promoStatuses, setPromoStatuses] = useState<Record<number, PromotionStatus>>({});
    const [loading, setLoading] = useState(true);
    const [fav, setFav] = useState(false);
    const [favLoading, setFavLoading] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);
    const [myRating, setMyRating] = useState(0);
    const [myComment, setMyComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewDone, setReviewDone] = useState(false);
    const ATTR_LABELS = useAttrLabels();
    const productVertical = verticals.find((v) => v.slug === product?.vertical);

    const orderedAttrs = useMemo(() => {
        if (!product?.attributes) return [];
        const fieldOrder = (productVertical?.attribute_fields || []).map((f) => f.key);
        const entries = Object.entries(product.attributes).filter(([, v]) => v != null && v !== '');
        entries.sort((a, b) => {
            const ai = fieldOrder.indexOf(a[0]);
            const bi = fieldOrder.indexOf(b[0]);
            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        });
        return entries;
    }, [product, productVertical]);

    useEffect(() => {
        if (!token) return;
        Promise.all([getProduct(token, productId), getVerticals(), getFavoriteIds(token)])
            .then(([p, v, favIds]) => { setProduct(p); setVerticals(v); setFav(favIds.includes(productId)); })
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

    useEffect(() => {
        if (!product) return;
        getProductReviews(product.id).then(setReviews).catch(() => {});
        trackProductView(product.id);
        try {
            const key = 'tivuta_recent_v2';
            const raw = localStorage.getItem(key);
            const recent: RecentlyViewedProduct[] = raw ? JSON.parse(raw) : [];
            const snap = { id: product.id, title_he: product.title_he, image_url: product.image_url, price: product.price, vertical: product.vertical };
            const updated = [snap, ...recent.filter((s) => s.id !== product.id)].slice(0, 8);
            localStorage.setItem(key, JSON.stringify(updated));
        } catch { /* ignore */ }
    }, [product]);

    useEffect(() => {
        if (!product) return;
        const productTitle = product[`title_${locale}`] || product.title_he;
        const previous = document.title;
        document.title = `${productTitle} | Tivuta`;
        return () => { document.title = previous; };
    }, [product, locale]);

    const toggleFav = async () => {
        if (!token || !product || favLoading) return;
        setFavLoading(true);
        try {
            if (fav) {
                await removeFavorite(token, product.id);
                setFav(false);
            } else {
                await addFavorite(token, product.id);
                setFav(true);
            }
        } catch { /* ignore */ }
        setFavLoading(false);
    };

    const shareWhatsApp = () => {
        if (!product) return;
        const titleText = product[`title_${locale}`] || product.title_he;
        const price = product.price ? `₪${product.price.toLocaleString()}` : '';
        const productUrl = `https://tivuta.co.il/${locale}/products?id=${product.id}`;
        const text = encodeURIComponent(`${titleText}${price ? ' — ' + price : ''}\n${productUrl}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const handleEnter = async (promo: PromotionBrief) => {
        if (!token || !product) return;
        try {
            await enterPromotion(token, promo.id, product.id);
            const s = await getPromotionStatus(token, promo.id);
            setPromoStatuses((prev) => ({ ...prev, [promo.id]: s }));
        } catch (err) {
            alert(getErrorMessage(err, 'שגיאה'));
        }
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
    const imagePath = productImageUrl(product.image_url);
    const actionType = verticals.find((v) => v.slug === product.vertical)?.supports_appointments ? 'appointment' : 'contact';
    const interactivePromos: PromotionBrief[] = (product.promotions || []).filter(
        (p: PromotionBrief) => p.type === 'raffle' || p.type === 'first_n'
    );

    return (
        <main className="min-h-screen bg-[#111a2f] py-12 px-6">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => product ? router.push(`/${locale}/world?slug=${product.vertical}`) : router.back()}
                    className="flex items-center gap-1.5 text-[#f0e6d3]/40 hover:text-[#d4af37] transition-colors text-sm font-semibold mb-8"
                >
                    <ArrowRight size={16} />
                    {product ? verticals.find((v) => v.slug === product.vertical)?.label_he || 'חזרה' : 'חזרה'}
                </button>
                <div className="grid md:grid-cols-2 gap-10">
                    {/* Image */}
                    <div className="rounded-3xl overflow-hidden h-[420px] md:h-[560px] bg-[#0e1628] border border-[#d4af37]/20 relative shadow-2xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePath} alt={title} className="w-full h-full object-cover" />
                        {product.promotions && product.promotions.length > 0 && (
                            <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
                                {product.promotions.map((promo: PromotionBrief) => (
                                    <span key={promo.id} className="bg-[#d4af37] text-[#080d1f] text-xs font-black px-3 py-1.5 rounded-full shadow-md">
                                        {promotionLabel(promo)}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="absolute top-4 left-4 flex gap-2">
                            <button
                                type="button"
                                onClick={toggleFav}
                                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ${fav ? 'bg-red-500 text-white' : 'bg-black/60 text-white hover:bg-red-500'}`}
                                title={fav ? t.remove_fav : t.add_fav}
                            >
                                <Heart size={16} fill={fav ? 'currentColor' : 'none'} />
                            </button>
                            <button
                                type="button"
                                onClick={shareWhatsApp}
                                className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center shadow-md hover:bg-green-600 transition-colors"
                                title={t.share}
                            >
                                <Share2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="flex flex-col gap-6">
                        <h1 className="text-3xl font-black text-[#f0e6d3]">{title}</h1>
                        {product.avg_rating && (
                            <div className="flex items-center gap-1.5 -mt-4">
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <Star key={i} size={14} fill={i <= Math.round(product.avg_rating ?? 0) ? '#d4af37' : 'none'} className={i <= Math.round(product.avg_rating ?? 0) ? 'text-[#d4af37]' : 'text-[#f0e6d3]/20'} />
                                    ))}
                                </div>
                                <span className="text-[#d4af37] text-sm font-bold">{product.avg_rating}</span>
                                {product.review_count != null && product.review_count > 0 && (
                                    <span className="text-[#f0e6d3]/30 text-sm">({product.review_count})</span>
                                )}
                            </div>
                        )}
                        <p className="text-[#f0e6d3]/60 leading-relaxed">{description}</p>

                        {orderedAttrs.length > 0 && (
                            <div>
                                <h3 className="text-xs font-black text-[#d4af37]/70 uppercase tracking-widest mb-3 ps-1">{t.specs}</h3>
                                <div className="bg-[#111a2f] rounded-2xl border border-[#d4af37]/10 divide-y divide-[#d4af37]/10 overflow-hidden">
                                    {orderedAttrs.map(([k, v]) => {
                                        const field = productVertical?.attribute_fields?.find((f) => f.key === k);
                                        const label = ATTR_LABELS[k]?.[locale] || ATTR_LABELS[k]?.he || k;
                                        return (
                                            <div key={k} className="flex items-center justify-between gap-4 px-4 py-3">
                                                <span className="text-sm text-[#f0e6d3]/50 font-medium">{label}</span>
                                                {field?.type === 'select' ? (
                                                    <span className="text-xs font-bold text-[#d4af37] bg-[#d4af37]/10 px-3 py-1 rounded-full">{String(v)}</span>
                                                ) : (
                                                    <span className="text-sm font-bold text-[#f0e6d3]">{String(v)}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div>
                            <span className="text-[10px] font-black text-[#f0e6d3]/40 uppercase tracking-widest">{t.price}</span>
                            <p className="text-3xl font-black text-[#d4af37]">
                                {product.price ? `₪${product.price.toLocaleString()}` : t.on_request}
                            </p>
                        </div>

                        {/* Appointment / Contact */}
                        <div className="border-t border-[#d4af37]/20 pt-4">
                            <ProductActionButtons
                                product={product}
                                title={title}
                                locale={locale}
                                actionType={actionType}
                                token={token || ''}
                                vendor={product.vendor ?? null}
                                labels={{
                                    schedule: t.schedule,
                                    contact: t.contact,
                                    scheduled: t.scheduled,
                                    requestedOrDone: t.done,
                                    add_to_cart: t.add_to_cart,
                                    send: t.send,
                                    decQty: t.dec_qty,
                                    incQty: t.inc_qty,
                                }}
                            />
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

                {/* Reviews */}
                {reviews.length > 0 && (
                    <div className="mt-10 pt-8 border-t border-[#d4af37]/15">
                        <h4 className="text-sm font-black text-[#f0e6d3]/50 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Star size={13} className="text-[#d4af37]" />
                            {t.reviews}
                            <span className="text-[#d4af37]">({reviews.length})</span>
                        </h4>
                        <div className="grid md:grid-cols-2 gap-3">
                            {reviews.map((r: any) => (
                                <div key={r.id} className="bg-[#0e1628] border border-[#d4af37]/10 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-bold text-[#f0e6d3]/70">{r.user_name || 'משתמש'}</span>
                                        <StarRating rating={r.rating} />
                                    </div>
                                    {r.comment && <p className="text-sm text-[#f0e6d3]/50 leading-relaxed">{r.comment}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Submit review */}
                {token && !reviewDone && (
                    <div className="mt-6 pt-6 border-t border-[#d4af37]/10">
                        <p className="text-sm font-bold text-[#f0e6d3]/40 mb-2">{t.rate_product}</p>
                        <StarRating rating={myRating} onChange={setMyRating} />
                        {myRating > 0 && (
                            <div className="mt-3 space-y-2 max-w-md">
                                <textarea
                                    value={myComment}
                                    onChange={(e) => setMyComment(e.target.value)}
                                    placeholder={t.comment_placeholder}
                                    rows={2}
                                    className="w-full bg-[#111a2f] border border-[#d4af37]/20 rounded-xl px-3 py-2 text-sm text-[#f0e6d3] outline-none resize-none focus:border-[#d4af37]/50"
                                />
                                <button
                                    disabled={reviewSubmitting}
                                    onClick={async () => {
                                        if (!token || !product) return;
                                        setReviewSubmitting(true);
                                        try {
                                            const r = await submitReview(token, product.id, myRating, myComment);
                                            setReviews((prev) => [r, ...prev]);
                                            setReviewDone(true);
                                        } catch { /* ignore */ }
                                        setReviewSubmitting(false);
                                    }}
                                    className="btn-primary !py-2 !px-4 !text-sm"
                                >
                                    {t.submit_review}
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {reviewDone && <p className="text-sm text-green-400 font-bold mt-4">{t.review_thanks}</p>}
            </div>
        </main>
    );
}
