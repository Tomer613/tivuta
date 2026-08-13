'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Info, Heart, Share2, Star, Clock } from 'lucide-react';
import { addFavorite, removeFavorite, productImageUrl, Vendor } from '@/lib/api';
import { shareProductOnWhatsApp } from '@/lib/share';
import ProductActionButtons from '@/components/ProductActionButtons';
import { useCountdown } from '@/lib/useCountdown';

export interface PromotionBrief {
    id: number;
    name_he: string;
    type: string;
    channel: string;
    config: Record<string, any>;
    end_date?: string | null;
}

export interface Product {
    id: number;
    vertical: string;
    title_he: string;
    title_en?: string | null;
    title_fr?: string | null;
    title_yi?: string | null;
    description_he: string;
    description_en?: string | null;
    description_fr?: string | null;
    description_yi?: string | null;
    image_url?: string | null;
    price?: number | null;
    attributes?: Record<string, any> | null;
    promotions?: PromotionBrief[];
    avg_rating?: number | null;
    review_count?: number;
    view_count?: number;
    popularity_score?: number;
    vendor?: Vendor | null;
    vendor_id?: number | null;
    category?: { id: number; label_he: string; label_en?: string | null; is_active?: boolean } | null;
    category_id?: number | null;
    is_active?: boolean;
}

export function promotionLabel(promo: PromotionBrief): string {
    const c = promo.config || {};
    switch (promo.type) {
        case 'first_n': return `${c.limit ?? ''} ראשונים`;
        case 'raffle': return 'הגרלה';
        case 'percentage_discount': return `${c.percentage ?? ''}% הנחה`;
        case 'fixed_discount': return `₪${c.amount ?? ''} הנחה`;
        case 'flash_sale': return 'פלאש סייל';
        default: return promo.name_he;
    }
}

interface T {
    schedule: string;
    contact: string;
    requested: string;
    scheduled: string;
    price_label: string;
    on_request: string;
    add_to_cart: string;
    send: string;
    dec_qty: string;
    inc_qty: string;
}

const translations: Record<string, T> = {
    he: { schedule: 'קביעת פגישה', contact: 'יצירת קשר', requested: 'הפנייה נשלחה, ניצור איתך קשר בקרוב', scheduled: 'הפגישה נקבעה! אישור נשלח למייל', price_label: 'מחיר', on_request: 'לפי בקשה', add_to_cart: 'הוסף לסל', send: 'שלח', dec_qty: 'הפחת כמות', inc_qty: 'הוסף כמות' },
    en: { schedule: 'Schedule Viewing', contact: 'Contact Me', requested: 'Request sent, we will reach out shortly', scheduled: 'Appointment booked! Confirmation sent to your email', price_label: 'Price', on_request: 'On request', add_to_cart: 'Add to Cart', send: 'Send', dec_qty: 'Decrease quantity', inc_qty: 'Increase quantity' },
    fr: { schedule: 'Planifier une visite', contact: 'Me contacter', requested: 'Demande envoyée, nous vous contacterons bientôt', scheduled: 'Rendez-vous confirmé ! Email envoyé', price_label: 'Prix', on_request: 'Sur demande', add_to_cart: 'Ajouter au panier', send: 'Envoyer', dec_qty: 'Réduire la quantité', inc_qty: 'Augmenter la quantité' },
    yi: { schedule: 'מאכן א באגעגעניש', contact: 'קאנטאקטירן מיר', requested: 'געשיקט, מיר וועלן זיך פארבינדן', scheduled: 'באגעגעניש איז באשטעטיגט!', price_label: 'פרייז', on_request: 'אויף פארלאנג', add_to_cart: 'צולייגן אין קארב', send: 'שיקן', dec_qty: 'רעדוצירן כמות', inc_qty: 'פארמערן כמות' },
};

function FlashCountdown({ endDate, locale }: { endDate: string; locale: string }) {
    const r = useCountdown(endDate);
    if (!r) return <span className="text-xs text-red-400 font-bold">המבצע הסתיים</span>;
    const label = locale === 'en' ? 'ends in' : locale === 'fr' ? 'se termine dans' : 'נגמר בעוד';
    return (
        <div className="flex items-center gap-1.5 mt-1">
            <Clock size={11} className="text-[#d4af37]" />
            <span className="text-[10px] text-[#f0e6d3]/50">{label}</span>
            <span className="text-[11px] font-black text-[#d4af37] tabular-nums">
                {r.d > 0 && `${r.d}י `}{String(r.h).padStart(2,'0')}:{String(r.m).padStart(2,'0')}:{String(r.s).padStart(2,'0')}
            </span>
        </div>
    );
}

const DETAIL_LABELS: Record<string, { details: string }> = {
    he: { details: 'פרטים נוספים' },
    en: { details: 'More Details' },
    fr: { details: 'Plus de détails' },
    yi: { details: 'מער פרטים' },
};

