'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, MessageCircle, CheckCircle2, ArrowLeft, X, Info } from 'lucide-react';
import AppointmentModal from '@/components/AppointmentModal';
import { createLead } from '@/lib/api';

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
}

const ATTR_LABELS: Record<string, Record<string, string>> = {
    carat:           { he: 'קרט',              en: 'Carat'        },
    cut:             { he: 'חיתוך',            en: 'Cut'          },
    color:           { he: 'צבע',              en: 'Color'        },
    clarity:         { he: 'ניקיון',           en: 'Clarity'      },
    shape:           { he: 'צורה',             en: 'Shape'        },
    brand:           { he: 'יצרן',             en: 'Brand'        },
    model:           { he: 'דגם',              en: 'Model'        },
    year:            { he: 'שנה',              en: 'Year'         },
    mileage:         { he: "ק\"מ",             en: 'Mileage'      },
    condition:       { he: 'מצב',              en: 'Condition'    },
    fuel:            { he: 'דלק',              en: 'Fuel'         },
    transmission:    { he: 'תיבת הילוכים',     en: 'Transmission' },
    insurance_type:  { he: 'סוג ביטוח',        en: 'Type'         },
    coverage:        { he: 'כיסוי',            en: 'Coverage'     },
    deductible:      { he: 'השתתפות עצמית',    en: 'Deductible'   },
    monthly_premium: { he: 'פרמיה חודשית',     en: 'Monthly'      },
};

function promotionLabel(promo: PromotionBrief): string {
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
}

const translations: Record<string, T> = {
    he: { schedule: 'קביעת פגישה', contact: 'יצירת קשר', requested: 'הפנייה נשלחה, ניצור איתך קשר בקרוב', scheduled: 'הפגישה נקבעה! אישור נשלח למייל', price_label: 'מחיר', on_request: 'לפי בקשה' },
    en: { schedule: 'Schedule Viewing', contact: 'Contact Me', requested: 'Request sent, we will reach out shortly', scheduled: 'Appointment booked! Confirmation sent to your email', price_label: 'Price', on_request: 'On request' },
    fr: { schedule: 'Planifier une visite', contact: 'Me contacter', requested: 'Demande envoyée, nous vous contacterons bientôt', scheduled: 'Rendez-vous confirmé ! Email envoyé', price_label: 'Prix', on_request: 'Sur demande' },
    yi: { schedule: 'מאכן א באגעגעניש', contact: 'קאנטאקטירן מיר', requested: 'געשיקט, מיר וועלן זיך פארבינדן', scheduled: 'באגעגעניש איז באשטעטיגט!', price_label: 'פרייז', on_request: 'אויף פארלאנג' },
};

const INTERACTIVE_TYPES = new Set(['raffle', 'first_n']);

const DETAIL_LABELS: Record<string, { details: string; close: string }> = {
    he: { details: 'פרטים נוספים', close: 'סגור' },
    en: { details: 'More Details', close: 'Close' },
    fr: { details: 'Plus de détails', close: 'Fermer' },
    yi: { details: 'מער פרטים', close: 'שליסן' },
};

