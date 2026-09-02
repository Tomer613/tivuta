'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ListChecks, Trash2, RotateCcw, Search, Plus, ShoppingCart, CheckSquare, Square, Pencil, Check, X, LayoutList } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useVerticals } from '@/lib/useVerticals';
import { getErrorMessage } from '@/lib/getErrorMessage';
import QuantityStepper from '@/components/QuantityStepper';
import { computeEffectiveUnitPrice } from '@/lib/pricing';
import {
    getShoppingLists, createShoppingList, getShoppingListDetail, renameShoppingList, deleteShoppingList,
    refreshShoppingList, addShoppingListItem, updateShoppingListItem, removeShoppingListItem,
    getProducts, getMyPurchaseHistory, productImageUrl, ShoppingListItem, ShoppingListSummary, PurchaseHistoryItem,
} from '@/lib/api';
import { Product } from '@/components/ProductTile';

interface T {
    title: string;
    empty: string;
    select_all: string;
    deselect_all: string;
    refresh_from_history: string;
    add_product: string;
    search_placeholder: string;
    add_to_cart: string;
    no_selection: string;
    dec_qty: string;
    inc_qty: string;
    remove: string;
    on_request: string;
    back_to_world: string;
    loading_error: string;
    estimated_total: string;
    last_ordered: (date: string) => string;
    rename_list: string;
    list_name_placeholder: string;
    save_name: string;
    cancel: string;
    choose_list: string;
    all_my_lists: string;
    new_list: string;
    new_list_short: string;
    create: string;
    delete_list: string;
    delete_list_confirm: (name: string) => string;
    items_label: string;
}

