'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarCheck, MessageCircle, ShoppingCart, CheckCircle2, Send } from 'lucide-react';
import AppointmentModal from '@/components/AppointmentModal';
import QuantityStepper from '@/components/QuantityStepper';
import { createLead, cartCheckout, Vendor } from '@/lib/api';
import { useCart, CartItem } from '@/context/CartContext';
import { requireLogin } from '@/lib/requireLogin';

interface ProductActionButtonsProps {
    product: Omit<CartItem, 'quantity'>;
    title: string;
    locale: string;
    actionType: 'appointment' | 'contact';
    token: string;
    vendor?: Vendor | null;
    compact?: boolean;
    labels: {
        schedule: string;
        contact: string;
        scheduled: string;
        requestedOrDone: string;
        add_to_cart: string;
        send: string;
        decQty: string;
        incQty: string;
    };
}

export default function ProductActionButtons({ product, title, locale, actionType, token, vendor, compact, labels }: ProductActionButtonsProps) {
    const { items, addToCart, updateQuantity } = useCart();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [showModal, setShowModal] = useState(false);
    const [status, setStatus] = useState<'idle' | 'choosing' | 'submitting' | 'done'>('idle');
    const [contactQty, setContactQty] = useState(1);

    const currentPath = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;

    const cartQty = items.find((i) => i.id === product.id)?.quantity ?? 0;
    const sizeClass = compact ? '!text-sm' : '';
    const iconSize = compact ? 16 : 18;
    const stepperSize = compact ? 'sm' : 'md';

    // Only the fields CartItem actually declares — `product` can carry far more
    // (attributes, promotions, vendor, ratings…) when it's the same object a
    // listing/detail page already has in memory; the cart must never persist that.
    const cartSnapshot: Omit<CartItem, 'quantity'> = {
        id: product.id,
        vertical: product.vertical,
        title_he: product.title_he,
        title_en: product.title_en,
        title_fr: product.title_fr,
        title_yi: product.title_yi,
        image_url: product.image_url,
        price: product.price,
    };

    const addOneToCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        addToCart(cartSnapshot);
    };

    const handleContactSend = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!requireLogin(token, router, locale, currentPath)) return;
        setStatus('submitting');
        try {
            await cartCheckout(token, { items: [{ product_id: product.id, quantity: contactQty }], locale });
            setStatus('done');
        } catch {
            setStatus('choosing');
        }
    };

    const handleScheduled = async (date: Date) => {
        if (!requireLogin(token, router, locale, currentPath)) return;
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
        <>
            <div className="w-full flex flex-col gap-3">
                {status === 'done' ? (
                    <div className={`flex items-center gap-2 text-green-400 font-bold animate-fade-in ${sizeClass}`}>
                        <CheckCircle2 size={iconSize} />
                        {actionType === 'appointment' ? labels.scheduled : labels.requestedOrDone}
                    </div>
                ) : actionType === 'appointment' ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); if (requireLogin(token, router, locale, currentPath)) setShowModal(true); }}
                        disabled={status === 'submitting'}
                        className={`btn-primary w-full flex items-center justify-center gap-2 ${sizeClass} disabled:opacity-60`}
                    >
                        <CalendarCheck size={iconSize} />
                        {labels.schedule}
                    </button>
                ) : status === 'choosing' || status === 'submitting' ? (
                    <div className="w-full flex items-center justify-between gap-2 border border-[#f0e6d3]/30 rounded-2xl px-2 py-1.5 animate-fade-in">
                        <QuantityStepper
                            qty={contactQty}
                            decDisabled={status === 'submitting'}
                            incDisabled={status === 'submitting' || contactQty >= 99}
                            size={stepperSize}
                            decLabel={labels.decQty}
                            incLabel={labels.incQty}
                            onDec={(e) => {
                                e.stopPropagation();
                                if (contactQty <= 1) {
                                    setStatus('idle');
                                } else {
                                    setContactQty(contactQty - 1);
                                }
                            }}
                            onInc={(e) => { e.stopPropagation(); setContactQty(Math.min(99, contactQty + 1)); }}
                        />
                        <button
                            type="button"
                            onClick={handleContactSend}
                            disabled={status === 'submitting'}
                            className={`btn-primary !py-1.5 !px-3 flex items-center gap-1.5 ${sizeClass} disabled:opacity-60 shrink-0`}
                        >
                            <Send size={compact ? 13 : 15} />
                            {labels.send}
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={(e) => { e.stopPropagation(); if (requireLogin(token, router, locale, currentPath)) { setContactQty(1); setStatus('choosing'); } }}
                        className={`btn-primary w-full flex items-center justify-center gap-2 ${sizeClass}`}
                    >
                        <MessageCircle size={iconSize} />
                        {labels.contact}
                    </button>
                )}

                {cartQty === 0 ? (
                    <button
                        type="button"
                        onClick={addOneToCart}
                        className={`btn-secondary w-full flex items-center justify-center gap-2 ${sizeClass} animate-fade-in`}
                    >
                        <ShoppingCart size={iconSize} />
                        {labels.add_to_cart}
                    </button>
                ) : (
                    <div className="w-full flex items-center justify-center border border-[#f0e6d3]/30 rounded-2xl px-2 py-1.5 animate-fade-in">
                        <QuantityStepper
                            qty={cartQty}
                            decDisabled={cartQty <= 1}
                            incDisabled={cartQty >= 99}
                            size={stepperSize}
                            decLabel={labels.decQty}
                            incLabel={labels.incQty}
                            onDec={(e) => { e.stopPropagation(); updateQuantity(product.id, cartQty - 1); }}
                            onInc={addOneToCart}
                        />
                    </div>
                )}
            </div>

            {showModal && (
                <AppointmentModal
                    locale={locale}
                    productTitle={title}
                    vendor={vendor ?? null}
                    onClose={() => setShowModal(false)}
                    onConfirm={handleScheduled}
                />
            )}
        </>
    );
}
