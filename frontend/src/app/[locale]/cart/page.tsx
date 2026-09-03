'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Trash2, ShoppingCart, MessageCircle, CheckCircle2, Loader2, Tag, History, Plus, ListChecks } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart, CartItem } from '@/context/CartContext';
import { cartCheckout, productImageUrl, getMyPurchaseHistory, getShoppingLists, createShoppingList, replaceShoppingList, PurchaseHistoryItem, ShoppingListSummary } from '@/lib/api';
import { useVerticals } from '@/lib/useVerticals';
import { computeEffectiveUnitPrice } from '@/lib/pricing';
import QuantityStepper from '@/components/QuantityStepper';

/** Combined quantity per quantity-discount bundle across the whole cart — mirrors the backend's
 *  own aggregation in POST /leads/cart-checkout (services/pricing.py), so the preview shown here
 *  matches what actually gets snapshotted at checkout time. */
function bundleAggregates(items: CartItem[]): Record<number, number> {
    const totals: Record<number, number> = {};
    for (const item of items) {
        if (item.quantity_discount_bundle_id != null) {
            totals[item.quantity_discount_bundle_id] = (totals[item.quantity_discount_bundle_id] || 0) + item.quantity;
        }
    }
    return totals;
}

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
    before_discount: string;
    savings: string;
    qty_discount_active: (percent: number) => string;
    qty_discount_more_needed: (count: number) => string;
    mixed_cart_blocked: string;
    gabbai_required: string;
    complete_gabbai_registration: string;
    custom_note_label: string;
    custom_note_placeholder: string;
    bought_before_title: string;
    add_short: string;
    save_as_shopping_list: (world: string) => string;
    save_as_shopping_list_confirm: (world: string) => string;
    save_as_shopping_list_saving: string;
    save_as_shopping_list_saved: string;
    save_as_shopping_list_error: string;
    save_choose_list: string;
    save_new_list_option: string;
    save_new_list_placeholder: string;
    save_confirm: string;
    cancel: string;
}