export default function ProductTile({ product, locale, actionType, token, isFav = false }: { product: Product; locale: string; actionType: 'appointment' | 'contact'; token: string; isFav?: boolean }) {
    const [fav, setFav] = useState(isFav);
    const [favLoading, setFavLoading] = useState(false);
    const t = translations[locale] || translations.he;
    const dl = DETAIL_LABELS[locale] || DETAIL_LABELS.he;
    const flashPromo = product.promotions?.find((p) => p.type === 'flash_sale' && p.end_date);
    const detailHref = `/${locale}/products?id=${product.id}`;

    const toggleFav = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (favLoading) return;
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

    const shareWhatsApp = (e: React.MouseEvent) => {
        e.stopPropagation();
        shareProductOnWhatsApp(product, locale as 'he' | 'en' | 'fr' | 'yi');
    };

    const localeKey = locale as 'he' | 'en' | 'fr' | 'yi';
    const title = product[`title_${localeKey}`] || product.title_he;
    const description = product[`description_${localeKey}`] || product.description_he;
    const imagePath = productImageUrl(product.image_url);

    return (
        <div className="group flex flex-col h-full bg-[#0e1628] rounded-2xl border border-[#d4af37]/20 overflow-hidden shadow-sm text-start"
            data-testid={`product-tile-${product.id}`}
            style={{ transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s ease, border-color 0.3s ease' }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-8px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 24px 60px rgba(212,175,55,0.2), 0 4px 16px rgba(0,0,0,0.4)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,175,55,0.55)';
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = '';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                (e.currentTarget as HTMLDivElement).style.borderColor = '';
            }}
        >
            <div className="h-40 sm:h-48 w-full bg-[#111a2f] relative overflow-hidden">
                <Link href={detailHref} className="absolute inset-0 block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePath} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080d1f]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Link>
                {product.promotions && product.promotions.length > 0 && (
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                        <span className="bg-[#d4af37] text-[#080d1f] text-[11px] font-black px-2.5 py-1 rounded-full shadow-md tracking-wide animate-badge-float">
                            {promotionLabel(product.promotions[0])}
                        </span>
                        {flashPromo && flashPromo.end_date && (
                            <div className="bg-[#080d1f]/85 backdrop-blur-sm rounded-full px-2 py-0.5">
                                <FlashCountdown endDate={flashPromo.end_date} locale={locale} />
                            </div>
                        )}
                    </div>
                )}
                {/* Action buttons — top left */}
                <div className="absolute top-2 left-2 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                    <button
                        type="button"
                        onClick={toggleFav}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors ${fav ? 'bg-red-500 text-white' : 'bg-black/60 text-white hover:bg-red-500'}`}
                        title={fav ? 'הסר מהמועדפים' : 'הוסף למועדפים'}
                    >
                        <Heart size={14} fill={fav ? 'currentColor' : 'none'} />
                    </button>
                    <button
                        type="button"
                        onClick={shareWhatsApp}
                        className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center shadow-md hover:bg-green-600 transition-colors"
                        title="שתף בווצאפ"
                    >
                        <Share2 size={14} />
                    </button>
                </div>
            </div>

            <div className="p-4 sm:p-6 flex flex-col flex-grow items-start text-start">
                <Link href={detailHref} className="contents">
                    <h3 className="text-xl font-bold text-[#f0e6d3] mb-2 line-clamp-1 w-full hover:text-[#d4af37] transition-colors">{title}</h3>
                    <p className="text-[#f0e6d3]/60 text-sm line-clamp-2 mb-2 leading-relaxed w-full font-light">{description}</p>
                </Link>
                {product.avg_rating && (
                    <div className="flex items-center gap-1.5 mb-2">
                        <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => (
                                <Star key={i} size={12} fill={i <= Math.round(product.avg_rating!) ? '#d4af37' : 'none'} className={i <= Math.round(product.avg_rating!) ? 'text-[#d4af37]' : 'text-[#f0e6d3]/20'} />
                            ))}
                        </div>
                        <span className="text-[#d4af37] text-xs font-bold">{product.avg_rating}</span>
                        {product.review_count != null && product.review_count > 0 && (
                            <span className="text-[#f0e6d3]/30 text-xs">({product.review_count})</span>
                        )}
                    </div>
                )}
                <Link
                    href={detailHref}
                    className="flex items-center gap-1 text-[11px] text-[#d4af37]/60 hover:text-[#d4af37] transition-colors mb-4 font-semibold"
                >
                    <Info size={11} /> {dl.details}
                </Link>

                <div className="mt-auto flex flex-col gap-4 w-full pt-4 border-t border-[#d4af37]/20">
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-black text-[#f0e6d3]/40 uppercase tracking-widest">{t.price_label}</span>
                        <span className="text-2xl font-black text-[#d4af37]">
                            {product.price ? `₪${product.price.toLocaleString()}` : t.on_request}
                        </span>
                    </div>

                    <ProductActionButtons
                        product={product}
                        title={title}
                        locale={locale}
                        actionType={actionType}
                        token={token}
                        vendor={product.vendor}
                        compact
                        labels={{
                            schedule: t.schedule,
                            contact: t.contact,
                            scheduled: t.scheduled,
                            requestedOrDone: t.requested,
                            add_to_cart: t.add_to_cart,
                            send: t.send,
                            decQty: t.dec_qty,
                            incQty: t.inc_qty,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
