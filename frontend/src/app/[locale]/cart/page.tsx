'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Trash2, ShoppingCart, MessageCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { cartCheckout, productImageUrl } from '@/lib/api';
import { useVerticals } from '@/lib/useVerticals';
import QuantityStepper from '@/components/QuantityStepper';

interface T {
    title: string;
    empty: string;
    browse: string;
    price_label: string;
    on_request: string;
    total: string;
    items_count: string;
    checkout: string;
    login_to_checkout: string;
    submitting: string;
    done: string;
    error: string;
    order_number: string;
    view_orders: string;
    dec_qty: string;
    inc_qty: string;
}

const translations: Record<string, T> = {
    he: { title: 'העגלה שלי', empty: 'העגלה שלך ריקה', browse: 'עיין במוצרים', price_label: 'מחיר', on_request: 'לפי בקשה', total: 'סה"כ', items_count: 'פריטים', checkout: 'צרו איתי קשר', login_to_checkout: 'התחבר כדי לשלוח בקשה', submitting: 'שולח...', done: 'הבקשה נשלחה! ניצור איתך קשר בקרוב', error: 'שגיאה בשליחת הבקשה, נסה שוב', order_number: 'מספר הזמנה', view_orders: 'צפה בהזמנות שלי', dec_qty: 'הפחת כמות', inc_qty: 'הוסף כמות' },
    en: { title: 'My Cart', empty: 'Your cart is empty', browse: 'Browse products', price_label: 'Price', on_request: 'On request', total: 'Total', items_count: 'items', checkout: 'Contact Me', login_to_checkout: 'Log in to check out', submitting: 'Sending...', done: 'Request sent! We will reach out shortly', error: 'Failed to submit, please try again', order_number: 'Order number', view_orders: 'View my orders', dec_qty: 'Decrease quantity', inc_qty: 'Increase quantity' },
    fr: { title: 'Mon panier', empty: 'Votre panier est vide', browse: 'Voir les produits', price_label: 'Prix', on_request: 'Sur demande', total: 'Total', items_count: 'articles', checkout: 'Me contacter', login_to_checkout: 'Connectez-vous pour valider', submitting: 'Envoi...', done: 'Demande envoyée ! Nous vous contacterons bientôt', error: "Échec de l'envoi, veuillez réessayer", order_number: 'Numéro de commande', view_orders: 'Voir mes commandes', dec_qty: 'Réduire la quantité', inc_qty: 'Augmenter la quantité' },
    yi: { title: 'מיין קארב', empty: 'דיין קארב איז ליידיג', browse: 'קוק אויף פראדוקטן', price_label: 'פרייז', on_request: 'אויף פארלאנג', total: 'סך הכל', items_count: 'פריטים', checkout: 'קאנטאקטירן מיר', login_to_checkout: 'לאגין צו באשטעטיגן', submitting: 'שיקט...', done: 'געשיקט! מיר וועלן זיך פארבינדן', error: 'טעות, פרובירט נאך אמאל', order_number: 'מספר הזמנה', view_orders: 'זע מיינע הזמנות', dec_qty: 'רעדוצירן כמות', inc_qty: 'פארמערן כמות' },
};

