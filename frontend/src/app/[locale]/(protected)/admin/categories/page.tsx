'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    adminListProductCategories,
    adminCreateProductCategory,
    adminUpdateProductCategory,
    adminListVerticals,
    ProductCategory,
    Vertical,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { Plus, X, Loader2, Pencil, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

const LANGS = [
    { key: 'he', label: 'עברית', dir: 'rtl' as const },
    { key: 'en', label: 'English', dir: 'ltr' as const },
    { key: 'fr', label: 'Français', dir: 'ltr' as const },
    { key: 'yi', label: 'ייִדיש', dir: 'rtl' as const },
];

const EMPTY_FORM = {
    vertical: '',
    label_he: '', label_en: '', label_fr: '', label_yi: '',
    display_order: 0,
    is_active: true,
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

export default function AdminCategoriesPage() {
    const { token } = useAuth();
    // Deliberately the admin (all-verticals) endpoint, not the public useVerticals() hook — a
    // category whose world was later deactivated must still show a real label here (and be
    // selectable as the disabled, locked value in its own edit form), same reasoning as
    // admin/products/page.tsx's own VERTICAL_LABEL/activeVerticals split.
    const [verticals, setVerticals] = useState<Vertical[]>([]);
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [filterVertical, setFilterVertical] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editCategory, setEditCategory] = useState<ProductCategory | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [langTab, setLangTab] = useState<'he' | 'en' | 'fr' | 'yi'>('he');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    const load = () => {
        if (!token) return;
        setLoading(true);
        adminListProductCategories(token).then(setCategories).finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!token) return;
        adminListVerticals(token).then(setVerticals).catch(() => {});
    }, [token]);

    useEffect(() => { Promise.resolve().then(load); }, [token]);

    const openCreateForm = () => {
        setEditCategory(null);
        setForm({ ...EMPTY_FORM, vertical: filterVertical || (activeVerticals[0]?.slug ?? '') });
        setLangTab('he');
        setShowForm(true);
    };

    const openEditForm = (c: ProductCategory) => {
        setEditCategory(c);
        setForm({
            vertical: c.vertical,
            label_he: c.label_he || '', label_en: c.label_en || '', label_fr: c.label_fr || '', label_yi: c.label_yi || '',
            display_order: c.display_order,
            is_active: c.is_active,
        });
        setLangTab('he');
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditCategory(null);
        setForm(EMPTY_FORM);
        setLangTab('he');
    };

    const handleToggleActive = async (c: ProductCategory) => {
        if (!token) return;
        setTogglingId(c.id);
        try {
            await adminUpdateProductCategory(token, c.id, { is_active: !c.is_active });
            setCategories((prev) => prev.map((x) => x.id === c.id ? { ...x, is_active: !c.is_active } : x));
            showToast(c.is_active ? 'הקטגוריה הוסתרה' : 'הקטגוריה הוצגה ✓');
        } catch {
            showToast('שגיאה בעדכון', 'error');
        } finally {
            setTogglingId(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        setSaving(true);
        try {
            if (editCategory) {
                await adminUpdateProductCategory(token, editCategory.id, {
                    label_he: form.label_he, label_en: form.label_en || null, label_fr: form.label_fr || null, label_yi: form.label_yi || null,
                    display_order: form.display_order,
                    is_active: form.is_active,
                });
                showToast('הקטגוריה עודכנה בהצלחה ✓');
            } else {
                await adminCreateProductCategory(token, {
                    vertical: form.vertical,
                    label_he: form.label_he, label_en: form.label_en || null, label_fr: form.label_fr || null, label_yi: form.label_yi || null,
                    display_order: form.display_order,
                    is_active: form.is_active,
                });
                showToast('הקטגוריה נוצרה בהצלחה ✓');
            }
            closeForm();
            load();
        } catch (err) {
            showToast(getErrorMessage(err, 'שגיאה בשמירה'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const activeLang = LANGS.find((l) => l.key === langTab)!;
    const activeVerticals = verticals.filter((v) => v.is_active);
    const verticalLabel = (slug: string) => verticals.find((v) => v.slug === slug)?.label_he || slug;
    const filtered = filterVertical ? categories.filter((c) => c.vertical === filterVertical) : categories;

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-black text-[#f0e6d3]">קטגוריות</h1>
                <button onClick={openCreateForm} disabled={activeVerticals.length === 0} className="btn-primary flex items-center gap-2 !text-sm disabled:opacity-50">
                    <Plus size={16} /> הוסף קטגוריה
                </button>
            </div>

            <p className="text-xs text-[#f0e6d3]/40 mb-6">
                כל קטגוריה שייכת לעולם אחד. חברים יוכלו לסנן לפי קטגוריה בעמוד העולם, ומנהלים יכולים לתייג
                מוצרים לקטגוריה בעמוד המוצרים (כולל תיוג מרובה לבחירת מוצרים).
            </p>

            <div className="mb-4">
                <select
                    value={filterVertical}
                    onChange={(e) => setFilterVertical(e.target.value)}
                    className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]"
                >
                    <option value="">כל העולמות</option>
                    {verticals.map((v) => (
                        <option key={v.slug} value={v.slug}>{v.label_he}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={32} />
            ) : (
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-x-auto">
                    <table className="w-full text-start">
                        <thead className="bg-[#111a2f] text-[#f0e6d3]/60 text-xs uppercase">
                            <tr>
                                <th className="p-4 text-start">שם</th>
                                <th className="p-4 text-start">עולם</th>
                                <th className="p-4 text-start">סדר</th>
                                <th className="p-4 text-start">סטטוס</th>
                                <th className="p-4 text-start"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-[#f0e6d3]/40">אין קטגוריות עדיין</td></tr>
                            )}
                            {filtered.map((c) => (
                                <tr key={c.id} className="border-t border-[#d4af37]/10 text-[#f0e6d3]">
                                    <td className="p-4 font-semibold">{c.label_he}</td>
                                    <td className="p-4 text-sm text-[#f0e6d3]/60">{verticalLabel(c.vertical)}</td>
                                    <td className="p-4 text-sm">{c.display_order}</td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => handleToggleActive(c)}
                                            disabled={togglingId === c.id}
                                            title={c.is_active ? 'הסתר קטגוריה' : 'הצג קטגוריה'}
                                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${c.is_active ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-[#111a2f] text-[#f0e6d3]/40 hover:bg-[#1a2540]'}`}
                                        >
                                            {togglingId === c.id ? <Loader2 size={12} className="animate-spin" /> : c.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                                            {c.is_active ? 'פעיל' : 'מוסתר'}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => openEditForm(c)} className="text-[#d4af37]/50 hover:text-[#d4af37] transition-colors" title="עריכה">
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
                    <form onSubmit={handleSubmit} className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-md space-y-4 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-[#f0e6d3]">{editCategory ? 'עריכת קטגוריה' : 'הוסף קטגוריה'}</h2>
                            <button type="button" onClick={closeForm}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>

                        {/* World */}
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">עולם — לא ניתן לשינוי לאחר יצירה</label>
                            <select
                                required
                                disabled={!!editCategory}
                                value={form.vertical}
                                onChange={(e) => setForm({ ...form, vertical: e.target.value })}
                                className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3] disabled:opacity-50"
                            >
                                <option value="" disabled>בחר עולם</option>
                                {activeVerticals.map((v) => (
                                    <option key={v.slug} value={v.slug}>{v.label_he}</option>
                                ))}
                                {editCategory && !activeVerticals.some((v) => v.slug === form.vertical) && (
                                    <option value={form.vertical}>{verticalLabel(form.vertical)}</option>
                                )}
                            </select>
                        </div>

                        {/* Language tabs for label */}
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-2 block">שם הקטגוריה</label>
                            <div className="flex gap-1 bg-[#111a2f] rounded-xl p-1 mb-3">
                                {LANGS.map((l) => (
                                    <button
                                        key={l.key}
                                        type="button"
                                        onClick={() => setLangTab(l.key as 'he' | 'en' | 'fr' | 'yi')}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${langTab === l.key ? 'bg-[#d4af37] text-[#080d1f]' : 'text-[#f0e6d3]/50 hover:text-[#f0e6d3]'}`}
                                    >
                                        {l.label}
                                    </button>
                                ))}
                            </div>
                            <div dir={activeLang.dir}>
                                <input
                                    required={langTab === 'he'}
                                    placeholder={langTab === 'he' ? 'לדוגמה: טבעות' : ''}
                                    value={(form as unknown as Record<string, string>)[`label_${langTab}`]}
                                    onChange={(e) => setForm({ ...form, [`label_${langTab}`]: e.target.value })}
                                    className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex-1">
                                <label className="text-xs text-[#f0e6d3]/50 mb-1 block">סדר הצגה</label>
                                <input
                                    type="number"
                                    value={form.display_order}
                                    onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
                                    className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                                />
                            </div>
                            <label className="flex items-center gap-2 text-sm text-[#f0e6d3]/70">
                                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                                פעיל
                            </label>
                        </div>

                        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                            {editCategory ? 'שמור שינויים' : 'שמור'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
