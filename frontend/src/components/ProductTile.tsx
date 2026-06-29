'use client';

import { useState } from 'react';
import { CalendarCheck, MessageCircle, CheckCircle2 } from 'lucide-react';
import AppointmentModal from '@/components/AppointmentModal';
import { createLead } from '@/lib/api';

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

export default function ProductTile({ product, locale, actionType, token }: { product: Product; locale: string; actionType: 'appointment' | 'contact'; token: string }) {
    const [showModal, setShowModal] = useState(false);
    const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>('idle');
    const t = translations[locale] || translations.he;

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
        <div className="flex flex-col h-full bg-[#0e1628] rounded-2xl border border-[#d4af37]/20 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 text-start">
            <div className="h-48 w-full bg-[#111a2f] relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePath} alt={title} className="w-full h-full object-cover" />
            </div>

            <div className="p-6 flex flex-col flex-grow items-start text-start">
                <h3 className="text-xl font-bold text-[#f0e6d3] mb-2 line-clamp-1 w-full">{title}</h3>
                <p className="text-[#f0e6d3]/60 text-sm line-clamp-2 mb-6 leading-relaxed w-full font-light">{description}</p>

                <div className="mt-auto flex flex-col gap-4 w-full pt-4 border-t border-[#d4af37]/20">
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-black text-[#f0e6d3]/40 uppercase tracking-widest">{t.price_label}</span>
                        <span className="text-2xl font-black text-[#d4af37]">
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
        </div>
    );
}