export default function CartPage() {
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const localeKey = locale as 'he' | 'en' | 'fr' | 'yi';
    const t = translations[locale] || translations.he;
    const { token } = useAuth();
    const verticals = useVerticals();
    const VERTICAL_LABEL: Record<string, string> = Object.fromEntries(verticals.map((v) => [v.slug, v.label_he]));
    const { items, totalCount, removeFromCart, updateQuantity, clearCart } = useCart();
    const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [orderNumber, setOrderNumber] = useState<string | null>(null);

    const totalPrice = items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);
    const hasOnRequestItem = items.some((i) => !i.price);

    const handleCheckout = async () => {
        if (!token || items.length === 0 || status === 'submitting') return;
        setStatus('submitting');
        setErrorMessage(null);
        try {
            const leads = await cartCheckout(token, {
                items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
                locale,
            });
            const orderId = leads?.[0]?.customer_order_id;
            setOrderNumber(orderId ? `ORD-${String(orderId).padStart(6, '0')}` : null);
            setStatus('done');
            clearCart();
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : null);
            setStatus('error');
        }
    };

    if (status === 'done') {
        return (
            <main className="min-h-screen bg-[#111a2f] py-16 px-6 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
                    <p className="text-[#f0e6d3] text-lg font-bold mb-3">{t.done}</p>
                    {orderNumber && (
                        <>
                            <p className="text-[#d4af37] font-black text-lg mb-2" dir="ltr">{t.order_number}: {orderNumber}</p>
                            <Link href={`/${locale}/profile#my-orders`} className="text-sm text-[#f0e6d3]/60 hover:text-[#d4af37] underline block mb-6">
                                {t.view_orders}
                            </Link>
                        </>
                    )}
                    <Link href={`/${locale}`} className="btn-primary inline-flex">{t.browse}</Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#111a2f] py-12 px-6">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-black text-[#f0e6d3] mb-8 flex items-center gap-3">
                    <ShoppingCart size={28} className="text-[#d4af37]" />
                    {t.title}
                    {totalCount > 0 && <span className="text-[#d4af37] text-xl">({totalCount})</span>}
                </h1>

                {items.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-[#f0e6d3]/50 text-lg mb-6">{t.empty}</p>
                        <Link href={`/${locale}`} className="btn-primary inline-flex">{t.browse}</Link>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4 mb-8">
                            {items.map((item) => {
                                const title = item[`title_${localeKey}`] || item.title_he;
                                return (
                                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-4">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#111a2f] shrink-0">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={productImageUrl(item.image_url)} alt={title || ''} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-[#f0e6d3] truncate">{title}</p>
                                                <p className="text-xs text-[#f0e6d3]/40">{VERTICAL_LABEL[item.vertical] || item.vertical}</p>
                                                <p className="text-[#d4af37] font-black mt-1">
                                                    {item.price ? `₪${item.price.toLocaleString()}` : t.on_request}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-4 sm:shrink-0">
                                            <div className="shrink-0">
                                                <QuantityStepper
                                                    qty={item.quantity}
                                                    size="sm"
                                                    decDisabled={item.quantity <= 1}
                                                    incDisabled={item.quantity >= 99}
                                                    decLabel={t.dec_qty}
                                                    incLabel={t.inc_qty}
                                                    onDec={() => updateQuantity(item.id, item.quantity - 1)}
                                                    onInc={() => updateQuantity(item.id, item.quantity + 1)}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                aria-label="הסר מהעגלה"
                                                onClick={() => removeFromCart(item.id)}
                                                className="text-[#f0e6d3]/30 hover:text-red-400 transition-colors shrink-0"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="border-t border-[#d4af37]/20 pt-6">
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-[#f0e6d3]/60 font-bold">{t.total} ({totalCount} {t.items_count})</span>
                                <span className="text-2xl font-black text-[#d4af37]">
                                    {totalPrice > 0 ? `₪${totalPrice.toLocaleString()}${hasOnRequestItem ? '+' : ''}` : t.on_request}
                                </span>
                            </div>

                            {status === 'error' && (
                                <p className="text-red-400 text-sm mb-3 text-center">{errorMessage || t.error}</p>
                            )}

                            {token ? (
                                <button
                                    onClick={handleCheckout}
                                    disabled={status === 'submitting'}
                                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {status === 'submitting' ? <Loader2 className="animate-spin" size={18} /> : <MessageCircle size={18} />}
                                    {status === 'submitting' ? t.submitting : t.checkout}
                                </button>
                            ) : (
                                <Link
                                    href={`/${locale}/login?redirect=/${locale}/cart`}
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    {t.login_to_checkout}
                                </Link>
                            )}
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
