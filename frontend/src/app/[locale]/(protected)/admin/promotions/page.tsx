'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    adminListPromotions,
    adminCreatePromotion,
    adminUpdatePromotion,
    adminDeactivatePromotion,
    adminDeletePromotion,
    adminListProducts,
    adminGetPromotionProducts,
    adminAssignProducts,
    adminRemoveProductFromPromotion,
    adminDrawPromotion,
} from '@/lib/api';
import { Product } from '@/components/ProductTile';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { Plus, X, Loader2, Tag, Users, Shuffle, CheckCircle2, AlertCircle, Pencil, Trash2, Package } from 'lucide-react';

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold whitespace-nowrap ${
            type === 'success' ? 'bg-[#0e1628] border border-green-500/50 text-green-400' : 'bg-[#0e1628] border border-red-500/50 text-red-400'
        }`}>
            {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message}
        </div>
    );
}

function addDays(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
}

const PROMOTION_TYPES = [
    { value: 'first_n', label: 'ראשונים (מספר מוגבל)' },
    { value: 'raffle', label: 'הגרלה' },
    { value: 'percentage_discount', label: 'הנחה באחוזים' },
    { value: 'fixed_discount', label: 'הנחה קבועה בשקלים' },
    { value: 'flash_sale', label: 'פלאש סייל' },
];

const CHANNELS = [
    { value: 'both', label: 'אונליין ופיזי' },
    { value: 'online', label: 'אונליין בלבד' },
    { value: 'physical', label: 'חנויות פיזיות בלבד' },
];

const TYPE_LABELS: Record<string, string> = {
    first_n: 'ראשונים',
    raffle: 'הגרלה',
    percentage_discount: 'הנחה %',
    fixed_discount: 'הנחה ₪',
    flash_sale: 'פלאש סייל',
};

const CHANNEL_LABELS: Record<string, string> = {
    both: 'אונליין ופיזי',
    online: 'אונליין',
    physical: 'פיזי',
};

const CONFIG_FIELD_LABEL: Record<string, string> = {
    first_n: 'כמה משתתפים מקסימום?',
    raffle: 'כמה זוכים בהגרלה?',
    percentage_discount: 'אחוז הנחה (לדוגמה: 20 = 20%)',
    fixed_discount: 'סכום הנחה בשקלים (לדוגמה: 50)',
    flash_sale: 'אחוז הנחה לפלאש סייל',
};

function emptyConfig(type: string): Record<string, any> {
    switch (type) {
        case 'first_n': return { limit: 500, participants_count: 0 };
        case 'raffle': return { winner_count: 1, participants_count: 0 };
        case 'percentage_discount': return { percentage: 10 };
        case 'fixed_discount': return { amount: 50 };
        case 'flash_sale': return { discount_percentage: 20 };
        default: return {};
    }
}

export default function AdminPromotionsPage() {
    const { token } = useAuth();
    const [promotions, setPromotions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [assignPromo, setAssignPromo] = useState<any | null>(null);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set());
    const [assignLoading, setAssignLoading] = useState(false);
    const [drawingId, setDrawingId] = useState<number | null>(null);
    const [drawResult, setDrawResult] = useState<Record<number, string>>({});
    const [drawError, setDrawError] = useState<string | null>(null);
    const [editPromo, setEditPromo] = useState<any | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmToggleId, setConfirmToggleId] = useState<number | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    const [form, setForm] = useState({
        name_he: '',
        type: 'first_n',
        channel: 'both',
        end_date: '',
        config: emptyConfig('first_n'),
    });

    const load = () => {
        if (!token) return;
        setLoading(true);
        adminListPromotions(token).then(setPromotions).finally(() => setLoading(false));
    };

    useEffect(load, [token]);

    const handleTypeChange = (type: string) => {
        setForm((f) => ({ ...f, type, config: emptyConfig(type) }));
    };

    const handleConfigChange = (key: string, value: string) => {
        setForm((f) => ({ ...f, config: { ...f.config, [key]: value === '' ? '' : Number(value) } }));
    };

    const handleToggleActive = async (promo: any) => {
        if (!token) return;
        try {
            if (promo.is_active) {
                await adminDeactivatePromotion(token, promo.id);
                showToast('המבצע הושבת');
            } else {
                await adminUpdatePromotion(token, promo.id, { is_active: true });
                showToast('המבצע הופעל ✓');
            }
            load();
        } catch {
            showToast('שגיאה בעדכון המבצע', 'error');
        }
        setConfirmToggleId(null);
    };

    const openEditForm = (promo: any) => {
        setEditPromo(promo);
        setForm({
            name_he: promo.name_he,
            type: promo.type,
            channel: promo.channel,
            end_date: promo.end_date ? promo.end_date.split('T')[0] : '',
            config: { ...promo.config },
        });
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditPromo(null);
        setForm({ name_he: '', type: 'first_n', channel: 'both', end_date: '', config: emptyConfig('first_n') });
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        const payload = {
            name_he: form.name_he,
            type: form.type,
            channel: form.channel,
            config: form.config,
            end_date: form.end_date || null,
            is_active: true,
        };
        try {
            if (editPromo) {
                await adminUpdatePromotion(token, editPromo.id, payload);
                showToast('המבצע עודכן בהצלחה ✓');
            } else {
                await adminCreatePromotion(token, payload);
                showToast('המבצע נוצר בהצלחה ✓');
            }
            closeForm();
            load();
        } catch {
            showToast(editPromo ? 'שגיאה בעדכון המבצע' : 'שגיאה ביצירת המבצע', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!token) return;
        try {
            await adminDeletePromotion(token, id);
            setDeletingId(null);
            showToast('המבצע נמחק');
            load();
        } catch {
            showToast('שגיאה במחיקה', 'error');
        }
    };

    const openAssign = async (promo: any) => {
        if (!token) return;
        setAssignPromo(promo);
        setAssignLoading(true);
        const [products, assigned] = await Promise.all([
            adminListProducts(token),
            adminGetPromotionProducts(token, promo.id),
        ]);
        setAllProducts(products);
        setAssignedIds(new Set(assigned.map((p: Product) => p.id)));
        setAssignLoading(false);
    };

    const handleToggleProduct = (productId: number) => {
        setAssignedIds((prev) => {
            const next = new Set(prev);
            if (next.has(productId)) next.delete(productId);
            else next.add(productId);
            return next;
        });
    };

    const handleSaveAssignment = async () => {
        if (!token || !assignPromo) return;
        setAssignLoading(true);
        const currentAssigned = await adminGetPromotionProducts(token, assignPromo.id);
        const currentIds: Set<number> = new Set(currentAssigned.map((p: Product) => p.id));

        const toAdd = [...assignedIds].filter((id) => !currentIds.has(id));
        const toRemove = [...currentIds].filter((id) => !assignedIds.has(id));

        await Promise.all([
            toAdd.length > 0 ? adminAssignProducts(token, assignPromo.id, toAdd) : Promise.resolve(),
            ...toRemove.map((id) => adminRemoveProductFromPromotion(token, assignPromo.id, id)),
        ]);

        setAssignPromo(null);
        setAssignLoading(false);
    };

    const handleDraw = async (promo: any) => {
        if (!token) return;
        setDrawingId(promo.id);
        setDrawError(null);
        try {
            const result = await adminDrawPromotion(token, promo.id);
            setDrawResult((prev) => ({ ...prev, [promo.id]: result.winner_name || 'הגרלה בוצעה' }));
            load();
        } catch (err) {
            setDrawError(getErrorMessage(err, 'שגיאה בביצוע הגרלה'));
        } finally {
            setDrawingId(null);
        }
    };

    const isRaffleDrawable = (promo: any) =>
        promo.type === 'raffle' && promo.is_active && promo.end_date && new Date(promo.end_date) < new Date();

    const formatDate = (d: string | null) => {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('he-IL');
    };

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-black text-[#f0e6d3]">מבצעים</h1>
                <button onClick={() => { setEditPromo(null); setShowForm(true); }} className="btn-primary flex items-center gap-2 !text-sm">
                    <Plus size={16} /> צור מבצע
                </button>
            </div>

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={32} />
            ) : (
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-x-auto">
                    <table className="w-full text-start">
                        <thead className="bg-[#111a2f] text-[#f0e6d3]/60 text-xs uppercase">
                            <tr>
                                <th className="p-4 text-start">שם מבצע</th>
                                <th className="p-4 text-start">סוג</th>
                                <th className="p-4 text-start">ערוץ</th>
                                <th className="p-4 text-start">מוצרים</th>
                                <th className="p-4 text-start">משתתפים</th>
                                <th className="p-4 text-start">סטטוס</th>
                                <th className="p-4 text-start">תאריך סיום</th>
                                <th className="p-4 text-start">פעולות</th>
                            </tr>
                        </thead>
                        <tbody>
                            {promotions.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-[#f0e6d3]/40">אין מבצעים עדיין</td>
                                </tr>
                            )}
                            {promotions.map((promo) => (
                                <tr key={promo.id} className="border-t border-[#d4af37]/10 text-[#f0e6d3]">
                                    <td className="p-4 font-semibold">{promo.name_he}</td>
                                    <td className="p-4">
                                        <span className="text-sm">{TYPE_LABELS[promo.type] ?? promo.type}</span>
                                    </td>
                                    <td className="p-4">{CHANNEL_LABELS[promo.channel] ?? promo.channel}</td>
                                    <td className="p-4">
                                        <span className={`flex items-center gap-1 text-sm font-bold ${promo.product_count > 0 ? 'text-[#d4af37]' : 'text-[#f0e6d3]/25'}`}>
                                            <Package size={13} />
                                            {promo.product_count ?? 0}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {(promo.type === 'raffle' || promo.type === 'first_n') ? (
                                            <div className="flex items-center gap-1.5">
                                                <Users size={14} className="text-[#d4af37]" />
                                                <span className="text-sm font-bold text-[#d4af37]">{promo.entry_count ?? 0}</span>
                                                {promo.type === 'first_n' && promo.config?.limit && (
                                                    <span className="text-xs text-[#f0e6d3]/40">/ {promo.config.limit}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-[#f0e6d3]/25">—</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${promo.is_active ? 'bg-green-500/20 text-green-400' : 'bg-[#111a2f] text-[#f0e6d3]/40'}`}>
                                            {promo.is_active ? 'פעיל' : 'כבוי'}
                                        </span>
                                    </td>
                                    <td className="p-4">{formatDate(promo.end_date)}</td>
                                    <td className="p-4">
                                                        <div className="flex flex-wrap items-center gap-3">
                                            <button
                                                onClick={() => openEditForm(promo)}
                                                className="text-[#d4af37]/50 hover:text-[#d4af37] transition-colors"
                                                title="עריכה"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                onClick={() => openAssign(promo)}
                                                className="flex items-center gap-1 text-[#d4af37] hover:text-[#f0c94a] text-sm font-semibold"
                                            >
                                                <Users size={15} /> שיוך מוצרים
                                            </button>
                                            {confirmToggleId === promo.id ? (
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-[#f0e6d3]/60">{promo.is_active ? 'להשבית?' : 'להפעיל?'}</span>
                                                    <button onClick={() => handleToggleActive(promo)} className="text-[#d4af37] font-bold hover:text-[#f0c94a]">כן</button>
                                                    <button onClick={() => setConfirmToggleId(null)} className="text-[#f0e6d3]/40 hover:text-[#f0e6d3]">לא</button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmToggleId(promo.id)}
                                                    className={`text-sm font-semibold ${promo.is_active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                                                >
                                                    {promo.is_active ? 'השבת' : 'הפעל'}
                                                </button>
                                            )}
                                            {isRaffleDrawable(promo) && (
                                                drawResult[promo.id] ? (
                                                    <span className="text-xs text-green-400 font-bold">🏆 זוכה: {drawResult[promo.id]}</span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDraw(promo)}
                                                        disabled={drawingId === promo.id}
                                                        className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm font-semibold disabled:opacity-50"
                                                    >
                                                        {drawingId === promo.id ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />}
                                                        בצע הגרלה
                                                    </button>
                                                )
                                            )}
                                            {deletingId === promo.id ? (
                                                <div className="flex items-center gap-1 text-xs">
                                                    <span className="text-[#f0e6d3]/50">בטוח?</span>
                                                    <button onClick={() => handleDelete(promo.id)} className="text-red-400 font-bold hover:text-red-300">כן</button>
                                                    <button onClick={() => setDeletingId(null)} className="text-[#f0e6d3]/40 hover:text-[#f0e6d3]">לא</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setDeletingId(promo.id)} className="text-red-400/30 hover:text-red-400 transition-colors" title="מחק מבצע">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {drawError && (
                <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
                    <p className="text-red-400 text-sm font-semibold">{drawError}</p>
                    <button onClick={() => setDrawError(null)} className="text-red-400/60 hover:text-red-400 text-lg leading-none">×</button>
                </div>
            )}

            {/* Create Promotion Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6" onClick={closeForm}>
                    <form onSubmit={handleCreate} className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-[#f0e6d3] flex items-center gap-2">
                                <Tag size={20} /> {editPromo ? 'עריכת מבצע' : 'צור מבצע'}
                            </h2>
                            <button type="button" onClick={closeForm}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">שם המבצע</label>
                            <input
                                required
                                placeholder="שם המבצע (בעברית)"
                                value={form.name_he}
                                onChange={(e) => setForm({ ...form, name_he: e.target.value })}
                                className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">היכן המבצע מתקיים?</label>
                            <select
                                value={form.channel}
                                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                                className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                            >
                                {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">מה סוג המבצע?</label>
                            <select
                                value={form.type}
                                onChange={(e) => handleTypeChange(e.target.value)}
                                className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                            >
                                {PROMOTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">{CONFIG_FIELD_LABEL[form.type]}</label>
                            {form.type === 'first_n' && (
                                <input type="number" required value={form.config.limit ?? ''} onChange={(e) => handleConfigChange('limit', e.target.value)} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                            )}
                            {form.type === 'raffle' && (
                                <input type="number" required value={form.config.winner_count ?? ''} onChange={(e) => handleConfigChange('winner_count', e.target.value)} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                            )}
                            {form.type === 'percentage_discount' && (
                                <input type="number" required value={form.config.percentage ?? ''} onChange={(e) => handleConfigChange('percentage', e.target.value)} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                            )}
                            {form.type === 'fixed_discount' && (
                                <input type="number" required value={form.config.amount ?? ''} onChange={(e) => handleConfigChange('amount', e.target.value)} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                            )}
                            {form.type === 'flash_sale' && (
                                <input type="number" required value={form.config.discount_percentage ?? ''} onChange={(e) => handleConfigChange('discount_percentage', e.target.value)} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                            )}
                        </div>

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">תאריך סיום מבצע (אופציונלי)</label>
                            <div className="flex gap-2 mb-2">
                                {[7, 14, 30].map((n) => (
                                    <button key={n} type="button" onClick={() => setForm({ ...form, end_date: addDays(n) })}
                                        className="flex-1 py-1.5 rounded-lg bg-[#111a2f] text-[#f0e6d3]/60 text-xs hover:bg-[#1a2540] hover:text-[#d4af37] transition-colors">
                                        +{n} ימים
                                    </button>
                                ))}
                                {form.end_date && (
                                    <button type="button" onClick={() => setForm({ ...form, end_date: '' })}
                                        className="px-3 py-1.5 rounded-lg bg-[#111a2f] text-[#f0e6d3]/40 text-xs hover:text-red-400 transition-colors">
                                        ✕
                                    </button>
                                )}
                            </div>
                            <input
                                type="date"
                                value={form.end_date}
                                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                                className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                            />
                        </div>

                        <button type="submit" className="btn-primary w-full">{editPromo ? 'שמור שינויים' : 'שמור מבצע'}</button>
                    </form>
                </div>
            )}

            {/* Assign Products Modal */}
            {assignPromo && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6" onClick={() => setAssignPromo(null)}>
                    <div className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-[#f0e6d3]">שיוך מוצרים — {assignPromo.name_he}</h2>
                            <button onClick={() => setAssignPromo(null)}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>

                        {assignLoading ? (
                            <Loader2 className="animate-spin text-[#d4af37] mx-auto my-8" size={28} />
                        ) : (
                            <>
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-1 mb-6">
                                    {allProducts.map((p) => (
                                        <label key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#111a2f] cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={assignedIds.has(p.id)}
                                                onChange={() => handleToggleProduct(p.id)}
                                                className="accent-[#d4af37] w-4 h-4"
                                            />
                                            <span className="text-[#f0e6d3] text-sm">{p.title_he}</span>
                                            <span className="text-[#f0e6d3]/40 text-xs">{p.vertical}</span>
                                        </label>
                                    ))}
                                </div>
                                <button onClick={handleSaveAssignment} className="btn-primary w-full">שמור שיוך</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