const translations: Record<string, T> = {
    he: { title: 'העגלה שלי', empty: 'העגלה שלך ריקה', browse: 'עיין במוצרים', price_label: 'מחיר', on_request: 'לפי בקשה', total: 'סה"כ', items_count: 'פריטים', checkout: 'צרו איתי קשר', login_to_checkout: 'התחבר כדי לשלוח בקשה', submitting: 'שולח...', done: 'הבקשה נשלחה! ניצור איתך קשר בקרוב', error: 'שגיאה בשליחת הבקשה, נסה שוב', order_number: 'מספר הזמנה', view_orders: 'צפה בהזמנות שלי', dec_qty: 'הפחת כמות', inc_qty: 'הוסף כמות', before_discount: 'לפני הנחה', savings: 'חיסכון', qty_discount_active: (p) => `✓ מבצע כמות הופעל (${p}% הנחה)`, qty_discount_more_needed: (n) => `עוד ${n} יח' ותקבלו הנחת כמות`, mixed_cart_blocked: 'לא ניתן להזמין פריטי קידושים יחד עם פריטים מעולם אחר באותה הזמנה — יש להסיר חלק מהפריטים ולהזמין בנפרד.', gabbai_required: 'הזמנה מעולם זה מיועדת לגבאים בלבד.', complete_gabbai_registration: 'להשלמת רישום כגבאי', custom_note_label: 'מוצרים/בקשות נוספים (אופציונלי)', custom_note_placeholder: 'יש לנו צורך גם ב...', bought_before_title: 'קנית בעבר, אולי תרצה גם:', add_short: 'הוסף', save_as_shopping_list: (w) => `שמור כרשימת הקניות שלי ל${w}`, save_as_shopping_list_confirm: (w) => `פעולה זו תחליף את רשימת הקניות הקיימת שלך ל${w} בתוכן העגלה הנוכחי. להמשיך?`, save_as_shopping_list_saving: 'שומר...', save_as_shopping_list_saved: '✓ נשמר', save_as_shopping_list_error: 'שגיאה בשמירה', save_choose_list: 'שמור לרשימה:', save_new_list_option: '+ שמור כרשימה חדשה', save_new_list_placeholder: 'שם הרשימה החדשה', save_confirm: 'שמור', cancel: 'ביטול' },
    en: { title: 'My Cart', empty: 'Your cart is empty', browse: 'Browse products', price_label: 'Price', on_request: 'On request', total: 'Total', items_count: 'items', checkout: 'Contact Me', login_to_checkout: 'Log in to check out', submitting: 'Sending...', done: 'Request sent! We will reach out shortly', error: 'Failed to submit, please try again', order_number: 'Order number', view_orders: 'View my orders', dec_qty: 'Decrease quantity', inc_qty: 'Increase quantity', before_discount: 'Before discount', savings: 'Savings', qty_discount_active: (p) => `✓ Quantity discount applied (${p}% off)`, qty_discount_more_needed: (n) => `${n} more unit(s) for a quantity discount`, mixed_cart_blocked: 'Kiddush items cannot be ordered together with items from another world — remove some items and order separately.', gabbai_required: 'Ordering from this world is for registered gabbaim only.', complete_gabbai_registration: 'Complete gabbai registration', custom_note_label: 'Additional items/requests (optional)', custom_note_placeholder: 'We also need...', bought_before_title: 'You bought these before — maybe again?', add_short: 'Add', save_as_shopping_list: (w) => `Save as my ${w} shopping list`, save_as_shopping_list_confirm: (w) => `This will replace your existing ${w} shopping list with the current cart's contents. Continue?`, save_as_shopping_list_saving: 'Saving...', save_as_shopping_list_saved: '✓ Saved', save_as_shopping_list_error: 'Failed to save', save_choose_list: 'Save to list:', save_new_list_option: '+ Save as new list', save_new_list_placeholder: 'New list name', save_confirm: 'Save', cancel: 'Cancel' },
    fr: { title: 'Mon panier', empty: 'Votre panier est vide', browse: 'Voir les produits', price_label: 'Prix', on_request: 'Sur demande', total: 'Total', items_count: 'articles', checkout: 'Me contacter', login_to_checkout: 'Connectez-vous pour valider', submitting: 'Envoi...', done: 'Demande envoyée ! Nous vous contacterons bientôt', error: "Échec de l'envoi, veuillez réessayer", order_number: 'Numéro de commande', view_orders: 'Voir mes commandes', dec_qty: 'Réduire la quantité', inc_qty: 'Augmenter la quantité', before_discount: 'Avant remise', savings: 'Économie', qty_discount_active: (p) => `✓ Remise quantité appliquée (${p}%)`, qty_discount_more_needed: (n) => `Encore ${n} unité(s) pour une remise quantité`, mixed_cart_blocked: "Les articles de kiddouch ne peuvent pas être commandés avec des articles d'un autre monde — retirez certains articles et commandez séparément.", gabbai_required: 'La commande dans ce monde est réservée aux gabbaïm inscrits.', complete_gabbai_registration: "Compléter l'inscription en tant que gabbaï", custom_note_label: 'Articles/demandes supplémentaires (optionnel)', custom_note_placeholder: 'Nous avons aussi besoin de...', bought_before_title: 'Vous avez déjà acheté ceci — à nouveau ?', add_short: 'Ajouter', save_as_shopping_list: (w) => `Enregistrer comme ma liste de courses ${w}`, save_as_shopping_list_confirm: (w) => `Cela remplacera votre liste de courses ${w} existante par le contenu actuel du panier. Continuer ?`, save_as_shopping_list_saving: 'Enregistrement...', save_as_shopping_list_saved: '✓ Enregistré', save_as_shopping_list_error: "Échec de l'enregistrement", save_choose_list: 'Enregistrer dans :', save_new_list_option: '+ Enregistrer comme nouvelle liste', save_new_list_placeholder: 'Nom de la nouvelle liste', save_confirm: 'Enregistrer', cancel: 'Annuler' },
    yi: { title: 'מיין קארב', empty: 'דיין קארב איז ליידיג', browse: 'קוק אויף פראדוקטן', price_label: 'פרייז', on_request: 'אויף פארלאנג', total: 'סך הכל', items_count: 'פריטים', checkout: 'קאנטאקטירן מיר', login_to_checkout: 'לאגין צו באשטעטיגן', submitting: 'שיקט...', done: 'געשיקט! מיר וועלן זיך פארבינדן', error: 'טעות, פרובירט נאך אמאל', order_number: 'מספר הזמנה', view_orders: 'זע מיינע הזמנות', dec_qty: 'רעדוצירן כמות', inc_qty: 'פארמערן כמות', before_discount: 'פאר הנחה', savings: 'שפּאָרן', qty_discount_active: (p) => `✓ מבצע כמות אקטיוו (${p}% הנחה)`, qty_discount_more_needed: (n) => `נאך ${n} יח' פאר א הנחת כמות`, mixed_cart_blocked: 'מ\'קען נישט באשטעלן קידוש זאכן צוזאמען מיט זאכן פון אן אנדער וועלט — מוז אנטפערנען עטלעכע זאכן און באשטעלן באזונדער.', gabbai_required: 'באשטעלונג פון דער וועלט איז נאר פאר רעגיסטרירטע גבאים.', complete_gabbai_registration: 'פֿאַרענדיקן רעגיסטראציע אלס גבאי', custom_note_label: 'נאך זאכן/פארלאנגען (אויסוואל)', custom_note_placeholder: 'מיר דארפן אויך...', bought_before_title: 'איר האט דאס שוין געקויפט - אפשר נאך אמאל?', add_short: 'צוגעבן', save_as_shopping_list: (w) => `אפּשפּאַרן אלס מיין ${w} קוילע רשימה`, save_as_shopping_list_confirm: (w) => `דאס וועט פארבייטן דיין איצטיקע ${w} קוילע רשימה מיטן אינהאלט פונעם קארב. ווייטער?`, save_as_shopping_list_saving: 'שפּאַרט...', save_as_shopping_list_saved: '✓ אפּגעשפּאַרט', save_as_shopping_list_error: 'טעות ביים שפּאַרן', save_choose_list: 'אפּשפּאַרן צו רשימה:', save_new_list_option: '+ אפּשפּאַרן אלס נייע רשימה', save_new_list_placeholder: 'נאמען פון נייע רשימה', save_confirm: 'אפּשפּאַרן', cancel: 'אָפּזאָגן' },
};