const translations: Record<string, T> = {
    he: { title: 'רשימת הקניות שלי', empty: 'רשימת הקניות ריקה — הוסף מוצרים למטה.', select_all: 'סמן הכל', deselect_all: 'בטל הכל', refresh_from_history: 'הוסף פריטים נוספים מההיסטוריה', add_product: 'הוסף מוצר', search_placeholder: 'חיפוש מוצר...', add_to_cart: 'הוסף לסל', no_selection: 'לא נבחרו פריטים', dec_qty: 'הפחת כמות', inc_qty: 'הוסף כמות', remove: 'הסר', on_request: 'לפי בקשה', back_to_world: 'חזרה לעולם', loading_error: 'שגיאה בטעינת הרשימה', estimated_total: 'סה"כ משוער', last_ordered: (d) => `הוזמן לאחרונה ב-${d}`, rename_list: 'שנה שם לרשימה', list_name_placeholder: 'לדוגמה: רשימת קידוש רגילה', save_name: 'שמור', cancel: 'ביטול', choose_list: 'בחר רשימה', all_my_lists: 'כל הרשימות שלי', new_list: '+ רשימה חדשה', new_list_short: '+ צור רשימה נוספת', create: 'צור', delete_list: 'מחק רשימה', delete_list_confirm: (n) => `למחוק את הרשימה "${n}"? לא ניתן לשחזר פעולה זו.`, items_label: 'פריטים' },
    en: { title: 'My Shopping List', empty: 'Your shopping list is empty — add products below.', select_all: 'Select all', deselect_all: 'Deselect all', refresh_from_history: 'Add more items from my history', add_product: 'Add product', search_placeholder: 'Search product...', add_to_cart: 'Add to cart', no_selection: 'No items selected', dec_qty: 'Decrease quantity', inc_qty: 'Increase quantity', remove: 'Remove', on_request: 'On request', back_to_world: 'Back to world', loading_error: 'Failed to load list', estimated_total: 'Estimated total', last_ordered: (d) => `Last ordered on ${d}`, rename_list: 'Rename list', list_name_placeholder: 'e.g. Regular Kiddush order', save_name: 'Save', cancel: 'Cancel', choose_list: 'Choose a list', all_my_lists: 'All my lists', new_list: '+ New list', new_list_short: '+ Create another list', create: 'Create', delete_list: 'Delete list', delete_list_confirm: (n) => `Delete the list "${n}"? This cannot be undone.`, items_label: 'items' },
    fr: { title: 'Ma liste de courses', empty: 'Votre liste de courses est vide — ajoutez des produits ci-dessous.', select_all: 'Tout sélectionner', deselect_all: 'Tout désélectionner', refresh_from_history: 'Ajouter plus d’articles depuis mon historique', add_product: 'Ajouter un produit', search_placeholder: 'Rechercher un produit...', add_to_cart: 'Ajouter au panier', no_selection: 'Aucun article sélectionné', dec_qty: 'Réduire la quantité', inc_qty: 'Augmenter la quantité', remove: 'Retirer', on_request: 'Sur demande', back_to_world: 'Retour au monde', loading_error: 'Échec du chargement de la liste', estimated_total: 'Total estimé', last_ordered: (d) => `Dernière commande le ${d}`, rename_list: 'Renommer la liste', list_name_placeholder: 'ex. Commande de kiddouch habituelle', save_name: 'Enregistrer', cancel: 'Annuler', choose_list: 'Choisir une liste', all_my_lists: 'Toutes mes listes', new_list: '+ Nouvelle liste', new_list_short: '+ Créer une autre liste', create: 'Créer', delete_list: 'Supprimer la liste', delete_list_confirm: (n) => `Supprimer la liste « ${n} » ? Action irréversible.`, items_label: 'articles' },
    yi: { title: 'מיין קוילע רשימה', empty: 'דיין קוילע רשימה איז ליידיג — לייג צו פראדוקטן אונטן.', select_all: 'סמן אלץ', deselect_all: 'אויסמעקן אלץ', refresh_from_history: 'לייג צו נאך פריטים פון היסטאריע', add_product: 'לייג צו פראדוקט', search_placeholder: 'זוכן פראדוקט...', add_to_cart: 'לייג צו קארב', no_selection: 'קיין פריטים אויסגעקליבן', dec_qty: 'רעדוצירן כמות', inc_qty: 'פארמערן כמות', remove: 'אנטפערנען', on_request: 'אויף פארלאנג', back_to_world: 'צוריק צו וועלט', loading_error: 'טעות לאדן רשימה', estimated_total: 'געשאצטע סך הכל', last_ordered: (d) => `לעצט באשטעלט דעם ${d}`, rename_list: 'ענדערן דעם נאמען', list_name_placeholder: 'למשל: רעגולערע קידוש הזמנה', save_name: 'אפּשפּאַרן', cancel: 'אָפּזאָגן', choose_list: 'קלייב א רשימה', all_my_lists: 'אלע מיינע רשימות', new_list: '+ נייע רשימה', new_list_short: '+ שאף נאך א רשימה', create: 'שאַפֿן', delete_list: 'מעק די רשימה', delete_list_confirm: (n) => `מעקן די רשימה "${n}"? קען נישט ווערן צוריקגענומען.`, items_label: 'פריטים' },
};

interface NewListFormProps {
    compact?: boolean;
    creating: boolean;
    name: string;
    saving: boolean;
    onNameChange: (name: string) => void;
    onStart: () => void;
    onCreate: () => void;
    onCancel: () => void;
    t: T;
}

function NewListForm({ compact, creating, name, saving, onNameChange, onStart, onCreate, onCancel, t }: NewListFormProps) {
    if (!creating) {
        return (
            <button
                type="button"
                onClick={onStart}
                className="text-sm text-[#d4af37] hover:text-[#e8c757] font-bold transition-colors"
            >
                {compact ? t.new_list_short : t.new_list}
            </button>
        );
    }
    return (
        <div className={`flex items-center gap-2 ${compact ? '' : 'mt-4'}`}>
            <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder={t.list_name_placeholder}
                maxLength={100}
                autoFocus
                className="flex-1 bg-[#0e1628] border border-[#d4af37]/30 rounded-lg px-3 py-1.5 text-sm text-[#f0e6d3] focus:outline-none focus:border-[#d4af37]/60"
            />
            <button type="button" onClick={onCreate} disabled={saving} aria-label={t.create} className="text-green-400 hover:text-green-300 disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </button>
            <button type="button" onClick={onCancel} disabled={saving} aria-label={t.cancel} className="text-[#f0e6d3]/40 hover:text-red-400">
                <X size={16} />
            </button>
        </div>
    );
}