export default function ProductTile({ product, locale, actionType, token }: { product: Product; locale: string; actionType: 'appointment' | 'contact'; token: string }) {
    const [showModal, setShowModal] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>('idle');
    const t = translations[locale] || translations.he;
    const dl = DETAIL_LABELS[locale] || DETAIL_LABELS.he;
    const hasInteractivePromo = product.promotions?.some((p) => INTERACTIVE_TYPES.has(p.type)) ?? false;

    const localeKey = locale as 'he' | 'en' | 'fr' | 'yi';
    const title = product[`title_${localeKey}`] || product.title_he;
    const description = product[`description_${localeKey}`] || product.description_he;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const imagePath = product.image_url ? `${basePath}/images/products/${product.image_url}` : `${basePath}/images/products/placeholder.jpg`;

    const handleContact = async () => {
        setStatus('submitting');
        try {
            await createLead(token, { product_id: product.id, scheduled_at: null, locale });
            setStatus('done');
        } catch {
            setStatus('idle');
        }
    };

    const handleScheduled = async (date: Date) => {
        setStatus('submitting');
        try {
            await createLead(token, { product_id: product.id, scheduled_at: date.toISOString(), locale });
            setStatus('done');
        } catch {
            setStatus('idle');
        } finally {
            setShowModal(false);
        }
    };

    return (
        <div className="group flex flex-col h-full bg-[#0e1628] rounded-2xl border border-[#d4af37]/20 overflow-hidden shadow-sm text-start"
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
            <div className="h-48 w-full bg-[#111a2f] relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePath} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080d1f]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {product.promotions && product.promotions.length > 0 && (
                    <span className="absolute top-3 right-3 bg-[#d4af37] text-[#080d1f] text-[11px] font-black px-2.5 py-1 rounded-full shadow-md tracking-wide animate-badge-float">
                        {promotionLabel(product.promotions[0])}
                    </span>
                )}
            </div>

            <div className="p-6 flex flex-col flex-grow items-start text-start">
                <h3 className="text-xl font-bold text-[#f0e6d3] mb-2 line-clamp-1 w-full">{title}</h3>
                <p className="text-[#f0e6d3]/60 text-sm line-clamp-2 mb-2 leading-relaxed w-full font-light">{description}</p>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowDetail(true); }}
                    className="flex items-center gap-1 text-[11px] text-[#d4af37]/60 hover:text-[#d4af37] transition-colors mb-4 font-semibold"
                >
                    <Info size={11} /> {dl.details}
                </button>

                <div className="mt-auto flex flex-col gap-4 w-full pt-4 border-t border-[#d4af37]/20">
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-black text-[#f0e6d3]/40 uppercase tracking-widest">{t.price_label}</span>
                        <span className="text-2xl font-black text-[#d4af37]">
                            {product.price ? `₪${product.price.toLocaleString()}` : t.on_request}
                        </span>
                    </div>

                    {hasInteractivePromo && (
                        <Link
                            href={`/${locale}/products/${product.id}`}
                            className="flex items-center justify-center gap-1.5 text-[#d4af37] text-sm font-bold hover:underline"
                        >
                            {locale === 'en' ? 'Details & Join' : locale === 'fr' ? 'Détails & Participer' : locale === 'yi' ? 'פרטים' : 'לפרטים והצטרפות'}
                            <ArrowLeft size={14} />
                        </Link>
                    )}

                    {status === 'done' ? (
                        <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                            <CheckCircle2 size={18} />
                            {actionType === 'appointment' ? t.scheduled : t.requested}
                        </div>
                    ) : actionType === 'appointment' ? (
                        <button
                            onClick={() => setShowModal(true)}
                            disabled={status === 'submitting'}
                            className="btn-primary w-full flex items-center justify-center gap-2 !text-sm disabled:opacity-60"
                        >
                            <CalendarCheck size={18} />
                            {t.schedule}
                        </button>
                    ) : (
                        <button
                            onClick={handleContact}
                            disabled={status === 'submitting'}
                            className="btn-primary w-full flex items-center justify-center gap-2 !text-sm disabled:opacity-60"
                        >
                            <MessageCircle size={18} />
                            {t.contact}
                        </button>
                    )}
                </div>
            </div>

            {showModal && (
                <AppointmentModal
                    locale={locale}
                    productTitle={title}
                    onClose={() => setShowModal(false)}
                    onConfirm={handleScheduled}
                />
            )}

            {showDetail && (
                <div
                    className="fixed inset-0 bg-black/75 z-[200] flex items-center justify-center p-4"
                    onClick={() => setShowDetail(false)}
                >
                    <div
                        className="bg-[#0e1628] border border-[#d4af37]/25 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="h-64 w-full bg-[#111a2f] relative overflow-hidden rounded-t-3xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imagePath} alt={title} className="w-full h-full object-cover" />
                            {product.promotions && product.promotions.length > 0 && (
                                <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                                    {product.promotions.map((promo) => (
                                        <span key={promo.id} className="bg-[#d4af37] text-[#080d1f] text-[11px] font-black px-2.5 py-1 rounded-full shadow-md">
                                            {promotionLabel(promo)}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <button
                                onClick={() => setShowDetail(false)}
                                className="absolute top-3 left-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                            >
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            <h2 className="text-2xl font-black text-[#f0e6d3] mb-3">{title}</h2>
                            <p className="text-[#f0e6d3]/70 text-sm leading-relaxed mb-4">{description}</p>

                            {product.attributes && Object.keys(product.attributes).length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mb-5">
                                    {Object.entries(product.attributes).map(([k, v]) => {
                                        if (v == null || v === '') return null;
                                        const label = ATTR_LABELS[k]?.[locale === 'en' ? 'en' : 'he'] || k;
                                        return (
                                            <div key={k} className="bg-[#111a2f] rounded-xl px-3 py-2">
                                                <p className="text-[10px] text-[#f0e6d3]/40 font-bold uppercase tracking-wider mb-0.5">{label}</p>
                                                <p className="text-sm font-semibold text-[#f0e6d3]">{String(v)}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="border-t border-[#d4af37]/15 pt-4 mb-6">
                                <span className="text-[10px] font-black text-[#f0e6d3]/40 uppercase tracking-widest block mb-1">{t.price_label}</span>
                                <span className="text-3xl font-black text-[#d4af37]">
                                    {product.price ? `₪${product.price.toLocaleString()}` : t.on_request}
                                </span>
                            </div>

                            {status === 'done' ? (
                                <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                                    <CheckCircle2 size={18} />
                                    {actionType === 'appointment' ? t.scheduled : t.requested}
                                </div>
                            ) : actionType === 'appointment' ? (
                                <button
                                    onClick={() => { setShowDetail(false); setShowModal(true); }}
                                    className="btn-primary w-full flex items-center justify-center gap-2 !text-sm"
                                >
                                    <CalendarCheck size={18} />
                                    {t.schedule}
                                </button>
                            ) : (
                                <button
                                    onClick={() => { handleContact(); setShowDetail(false); }}
                                    disabled={status === 'submitting'}
                                    className="btn-primary w-full flex items-center justify-center gap-2 !text-sm disabled:opacity-60"
                                >
                                    <MessageCircle size={18} />
                                    {t.contact}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
