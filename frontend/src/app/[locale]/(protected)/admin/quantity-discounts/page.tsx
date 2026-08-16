'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    adminListQuantityDiscounts,
    adminCreateQuantityDiscount,
    adminUpdateQuantityDiscount,
    QuantityDiscountBundle,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { Plus, X, Loader2, Pencil, CheckCircle2, AlertCircle, Eye, EyeOff, Trash2 } from 'lucide-react';

interface FormTier {
    min_quantity: string;
    discount_percent: string;
}

const EMPTY_TIER: FormTier = { min_quantity: '', discount_percent: '' };

const EMPTY_FORM = {
    name_he: '',
    name_en: '',
    is_active: true,
    tiers: [{ ...EMPTY_TIER }] as FormTier[],
};

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

export default function AdminQuantityDiscountsPage() {
    const { token } = useAuth();
    const [bundles, setBundles] = useState<QuantityDiscountBundle[]>([]);
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editBundle, setEditBundle] = useState<QuantityDiscountBundle | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    const load = () => {
        if (!token) return;
        setLoading(true);
        adminListQuantityDiscounts(token).then(setBundles).finally(() => setLoading(false));
    };

    useEffect(() => { Promise.resolve().then(load); }, [token]);

    const openCreateForm = () => {
        setEditBundle(null);
        setForm(EMPTY_FORM);
        setFormError(null);
        setShowForm(true);
    };

    const openEditForm = (b: QuantityDiscountBundle) => {
        setEditBundle(b);
        setForm({
            name_he: b.name_he,
            name_en: b.name_en || '',
            is_active: b.is_active,
            tiers: b.tiers.length > 0
                ? b.tiers.map((t) => ({ min_quantity: String(t.min_quantity), discount_percent: String(t.discount_percent) }))
                : [{ ...EMPTY_TIER }],
        });
        setFormError(null);
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditBundle(null);
        setForm(EMPTY_FORM);
        setFormError(null);
    };

    const addTier = () => setForm((f) => ({ ...f, tiers: [...f.tiers, { ...EMPTY_TIER }] }));
    const removeTier = (i: number) => setForm((f) => ({ ...f, tiers: f.tiers.filter((_, idx) => idx !== i) }));
    const updateTier = (i: number, patch: Partial<FormTier>) =>
        setForm((f) => ({ ...f, tiers: f.tiers.map((t, idx) => idx === i ? { ...t, ...patch } : t) }));

    const handleToggleActive = async (b: QuantityDiscountBundle) => {
        if (!token) return;
        setTogglingId(b.id);
        try {
            await adminUpdateQuantityDiscount(token, b.id, { is_active: !b.is_active });
            setBundles((prev) => prev.map((x) => x.id === b.id ? { ...x, is_active: !b.is_active } : x));
            showToast(b.is_active ? 'הסל הוסתר' : 'הסל הוצג ✓');
        } catch {
            showToast('שגיאה בעדכון', 'error');
        } finally {
            setTogglingId(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        setFormError(null);
        const tiers = form.tiers
            .filter((t) => t.min_quantity !== '' && t.discount_percent !== '')
            .map((t) => ({ min_quantity: Number(t.min_quantity), discount_percent: Number(t.discount_percent) }));
        if (tiers.length === 0) {
            setFormError('יש להוסיף לפחות מדרגת הנחה אחת');
            return;
        }
        setSaving(true);
        try {
            if (editBundle) {
                await adminUpdateQuantityDiscount(token, editBundle.id, {
                    name_he: form.name_he,
                    name_en: form.name_en || null,
                    is_active: form.is_active,
                    tiers,
                });
                showToast('סל המבצע עודכן בהצלחה ✓');
            } else {
                await adminCreateQuantityDiscount(token, {
                    name_he: form.name_he,
                    name_en: form.name_en || null,
                    is_active: form.is_active,
                    tiers,
                });
                showToast('סל המבצע נוצר בהצלחה ✓');
            }
            closeForm();
            load();
        } catch (err) {
            setFormError(getErrorMessage(err, 'שגיאה בשמירה'));
        } finally {
            setSaving(false);
        }
    };

    const tiersSummary = (b: QuantityDiscountBundle) =>
        [...b.tiers].sort((a, c) => a.min_quantity - c.min_quantity).map((t) => `${t.min_quantity}+: ${t.discount_percent}%`).join(' · ');

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-black text-[#f0e6d3]">מבצעי כמות</h1>
                <button onClick={openCreateForm} className="btn-primary flex items-center gap-2 !text-sm">
                    <Plus size={16} /> הוסף סל מבצע
                </button>
            </div>

            <p className="text-xs text-[#f0e6d3]/40 mb-6">
                סל מבצע מקבץ מוצרים (מכל עולם) — ברגע שהכמות המצטברת של פריטים מהסל בעגלה של לקוח עוברת
                סף מדרגה, כל הפריטים בסל מקבלים את אחוז ההנחה של אותה מדרגה. תיוג מוצרים לסל נעשה בעמוד
                &quot;מוצרים&quot; (כולל תיוג מרובה לבחירת מוצרים).
            </p>

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={32} />
            ) : (
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-x-auto">
                    <table className="w-full text-start">
                        <thead className="bg-[#111a2f] text-[#f0e6d3]/60 text-xs uppercase">
                            <tr>
                                <th className="p-4 text-start">קוד</th>
                                <th className="p-4 text-start">שם</th>
                                <th className="p-4 text-start">מדרגות</th>
                                <th className="p-4 text-start">מוצרים</th>
                                <th className="p-4 text-start">סטטוס</th>
                                <th className="p-4 text-start"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {bundles.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-[#f0e6d3]/40">אין מבצעי כמות עדיין</td></tr>
                            )}
                            {bundles.map((b) => (
                                <tr key={b.id} className="border-t border-[#d4af37]/10 text-[#f0e6d3]">
                                    <td className="p-4 text-sm text-[#f0e6d3]/50" dir="ltr">{b.bundle_code}</td>
                                    <td className="p-4 font-semibold">{b.name_he}</td>
                                    <td className="p-4 text-sm text-[#f0e6d3]/60" dir="ltr">{tiersSummary(b)}</td>
                                    <td className="p-4 text-sm">{b.product_count}</td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => handleToggleActive(b)}
                                            disabled={togglingId === b.id}
                                            title={b.is_active ? 'הסתר סל מבצע' : 'הצג סל מבצע'}
                                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${b.is_active ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-[#111a2f] text-[#f0e6d3]/40 hover:bg-[#1a2540]'}`}
                                        >
                                            {togglingId === b.id ? <Loader2 size={12} className="animate-spin" /> : b.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                                            {b.is_active ? 'פעיל' : 'מוסתר'}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => openEditForm(b)} className="text-[#d4af37]/50 hover:text-[#d4af37] transition-colors" title="עריכה">
                                            <Pencil size={15} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add / Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6" onClick={closeForm}>
                    <form onSubmit={handleSubmit} className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-lg space-y-4 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-[#f0e6d3]">{editBundle ? 'עריכת סל מבצע' : 'הוסף סל מבצע'}</h2>
                            <button type="button" onClick={closeForm}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>

                        {formError && <p className="text-red-400 text-sm">{formError}</p>}

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">שם הסל (עברית) <span className="text-red-400">*</span></label>
                            <input
                                required
                                placeholder="לדוגמה: מבצע כמות - טבעות"
                                value={form.name_he}
                                onChange={(e) => setForm({ ...form, name_he: e.target.value })}
                                className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">שם הסל (אנגלית, אופציונלי)</label>
                            <input
                                dir="ltr"
                                value={form.name_en}
                                onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                                className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                            />
                        </div>

                        {/* Tiers builder */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs text-[#f0e6d3]/50 block font-bold uppercase tracking-wider">מדרגות הנחה</label>
                                <button type="button" onClick={addTier} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#d4af37]/10 text-[#d4af37] hover:bg-[#d4af37]/20 transition-colors">
                                    <Plus size={13} /> הוסף מדרגה
                                </button>
                            </div>
                            <div className="space-y-2">
                                {form.tiers.map((tier, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-[#111a2f] rounded-xl p-3">
                                        <div className="flex-1">
                                            <label className="text-[11px] text-[#f0e6d3]/40 mb-1 block">כמות מינימלית</label>
                                            <input
                                                type="number"
                                                min={1}
                                                placeholder="3"
                                                value={tier.min_quantity}
                                                onChange={(e) => updateTier(i, { min_quantity: e.target.value })}
                                                className="w-full bg-[#0e1628] rounded-lg px-3 py-2 text-sm text-[#f0e6d3]"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[11px] text-[#f0e6d3]/40 mb-1 block">אחוז הנחה</label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                placeholder="10"
                                                value={tier.discount_percent}
                                                onChange={(e) => updateTier(i, { discount_percent: e.target.value })}
                                                className="w-full bg-[#0e1628] rounded-lg px-3 py-2 text-sm text-[#f0e6d3]"
                                            />
                                        </div>
                                        <button type="button" onClick={() => removeTier(i)} className="text-red-400/50 hover:text-red-400 transition-colors shrink-0 p-2 mt-4">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-[#f0e6d3]/30 mt-2">
                                לדוגמה: 3 יח&apos; = 10% הנחה, 5 יח&apos; = 15% הנחה. הכמות נספרת במצטבר על פני כל המוצרים המתויגים לסל, בעגלה אחת.
                            </p>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-[#f0e6d3]/70">
                            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                            פעיל
                        </label>

                        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                            {editBundle ? 'שמור שינויים' : 'שמור'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