export default function ShoppingListClient() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const locale = (params?.locale as string) || 'he';
    const localeKey = locale as 'he' | 'en' | 'fr' | 'yi';
    const t = translations[locale] || translations.he;
    const { token } = useAuth();
    const { items: cartItems, addToCart } = useCart();
    const verticals = useVerticals();
    const vertical = searchParams?.get('vertical') || '';
    const verticalMeta = verticals.find((v) => v.slug === vertical) || null;
    const verticalLabel = verticalMeta ? (verticalMeta[`label_${localeKey}`] || verticalMeta.label_he) : vertical;
    const listParam = searchParams?.get('list');
    const listIdParam = listParam ? Number(listParam) : null;

    const [lists, setLists] = useState<ShoppingListSummary[]>([]);
    const [listsLoading, setListsLoading] = useState(true);
    const [creatingList, setCreatingList] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [creatingSaving, setCreatingSaving] = useState(false);

    const reloadLists = () => {
        if (!token || !vertical) return;
        Promise.resolve().then(() => setListsLoading(true));
        getShoppingLists(token, vertical).then(setLists).catch(() => setLists([])).finally(() => setListsLoading(false));
    };

    useEffect(reloadLists, [token, vertical]);

    // Resolve which list, if any, should render in detail view: the ?list= param if it matches a
    // real list, otherwise — when the user only has one list at all — that single list directly
    // (the common case, unchanged from before multiple lists existed). Anything else (2+ lists,
    // no/stale ?list= param) falls through to the picker screen.
    const resolvedListId: number | null =
        listIdParam != null && lists.some((l) => l.id === listIdParam)
            ? listIdParam
            : (lists.length === 1 ? lists[0].id : null);
    const mode: 'loading' | 'picker' | 'detail' = listsLoading ? 'loading' : (resolvedListId != null ? 'detail' : 'picker');

    const [items, setItems] = useState<ShoppingListItem[]>([]);
    const [listName, setListName] = useState('');
    const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
    const [detailLoading, setDetailLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [addQuery, setAddQuery] = useState('');
    const [candidates, setCandidates] = useState<Product[]>([]);
    const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryItem[]>([]);
    const [editingName, setEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState('');
    const [savingName, setSavingName] = useState(false);

    const loadDetail = () => {
        if (!token || resolvedListId == null) return;
        Promise.resolve().then(() => { setDetailLoading(true); setError(null); });
        getShoppingListDetail(token, resolvedListId)
            .then((data) => {
                setItems(data.items);
                setListName(data.name);
                setCheckedIds(new Set(data.items.map((i) => i.id)));
            })
            .catch((err) => setError(getErrorMessage(err, t.loading_error)))
            .finally(() => setDetailLoading(false));
    };

    useEffect(loadDetail, [token, resolvedListId]);

    useEffect(() => {
        if (!token || !vertical) return;
        getProducts(token, vertical).then(setCandidates).catch(() => setCandidates([]));
    }, [token, vertical]);

    // Last-ordered date per item — a quick sanity-check while reviewing the list ("did I already
    // reorder this recently?"), sourced from the same shared purchase-history endpoint the cart
    // strip and "my taste" sort already use.
    useEffect(() => {
        if (!token || !vertical) return;
        getMyPurchaseHistory(token, vertical).then(setPurchaseHistory).catch(() => setPurchaseHistory([]));
    }, [token, vertical]);

    const lastPurchasedByProduct = useMemo(
        () => new Map(purchaseHistory.map((h) => [h.product_id, h.last_purchased_at])),
        [purchaseHistory]
    );
    const dateLocale = { he: 'he-IL', en: 'en-US', fr: 'fr-FR', yi: 'he-IL' }[locale] || 'he-IL';

    const listedProductIds = useMemo(() => new Set(items.map((i) => i.product_id)), [items]);
    const filteredCandidates = useMemo(() => {
        if (!addQuery.trim()) return [];
        const q = addQuery.toLowerCase();
        return candidates
            .filter((p) => !listedProductIds.has(p.id) && p.is_active !== false)
            .filter((p) => (p[`title_${localeKey}`] || p.title_he || '').toLowerCase().includes(q))
            .slice(0, 8);
    }, [candidates, addQuery, listedProductIds, localeKey]);

    const toggleAll = (checked: boolean) => setCheckedIds(checked ? new Set(items.map((i) => i.id)) : new Set());
    const toggleOne = (id: number) => setCheckedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const openList = (id: number) => router.push(`/${locale}/shopping-list?vertical=${vertical}&list=${id}`);
    const backToAllLists = () => router.push(`/${locale}/shopping-list?vertical=${vertical}`);

    const startEditingName = () => {
        setNameDraft(listName);
        setEditingName(true);
    };

    const saveName = async () => {
        if (!token || resolvedListId == null) return;
        const trimmed = nameDraft.trim();
        if (!trimmed) return;
        setSavingName(true);
        try {
            const saved = await renameShoppingList(token, resolvedListId, trimmed);
            setListName(saved.name);
            setLists((prev) => prev.map((l) => l.id === saved.id ? saved : l));
            setEditingName(false);
        } catch {
            /* ignore — the input just stays open so the user can retry */
        } finally {
            setSavingName(false);
        }
    };

    const handleCreateList = async () => {
        if (!token || !vertical) return;
        const trimmed = newListName.trim() || verticalLabel;
        setCreatingSaving(true);
        try {
            const created = await createShoppingList(token, vertical, trimmed);
            setCreatingList(false);
            setNewListName('');
            reloadLists();
            openList(created.id);
        } catch {
            /* ignore — the form stays open so the user can retry */
        } finally {
            setCreatingSaving(false);
        }
    };

    const handleDeleteList = async (id: number, name: string) => {
        if (!token) return;
        if (!window.confirm(t.delete_list_confirm(name))) return;
        try {
            await deleteShoppingList(token, id);
            if (resolvedListId === id) backToAllLists();
            reloadLists();
        } catch {
            /* ignore — a transient failure just leaves the list in place */
        }
    };

    const handleQuantityChange = async (item: ShoppingListItem, quantity: number) => {
        if (!token || quantity < 1) return;
        setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, quantity } : i));
        try {
            await updateShoppingListItem(token, item.id, quantity);
        } catch {
            loadDetail();
        }
    };

    const handleRemove = async (item: ShoppingListItem) => {
        if (!token) return;
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setCheckedIds((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
        try {
            await removeShoppingListItem(token, item.id);
        } catch {
            loadDetail();
        }
    };

    const handleRefreshFromHistory = async () => {
        if (!token || resolvedListId == null) return;
        setRefreshing(true);
        try {
            const data = await refreshShoppingList(token, resolvedListId);
            const newIds = data.items.filter((i) => !items.some((existing) => existing.id === i.id)).map((i) => i.id);
            setItems(data.items);
            setCheckedIds((prev) => new Set([...prev, ...newIds]));
        } catch (err) {
            setError(getErrorMessage(err, t.loading_error));
        } finally {
            setRefreshing(false);
        }
    };

    const handleAddProduct = async (product: Product) => {
        if (!token || resolvedListId == null) return;
        setAddQuery('');
        try {
            const item = await addShoppingListItem(token, resolvedListId, product.id, 1);
            setItems((prev) => [...prev, item]);
            setCheckedIds((prev) => new Set([...prev, item.id]));
        } catch {
            /* ignore — a transient failure just means the item won't appear */
        }
    };

    const handleAddToCart = () => {
        const checked = items.filter((i) => checkedIds.has(i.id));
        for (const item of checked) {
            addToCart({
                id: item.product_id,
                vertical,
                title_he: item.product_title_he,
                title_en: item.product_title_en,
                title_fr: item.product_title_fr,
                title_yi: item.product_title_yi,
                image_url: item.product_image_url,
                price: item.product_price,
                sale_price: item.product_sale_price,
                quantity_discount_bundle_id: item.quantity_discount_bundle_id ?? null,
                quantity_discount_tiers: item.quantity_discount_tiers ?? null,
            }, item.quantity);
        }
        router.push(`/${locale}/cart`);
    };

    const allChecked = items.length > 0 && checkedIds.size === items.length;
    const selectedCount = checkedIds.size;

    // Estimated total for the checked items — exactly what "הוסף לסל" is about to add, computed
    // with the same sale-price/quantity-discount formula as the cart page (lib/pricing.ts), so the
    // number shown here doesn't drift from what the cart itself would show a moment later. Bundle
    // aggregates are seeded from the REAL cart's existing quantities first (addToCart merges into
    // it, it doesn't replace it) — otherwise a bundle tier the user is about to cross by combining
    // "already in cart" + "about to add" would be invisible here, showing a lower estimate than
    // what the cart will actually apply a moment later.
    const checkedItems = items.filter((i) => checkedIds.has(i.id));
    const bundleAggregates: Record<number, number> = {};
    for (const cartItem of cartItems) {
        if (cartItem.quantity_discount_bundle_id != null) {
            bundleAggregates[cartItem.quantity_discount_bundle_id] = (bundleAggregates[cartItem.quantity_discount_bundle_id] || 0) + cartItem.quantity;
        }
    }
    for (const item of checkedItems) {
        if (item.quantity_discount_bundle_id != null) {
            bundleAggregates[item.quantity_discount_bundle_id] = (bundleAggregates[item.quantity_discount_bundle_id] || 0) + item.quantity;
        }
    }
    const estimatedTotal = checkedItems.reduce((sum, item) => {
        const bundleQty = item.quantity_discount_bundle_id != null ? (bundleAggregates[item.quantity_discount_bundle_id] || 0) : 0;
        const eff = computeEffectiveUnitPrice(item.product_price, item.product_sale_price, item.quantity_discount_tiers, bundleQty);
        return sum + (eff.unitPrice ?? 0) * item.quantity;
    }, 0);
    const hasOnRequestItem = checkedItems.some((i) => !i.product_price);

    if (!vertical) {
        return (
            <main className="min-h-screen bg-[#111a2f] flex items-center justify-center px-6">
                <p className="text-[#f0e6d3]/50">{t.empty}</p>
            </main>
        );
    }

    if (mode === 'loading') {
        return (
            <main className="min-h-screen bg-[#111a2f] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#d4af37]" size={32} />
            </main>
        );
    }

    if (mode === 'picker') {
        return (
            <main className="min-h-screen bg-[#111a2f] py-12 px-6">
                <div className="max-w-2xl mx-auto">
                    <Link href={`/${locale}/world?slug=${vertical}`} className="text-xs text-[#f0e6d3]/40 hover:text-[#d4af37] mb-4 inline-block">
                        &larr; {t.back_to_world}
                    </Link>
                    <h1 className="text-3xl font-black text-[#f0e6d3] mb-8 flex items-center gap-3">
                        <LayoutList size={28} className="text-[#d4af37]" />
                        {t.choose_list}
                    </h1>
                    <div className="space-y-3 mb-6">
                        {lists.map((lst) => (
                            <div
                                key={lst.id}
                                className="flex items-center gap-3 bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-4 cursor-pointer hover:border-[#d4af37]/50 transition-colors"
                                onClick={() => openList(lst.id)}
                            >
                                <ListChecks size={20} className="text-[#d4af37] shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-[#f0e6d3] truncate">{lst.name}</p>
                                    <p className="text-xs text-[#f0e6d3]/40">{lst.item_count} {t.items_label}</p>
                                </div>
                                <button
                                    type="button"
                                    aria-label={t.delete_list}
                                    onClick={(e) => { e.stopPropagation(); handleDeleteList(lst.id, lst.name); }}
                                    className="text-[#f0e6d3]/30 hover:text-red-400 transition-colors shrink-0"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <NewListForm
                        creating={creatingList}
                        name={newListName}
                        saving={creatingSaving}
                        onNameChange={setNewListName}
                        onStart={() => setCreatingList(true)}
                        onCreate={handleCreateList}
                        onCancel={() => { setCreatingList(false); setNewListName(''); }}
                        t={t}
                    />
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#111a2f] py-12 px-6">
            <div className="max-w-2xl mx-auto">
                <Link href={`/${locale}/world?slug=${vertical}`} className="text-xs text-[#f0e6d3]/40 hover:text-[#d4af37] mb-4 inline-block">
                    &larr; {t.back_to_world}
                </Link>
                {lists.length > 1 && (
                    <button
                        type="button"
                        onClick={backToAllLists}
                        className="flex items-center gap-1 text-xs text-[#f0e6d3]/40 hover:text-[#d4af37] mb-2"
                    >
                        <LayoutList size={12} /> {t.all_my_lists}
                    </button>
                )}
                <h1 className="text-3xl font-black text-[#f0e6d3] mb-1 flex items-center gap-3">
                    <ListChecks size={28} className="text-[#d4af37]" />
                    {t.title}
                </h1>
                {editingName ? (
                    <div className="flex items-center gap-2 mb-2">
                        <input
                            type="text"
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            placeholder={t.list_name_placeholder}
                            maxLength={100}
                            autoFocus
                            className="flex-1 bg-[#0e1628] border border-[#d4af37]/30 rounded-lg px-3 py-1.5 text-sm text-[#f0e6d3] focus:outline-none focus:border-[#d4af37]/60"
                        />
                        <button type="button" onClick={saveName} disabled={savingName} aria-label={t.save_name} className="text-green-400 hover:text-green-300 disabled:opacity-50">
                            {savingName ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        </button>
                        <button type="button" onClick={() => setEditingName(false)} disabled={savingName} aria-label={t.cancel} className="text-[#f0e6d3]/40 hover:text-red-400">
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 mb-2">
                        <button
                            type="button"
                            onClick={startEditingName}
                            title={t.rename_list}
                            className="flex items-center gap-1.5 text-[#f0e6d3]/50 hover:text-[#d4af37] transition-colors group"
                        >
                            {listName || verticalLabel}
                            <Pencil size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        {resolvedListId != null && (
                            <button
                                type="button"
                                onClick={() => handleDeleteList(resolvedListId, listName)}
                                title={t.delete_list}
                                className="text-[#f0e6d3]/30 hover:text-red-400 transition-colors"
                            >
                                <Trash2 size={13} />
                            </button>
                        )}
                    </div>
                )}
                <div className="mb-8">
                    <NewListForm
                        compact
                        creating={creatingList}
                        name={newListName}
                        saving={creatingSaving}
                        onNameChange={setNewListName}
                        onStart={() => setCreatingList(true)}
                        onCreate={handleCreateList}
                        onCancel={() => { setCreatingList(false); setNewListName(''); }}
                        t={t}
                    />
                </div>

                {detailLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="animate-spin text-[#d4af37]" size={32} />
                    </div>
                ) : (
                    <>
                        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                        {items.length > 0 && (
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    type="button"
                                    onClick={() => toggleAll(!allChecked)}
                                    className="flex items-center gap-2 text-sm font-bold text-[#d4af37] hover:text-[#e8c757] transition-colors"
                                >
                                    {allChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                                    {allChecked ? t.deselect_all : t.select_all}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRefreshFromHistory}
                                    disabled={refreshing}
                                    className="flex items-center gap-1.5 text-xs text-[#f0e6d3]/50 hover:text-[#d4af37] transition-colors disabled:opacity-50"
                                >
                                    {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                                    {t.refresh_from_history}
                                </button>
                            </div>
                        )}

                        {items.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-[#f0e6d3]/50 mb-4">{t.empty}</p>
                                <button
                                    type="button"
                                    onClick={handleRefreshFromHistory}
                                    disabled={refreshing}
                                    className="btn-secondary inline-flex items-center gap-2 !text-sm"
                                >
                                    {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                    {t.refresh_from_history}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3 mb-6">
                                {items.map((item) => {
                                    const title = item[`product_title_${localeKey}`] || item.product_title_he;
                                    const checked = checkedIds.has(item.id);
                                    return (
                                        <div key={item.id} className={`flex items-center gap-3 bg-[#0e1628] border rounded-2xl p-3 transition-colors ${checked ? 'border-[#d4af37]/30' : 'border-[#f0e6d3]/10 opacity-60'}`}>
                                            <button
                                                type="button"
                                                onClick={() => toggleOne(item.id)}
                                                aria-label={title || ''}
                                                className="shrink-0 text-[#d4af37]"
                                            >
                                                {checked ? <CheckSquare size={20} /> : <Square size={20} className="text-[#f0e6d3]/30" />}
                                            </button>
                                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#111a2f] shrink-0">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={productImageUrl(item.product_image_url)} alt={title || ''} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-[#f0e6d3] truncate text-sm">{title}</p>
                                                {!item.product_is_active && (
                                                    <p className="text-[10px] text-red-400/70">{t.loading_error}</p>
                                                )}
                                                <p className="text-[#d4af37] text-xs font-black">
                                                    {verticalMeta?.hide_prices || !item.product_price
                                                        ? t.on_request
                                                        : `₪${item.product_price.toLocaleString()}`}
                                                </p>
                                                {lastPurchasedByProduct.has(item.product_id) && (
                                                    <p className="text-[10px] text-[#f0e6d3]/40">
                                                        {t.last_ordered(new Date(lastPurchasedByProduct.get(item.product_id)!).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: '2-digit' }))}
                                                    </p>
                                                )}
                                            </div>
                                            <QuantityStepper
                                                qty={item.quantity}
                                                size="sm"
                                                decDisabled={item.quantity <= 1}
                                                incDisabled={item.quantity >= 99}
                                                decLabel={t.dec_qty}
                                                incLabel={t.inc_qty}
                                                onDec={() => handleQuantityChange(item, item.quantity - 1)}
                                                onInc={() => handleQuantityChange(item, item.quantity + 1)}
                                            />
                                            <button
                                                type="button"
                                                aria-label={t.remove}
                                                onClick={() => handleRemove(item)}
                                                className="text-[#f0e6d3]/30 hover:text-red-400 transition-colors shrink-0"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mb-8">
                            <label className="text-xs text-[#f0e6d3]/50 mb-2 block font-bold uppercase tracking-wider">{t.add_product}</label>
                            <div className="relative">
                                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[#f0e6d3]/30 pointer-events-none" />
                                <input
                                    type="text"
                                    value={addQuery}
                                    onChange={(e) => setAddQuery(e.target.value)}
                                    placeholder={t.search_placeholder}
                                    className="w-full bg-[#0e1628] border border-[#d4af37]/20 rounded-xl ps-9 pe-4 py-3 text-sm text-[#f0e6d3] placeholder-[#f0e6d3]/30 focus:outline-none focus:border-[#d4af37]/50"
                                />
                            </div>
                            {filteredCandidates.length > 0 && (
                                <div className="mt-2 bg-[#0e1628] border border-[#d4af37]/20 rounded-xl overflow-hidden divide-y divide-[#f0e6d3]/5">
                                    {filteredCandidates.map((p) => {
                                        const title = p[`title_${localeKey}`] || p.title_he;
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => handleAddProduct(p)}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#111a2f] transition-colors text-start"
                                            >
                                                <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#111a2f] shrink-0">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={productImageUrl(p.image_url)} alt={title || ''} className="w-full h-full object-cover" />
                                                </div>
                                                <span className="flex-1 text-sm text-[#f0e6d3] truncate">{title}</span>
                                                <Plus size={14} className="text-[#d4af37] shrink-0" />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {selectedCount > 0 && !verticalMeta?.hide_prices && (
                            <div className="flex items-center justify-between mb-3 text-sm">
                                <span className="text-[#f0e6d3]/50">{t.estimated_total}</span>
                                <span className="text-[#d4af37] font-black">
                                    {estimatedTotal > 0 ? `₪${Math.round(estimatedTotal).toLocaleString()}${hasOnRequestItem ? '+' : ''}` : t.on_request}
                                </span>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleAddToCart}
                            disabled={selectedCount === 0}
                            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <ShoppingCart size={18} />
                            {selectedCount === 0 ? t.no_selection : `${t.add_to_cart} (${selectedCount})`}
                        </button>
                    </>
                )}
            </div>
        </main>
    );
}