export default function CartPage() {
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const localeKey = locale as 'he' | 'en' | 'fr' | 'yi';
    const t = translations[locale] || translations.he;
    const { token, user } = useAuth();
    const verticals = useVerticals();
    const VERTICAL_LABEL: Record<string, string> = Object.fromEntries(verticals.map((v) => [v.slug, v.label_he]));
    const verticalsBySlug = Object.fromEntries(verticals.map((v) => [v.slug, v]));
    const { items, totalCount, addToCart, removeFromCart, updateQuantity, clearCart } = useCart();
    const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [orderNumber, setOrderNumber] = useState<string | null>(null);
    const [savedSummary, setSavedSummary] = useState<{ original: number; paid: number } | null>(null);
    const [customNote, setCustomNote] = useState('');
    const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryItem[]>([]);
    const [savingListVertical, setSavingListVertical] = useState<string | null>(null);
    const [listSaveResult, setListSaveResult] = useState<{ vertical: string; ok: boolean } | null>(null);
    // When a world has 2+ existing lists, save-as-shopping-list opens this inline picker instead
    // of guessing which list to overwrite — see the plan's confirmed UX decision.
    const [savePickerVertical, setSavePickerVertical] = useState<string | null>(null);
    const [savePickerLists, setSavePickerLists] = useState<ShoppingListSummary[]>([]);
    const [saveTargetListId, setSaveTargetListId] = useState<number | 'new'>('new');
    const [saveNewListName, setSaveNewListName] = useState('');

    // "Bought before" strip — a lightweight cross-sell, not part of the checkout flow itself.
    // Fetched once per visit; only ever shown for a logged-in user.
    useEffect(() => {
        if (!token) { Promise.resolve().then(() => setPurchaseHistory([])); return; }
        getMyPurchaseHistory(token).then(setPurchaseHistory);
    }, [token]);

    const inCartIds = new Set(items.map((i) => i.id));
    const recommendations = purchaseHistory.filter((h) => !inCartIds.has(h.product_id)).slice(0, 4);

    const addRecommendationToCart = (rec: PurchaseHistoryItem) => {
        addToCart({
            id: rec.product_id,
            vertical: rec.product_vertical,
            title_he: rec.product_title_he,
            title_en: rec.product_title_en,
            title_fr: rec.product_title_fr,
            title_yi: rec.product_title_yi,
            image_url: rec.product_image_url,
            price: rec.product_price,
            sale_price: rec.product_sale_price,
            quantity_discount_bundle_id: rec.quantity_discount_bundle_id ?? null,
            quantity_discount_tiers: rec.quantity_discount_tiers ?? null,
        });
    };

    // See Vertical.requires_gabbai / allows_custom_items_note — a cart mixing a gabbai-required
    // world (e.g. kiddush) with an ordinary one can't be checked out as one order (mirrors the
    // backend's own _resolve_orderer_context guard in POST /leads/cart-checkout).
    const hasGabbaiRequiredItem = items.some((i) => verticalsBySlug[i.vertical]?.requires_gabbai);
    const hasOrdinaryItem = items.some((i) => !verticalsBySlug[i.vertical]?.requires_gabbai);
    const mixedCartBlocked = hasGabbaiRequiredItem && hasOrdinaryItem;
    const needsGabbaiRegistration = hasGabbaiRequiredItem && !user?.is_gabbai;
    const allowsCustomNote = items.some((i) => verticalsBySlug[i.vertical]?.allows_custom_items_note);
    // Vertical.hide_prices — real prices still checkout/snapshot normally server-side, this only
    // suppresses the *display* here (same treatment an on-request/null-price item already gets).
    const isHiddenPrice = (item: CartItem) => !!verticalsBySlug[item.vertical]?.hide_prices;

    // "Save current cart as my shopping list" — one distinct vertical at a time (a shopping list
    // is per-vertical, see Vertical.enables_shopping_list), so a mixed-vertical cart shows one
    // button per eligible world rather than one that tries to save everything at once.
    const shoppingListVerticalsInCart = Array.from(new Set(items.map((i) => i.vertical)))
        .filter((v) => verticalsBySlug[v]?.enables_shopping_list);

    const saveItemsToList = async (vertical: string, listId: number) => {
        setSavingListVertical(vertical);
        try {
            const verticalItems = items
                .filter((i) => i.vertical === vertical)
                .map((i) => ({ product_id: i.id, quantity: i.quantity }));
            await replaceShoppingList(token!, listId, verticalItems);
            setListSaveResult({ vertical, ok: true });
            setSavePickerVertical(null);
        } catch {
            setListSaveResult({ vertical, ok: false });
        } finally {
            setSavingListVertical(null);
        }
    };

    // Entry point: GET /shopping-lists always auto-creates+seeds at least one list server-side
    // (see shopping_list.py), so a genuinely first-ever save always sees lists.length === 1 —
    // there is no reachable "0 lists" case here. What actually distinguishes "nothing to lose,
    // skip the confirm" from "this would overwrite real content" is whether that one list already
    // has items, not how many lists exist. With 2+ lists, an inline picker opens instead of
    // guessing which one to replace.
    const handleSaveAsShoppingList = async (vertical: string) => {
        if (!token) return;
        setSavingListVertical(vertical);
        setListSaveResult(null);
        try {
            const lists = await getShoppingLists(token, vertical);
            if (lists.length === 1) {
                if (lists[0].item_count === 0) {
                    await saveItemsToList(vertical, lists[0].id);
                } else {
                    const worldLabel = VERTICAL_LABEL[vertical] || vertical;
                    if (!window.confirm(t.save_as_shopping_list_confirm(worldLabel))) { setSavingListVertical(null); return; }
                    await saveItemsToList(vertical, lists[0].id);
                }
            } else {
                setSavePickerVertical(vertical);
                setSavePickerLists(lists);
                setSaveTargetListId(lists[0].id);
                setSaveNewListName('');
                setSavingListVertical(null);
            }
        } catch {
            setListSaveResult({ vertical, ok: false });
            setSavingListVertical(null);
        }
    };

    const confirmSaveFromPicker = async () => {
        if (!savePickerVertical || !token) return;
        const vertical = savePickerVertical;
        if (saveTargetListId === 'new') {
            const worldLabel = VERTICAL_LABEL[vertical] || vertical;
            setSavingListVertical(vertical);
            try {
                const created = await createShoppingList(token, vertical, saveNewListName.trim() || worldLabel);
                await saveItemsToList(vertical, created.id);
            } catch {
                setListSaveResult({ vertical, ok: false });
                setSavingListVertical(null);
            }
        } else {
            const targetList = savePickerLists.find((l) => l.id === saveTargetListId);
            if (!window.confirm(t.save_as_shopping_list_confirm(targetList?.name || vertical))) return;
            await saveItemsToList(vertical, saveTargetListId);
        }
    };

    // Pre-checkout preview only — the server independently recomputes and stores the
    // authoritative snapshot at checkout time (see services/pricing.py); this is display only.
    const aggregates = bundleAggregates(items);
    const priced = items.map((item) => ({
        item,
        eff: computeEffectiveUnitPrice(
            item.price,
            item.sale_price,
            item.quantity_discount_tiers,
            item.quantity_discount_bundle_id != null ? (aggregates[item.quantity_discount_bundle_id] || 0) : 0
        ),
    }));
    const totalPrice = priced.reduce((sum, { item, eff }) => sum + (isHiddenPrice(item) ? 0 : (eff.unitPrice ?? 0) * item.quantity), 0);
    const originalTotal = items.reduce((sum, i) => sum + (isHiddenPrice(i) ? 0 : (i.price || 0) * i.quantity), 0);
    const totalSavings = Math.max(0, originalTotal - totalPrice);
    const hasOnRequestItem = items.some((i) => !i.price || isHiddenPrice(i));

    const handleCheckout = async () => {
        if (!token || items.length === 0 || status === 'submitting' || mixedCartBlocked || needsGabbaiRegistration) return;
        setStatus('submitting');
        setErrorMessage(null);
        try {
            const leads = await cartCheckout(token, {
                items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
                locale,
                custom_items_note: allowsCustomNote && customNote.trim() ? customNote.trim() : undefined,
            });
            const orderId = leads?.[0]?.customer_order_id;
            setOrderNumber(orderId ? `ORD-${String(orderId).padStart(6, '0')}` : null);
            // The success screen shows the real, server-computed numbers (not the pre-checkout
            // estimate above) — guarantees what's displayed matches what actually got persisted.
            const original = leads.reduce((sum, l) => sum + (l.list_price_snapshot ?? 0) * (l.quantity ?? 1), 0);
            const paid = leads.reduce((sum, l) => sum + (l.unit_price_snapshot ?? 0) * (l.quantity ?? 1), 0);
            setSavedSummary(original > paid ? { original, paid } : null);
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
                    {savedSummary && (
                        <p className="text-green-400 font-bold text-sm mb-3">
                            {t.savings}: ₪{Math.round(savedSummary.original - savedSummary.paid).toLocaleString()}
                        </p>
                    )}
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

                {recommendations.length > 0 && (
                    <div className="mb-8">
                        <p className="text-sm font-bold text-[#f0e6d3]/60 flex items-center gap-2 mb-3">
                            <History size={15} className="text-[#d4af37]" />
                            {t.bought_before_title}
                        </p>
                        <div className="flex gap-3 overflow-x-auto pb-1">
                            {recommendations.map((rec) => {
                                const title = rec[`product_title_${localeKey}`] || rec.product_title_he;
                                return (
                                    <div key={rec.product_id} className="shrink-0 w-32 bg-[#0e1628] border border-[#d4af37]/20 rounded-xl p-2.5">
                                        <div className="w-full h-20 rounded-lg overflow-hidden bg-[#111a2f] mb-2">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={productImageUrl(rec.product_image_url)} alt={title || ''} className="w-full h-full object-cover" />
                                        </div>
                                        <p className="text-xs font-bold text-[#f0e6d3] truncate">{title}</p>
                                        <p className="text-[#d4af37] text-xs font-black mb-2">
                                            {verticalsBySlug[rec.product_vertical]?.hide_prices || !rec.product_price
                                                ? t.on_request
                                                : `₪${rec.product_price.toLocaleString()}`}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => addRecommendationToCart(rec)}
                                            className="w-full flex items-center justify-center gap-1 text-[11px] font-bold text-[#d4af37] border border-[#d4af37]/40 rounded-lg py-1.5 hover:bg-[#d4af37]/10 transition-colors"
                                        >
                                            <Plus size={11} /> {t.add_short}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {items.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-[#f0e6d3]/50 text-lg mb-6">{t.empty}</p>
                        <Link href={`/${locale}`} className="btn-primary inline-flex">{t.browse}</Link>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4 mb-8">
                            {priced.map(({ item, eff }) => {
                                const title = item[`title_${localeKey}`] || item.title_he;
                                const hasDiscount = eff.unitPrice != null && eff.listPrice != null && eff.unitPrice < eff.listPrice;
                                const bundleQty = item.quantity_discount_bundle_id != null ? (aggregates[item.quantity_discount_bundle_id] || 0) : 0;
                                const nextTier = (item.quantity_discount_tiers || [])
                                    .filter((tr) => tr.min_quantity > bundleQty)
                                    .sort((a, b) => a.min_quantity - b.min_quantity)[0];
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
                                                {isHiddenPrice(item) ? (
                                                    <p className="text-[#d4af37] font-black mt-1">{t.on_request}</p>
                                                ) : hasDiscount ? (
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <span className="text-xs text-[#f0e6d3]/40 line-through">₪{eff.listPrice!.toLocaleString()}</span>
                                                        <span className="text-[#d4af37] font-black">₪{eff.unitPrice!.toLocaleString()}</span>
                                                    </div>
                                                ) : (
                                                    <p className="text-[#d4af37] font-black mt-1">
                                                        {item.price ? `₪${item.price.toLocaleString()}` : t.on_request}
                                                    </p>
                                                )}
                                                {item.quantity_discount_bundle_id != null && item.quantity_discount_tiers && item.quantity_discount_tiers.length > 0 && (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <Tag size={10} className="text-[#d4af37]/60 shrink-0" />
                                                        <span className={`text-[11px] ${eff.discountPercent > 0 ? 'text-green-400/80' : 'text-[#f0e6d3]/40'}`}>
                                                            {eff.discountPercent > 0
                                                                ? t.qty_discount_active(eff.discountPercent)
                                                                : nextTier ? t.qty_discount_more_needed(nextTier.min_quantity - bundleQty) : null}
                                                        </span>
                                                    </div>
                                                )}
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

                        {shoppingListVerticalsInCart.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-8">
                                {shoppingListVerticalsInCart.map((v) => {
                                    const worldLabel = VERTICAL_LABEL[v] || v;
                                    const saving = savingListVertical === v;
                                    const result = listSaveResult?.vertical === v ? listSaveResult : null;
                                    if (savePickerVertical === v) {
                                        return (
                                            <div key={v} className="w-full flex flex-wrap items-center gap-2 bg-[#0e1628] border border-[#d4af37]/30 rounded-xl px-3 py-2">
                                                <span className="text-xs text-[#f0e6d3]/60">{t.save_choose_list}</span>
                                                <select
                                                    value={saveTargetListId}
                                                    onChange={(e) => setSaveTargetListId(e.target.value === 'new' ? 'new' : Number(e.target.value))}
                                                    className="bg-[#111a2f] border border-[#d4af37]/20 rounded-lg px-2 py-1 text-xs text-[#f0e6d3]"
                                                >
                                                    {savePickerLists.map((lst) => (
                                                        <option key={lst.id} value={lst.id}>{lst.name}</option>
                                                    ))}
                                                    <option value="new">{t.save_new_list_option}</option>
                                                </select>
                                                {saveTargetListId === 'new' && (
                                                    <input
                                                        type="text"
                                                        value={saveNewListName}
                                                        onChange={(e) => setSaveNewListName(e.target.value)}
                                                        placeholder={t.save_new_list_placeholder}
                                                        maxLength={100}
                                                        className="bg-[#111a2f] border border-[#d4af37]/20 rounded-lg px-2 py-1 text-xs text-[#f0e6d3] flex-1 min-w-[8rem]"
                                                    />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={confirmSaveFromPicker}
                                                    disabled={saving}
                                                    className="text-xs font-bold text-[#111a2f] bg-[#d4af37] rounded-lg px-3 py-1 hover:bg-[#e8c757] transition-colors disabled:opacity-60"
                                                >
                                                    {saving ? <Loader2 size={13} className="animate-spin" /> : t.save_confirm}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSavePickerVertical(null)}
                                                    disabled={saving}
                                                    className="text-xs text-[#f0e6d3]/40 hover:text-red-400"
                                                >
                                                    {t.cancel}
                                                </button>
                                            </div>
                                        );
                                    }
                                    return (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => handleSaveAsShoppingList(v)}
                                            disabled={saving}
                                            className="flex items-center gap-1.5 text-xs font-bold text-[#d4af37]/80 border border-[#d4af37]/30 rounded-xl px-3 py-2 hover:bg-[#d4af37]/10 transition-colors disabled:opacity-60"
                                        >
                                            {saving ? <Loader2 size={13} className="animate-spin" /> : <ListChecks size={13} />}
                                            {saving
                                                ? t.save_as_shopping_list_saving
                                                : result?.ok
                                                    ? t.save_as_shopping_list_saved
                                                    : result && !result.ok
                                                        ? t.save_as_shopping_list_error
                                                        : t.save_as_shopping_list(worldLabel)}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="border-t border-[#d4af37]/20 pt-6">
                            {totalSavings > 0 && (
                                <div className="space-y-1 mb-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[#f0e6d3]/40">{t.before_discount}</span>
                                        <span className="text-[#f0e6d3]/40 line-through">₪{originalTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-green-400/80 font-bold">{t.savings}</span>
                                        <span className="text-green-400 font-bold">‑₪{Math.round(totalSavings).toLocaleString()}</span>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-[#f0e6d3]/60 font-bold">{t.total} ({totalCount} {t.items_count})</span>
                                <span className="text-2xl font-black text-[#d4af37]">
                                    {totalPrice > 0 ? `₪${totalPrice.toLocaleString()}${hasOnRequestItem ? '+' : ''}` : t.on_request}
                                </span>
                            </div>

                            {status === 'error' && (
                                <p className="text-red-400 text-sm mb-3 text-center">{errorMessage || t.error}</p>
                            )}

                            {mixedCartBlocked && (
                                <p className="text-red-400 text-sm mb-3 text-center">{t.mixed_cart_blocked}</p>
                            )}

                            {!mixedCartBlocked && allowsCustomNote && (
                                <div className="mb-4">
                                    <label className="text-xs text-[#f0e6d3]/50 mb-1 block">{t.custom_note_label}</label>
                                    <textarea
                                        value={customNote}
                                        onChange={(e) => setCustomNote(e.target.value)}
                                        placeholder={t.custom_note_placeholder}
                                        rows={2}
                                        className="w-full bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-3 text-sm text-[#f0e6d3] resize-none"
                                    />
                                </div>
                            )}

                            {mixedCartBlocked ? null : !token ? (
                                <Link
                                    href={`/${locale}/login?redirect=/${locale}/cart`}
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    {t.login_to_checkout}
                                </Link>
                            ) : needsGabbaiRegistration ? (
                                <div className="text-center">
                                    <p className="text-[#f0e6d3]/60 text-sm mb-3">{t.gabbai_required}</p>
                                    <Link
                                        href={`/${locale}/profile#gabbai-registration`}
                                        className="btn-primary w-full flex items-center justify-center gap-2"
                                    >
                                        {t.complete_gabbai_registration}
                                    </Link>
                                </div>
                            ) : (
                                <button
                                    onClick={handleCheckout}
                                    disabled={status === 'submitting'}
                                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {status === 'submitting' ? <Loader2 className="animate-spin" size={18} /> : <MessageCircle size={18} />}
                                    {status === 'submitting' ? t.submitting : t.checkout}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
