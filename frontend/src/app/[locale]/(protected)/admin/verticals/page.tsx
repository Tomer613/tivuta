'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminListVerticals, adminCreateVertical, adminUpdateVertical, Vertical } from '@/lib/api';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { VERTICAL_ICON_OPTIONS, getVerticalIcon } from '@/lib/verticalIcons';
import { Plus, X, Loader2, Pencil, CheckCircle2, AlertCircle, Eye, EyeOff, Globe, PlusCircle, Trash2 } from 'lucide-react';

const LANGS = [
    { key: 'he', label: 'עברית', dir: 'rtl' as const },
    { key: 'en', label: 'English', dir: 'ltr' as const },
    { key: 'fr', label: 'Français', dir: 'ltr' as const },
    { key: 'yi', label: 'ייִדיש', dir: 'rtl' as const },
];

interface FormAttrField {
    key: string;
    label_he: string;
    label_en: string;
    type: 'text' | 'number' | 'select';
    placeholder: string;
    options: string; // comma-separated in the form, split into an array on submit
}

const EMPTY_ATTR_FIELD: FormAttrField = { key: '', label_he: '', label_en: '', type: 'text', placeholder: '', options: '' };

const EMPTY_FORM = {
    slug: '',
    label_he: '', label_en: '', label_fr: '', label_yi: '',
    subtitle_he: '', subtitle_en: '', subtitle_fr: '', subtitle_yi: '',
    icon: 'Store',
    supports_appointments: false,
    requires_gabbai: false,
    allows_custom_items_note: false,
    hide_prices: false,
    default_sort: 'popularity',
    display_order: 0,
    is_active: true,
    attribute_fields: [] as FormAttrField[],
};

const SORT_OPTIONS: { value: string; label: string }[] = [
    { value: 'popularity', label: 'הכי פופולרי' },
    { value: 'price_asc', label: 'מחיר: מהזול ליקר' },
    { value: 'price_desc', label: 'מחיר: מהיקר לזול' },
    { value: 'newest', label: 'החדש ביותר' },
];

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

export default function AdminVerticalsPage() {
    const { token } = useAuth();
    const [verticals, setVerticals] = useState<Vertical[]>([]);
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editVertical, setEditVertical] = useState<Vertical | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [langTab, setLangTab] = useState<'he' | 'en' | 'fr' | 'yi'>('he');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    const load = () => {
        if (!token) return;
        setLoading(true);
        adminListVerticals(token).then(setVerticals).finally(() => setLoading(false));
    };

    useEffect(() => { Promise.resolve().then(load); }, [token]);

    const openCreateForm = () => {
        setEditVertical(null);
        setForm(EMPTY_FORM);
        setLangTab('he');
        setShowForm(true);
    };

    const openEditForm = (v: Vertical) => {
        setEditVertical(v);
        setForm({
            slug: v.slug,
            label_he: v.label_he || '', label_en: v.label_en || '', label_fr: v.label_fr || '', label_yi: v.label_yi || '',
            subtitle_he: v.subtitle_he || '', subtitle_en: v.subtitle_en || '', subtitle_fr: v.subtitle_fr || '', subtitle_yi: v.subtitle_yi || '',
            icon: v.icon,
            supports_appointments: v.supports_appointments,
            requires_gabbai: v.requires_gabbai,
            allows_custom_items_note: v.allows_custom_items_note,
            hide_prices: v.hide_prices,
            default_sort: v.default_sort,
            display_order: v.display_order,
            is_active: v.is_active,
            attribute_fields: (v.attribute_fields || []).map((f) => ({
                key: f.key, label_he: f.label_he, label_en: f.label_en || '',
                type: f.type, placeholder: f.placeholder || '', options: (f.options || []).join(', '),
            })),
        });
        setLangTab('he');
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditVertical(null);
        setForm(EMPTY_FORM);
        setLangTab('he');
    };

    const handleToggleActive = async (v: Vertical) => {
        if (!token) return;
        setTogglingId(v.id);
        try {
            await adminUpdateVertical(token, v.id, { is_active: !v.is_active });
            setVerticals((prev) => prev.map((x) => x.id === v.id ? { ...x, is_active: !v.is_active } : x));
            showToast(v.is_active ? 'העולם הוסתר' : 'העולם הוצג ✓');
        } catch {
            showToast('שגיאה בעדכון', 'error');
        } finally {
            setTogglingId(null);
        }
    };

    const addAttrField = () => setForm((f) => ({ ...f, attribute_fields: [...f.attribute_fields, { ...EMPTY_ATTR_FIELD }] }));
    const removeAttrField = (i: number) => setForm((f) => ({ ...f, attribute_fields: f.attribute_fields.filter((_, idx) => idx !== i) }));
    const updateAttrField = (i: number, patch: Partial<FormAttrField>) =>
        setForm((f) => ({ ...f, attribute_fields: f.attribute_fields.map((field, idx) => idx === i ? { ...field, ...patch } : field) }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        const attribute_fields = form.attribute_fields
            .filter((f) => f.key.trim() && f.label_he.trim())
            .map((f) => ({
                key: f.key.trim(),
                label_he: f.label_he.trim(),
                label_en: f.label_en.trim() || null,
                type: f.type,
                placeholder: f.placeholder.trim() || null,
                options: f.type === 'select' ? f.options.split(',').map((o) => o.trim()).filter(Boolean) : null,
            }));
        const keys = attribute_fields.map((f) => f.key);
        const duplicateKey = keys.find((k, i) => keys.indexOf(k) !== i);
        if (duplicateKey) {
            showToast(`מזהה שדה כפול: "${duplicateKey}" — כל שדה חייב מזהה ייחודי`, 'error');
            return;
        }
        setSaving(true);
        try {
            if (editVertical) {
                await adminUpdateVertical(token, editVertical.id, {
                    label_he: form.label_he, label_en: form.label_en || null, label_fr: form.label_fr || null, label_yi: form.label_yi || null,
                    subtitle_he: form.subtitle_he || null, subtitle_en: form.subtitle_en || null, subtitle_fr: form.subtitle_fr || null, subtitle_yi: form.subtitle_yi || null,
                    icon: form.icon,
                    supports_appointments: form.supports_appointments,
                    requires_gabbai: form.requires_gabbai,
                    allows_custom_items_note: form.allows_custom_items_note,
                    hide_prices: form.hide_prices,
                    default_sort: form.default_sort,
                    display_order: form.display_order,
                    is_active: form.is_active,
                    attribute_fields,
                });
                showToast('העולם עודכן בהצלחה ✓');
            } else {
                await adminCreateVertical(token, {
                    slug: form.slug,
                    label_he: form.label_he, label_en: form.label_en || null, label_fr: form.label_fr || null, label_yi: form.label_yi || null,
                    subtitle_he: form.subtitle_he || null, subtitle_en: form.subtitle_en || null, subtitle_fr: form.subtitle_fr || null, subtitle_yi: form.subtitle_yi || null,
                    icon: form.icon,
                    supports_appointments: form.supports_appointments,
                    requires_gabbai: form.requires_gabbai,
                    allows_custom_items_note: form.allows_custom_items_note,
                    hide_prices: form.hide_prices,
                    default_sort: form.default_sort,
                    display_order: form.display_order,
                    is_active: form.is_active,
                    attribute_fields,
                });
                showToast('העולם נוצר בהצלחה — הדיפלוי הופעל אוטומטית ✓');
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

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-black text-[#f0e6d3]">עולמות</h1>
                <button onClick={openCreateForm} className="btn-primary flex items-center gap-2 !text-sm">
                    <Plus size={16} /> הוסף עולם
                </button>
            </div>

            <p className="text-xs text-[#f0e6d3]/40 mb-6 flex items-center gap-2">
                <Globe size={13} />
                שמירת עולם מפעילה אוטומטית דיפלוי מחדש של האתר, ושולחת מייל אישור.
            </p>

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={32} />
            ) : (
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-x-auto">
                    <table className="w-full text-start">
                        <thead className="bg-[#111a2f] text-[#f0e6d3]/60 text-xs uppercase">
                            <tr>
                                <th className="p-3 w-14"></th>
                                <th className="p-4 text-start">שם</th>
                                <th className="p-4 text-start">slug</th>
                                <th className="p-4 text-start">פגישות</th>
                                <th className="p-4 text-start">גבאי</th>
                                <th className="p-4 text-start">סדר</th>
                                <th className="p-4 text-start">סטטוס</th>
                                <th className="p-4 text-start"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {verticals.length === 0 && (
                                <tr><td colSpan={8} className="p-8 text-center text-[#f0e6d3]/40">אין עולמות עדיין</td></tr>
                            )}
                            {verticals.map((v) => {
                                const Icon = getVerticalIcon(v.icon);
                                return (
                                    <tr key={v.id} className="border-t border-[#d4af37]/10 text-[#f0e6d3]">
                                        <td className="p-3">
                                            <div className="w-10 h-10 rounded-lg bg-[#111a2f] flex items-center justify-center text-[#d4af37]">
                                                <Icon size={18} />
                                            </div>
                                        </td>
                                        <td className="p-4 font-semibold">{v.label_he}</td>
                                        <td className="p-4 text-sm text-[#f0e6d3]/50" dir="ltr">{v.slug}</td>
                                        <td className="p-4 text-sm">{v.supports_appointments ? 'כן' : 'לא'}</td>
                                        <td className="p-4 text-sm">{v.requires_gabbai ? 'כן' : 'לא'}</td>
                                        <td className="p-4 text-sm">{v.display_order}</td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleToggleActive(v)}
                                                disabled={togglingId === v.id}
                                                title={v.is_active ? 'הסתר עולם' : 'הצג עולם'}
                                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${v.is_active ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-[#111a2f] text-[#f0e6d3]/40 hover:bg-[#1a2540]'}`}
                                            >
                                                {togglingId === v.id ? <Loader2 size={12} className="animate-spin" /> : v.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                                                {v.is_active ? 'פעיל' : 'מוסתר'}
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <button onClick={() => openEditForm(v)} className="text-[#d4af37]/50 hover:text-[#d4af37] transition-colors" title="עריכה">
                                                <Pencil size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add / Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6" onClick={closeForm}>
                    <form onSubmit={handleSubmit} className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-xl space-y-4 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-[#f0e6d3]">{editVertical ? 'עריכת עולם' : 'הוסף עולם'}</h2>
                            <button type="button" onClick={closeForm}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>

                        {/* Slug */}
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">מזהה (slug) — לועזית, ללא רווחים, לא ניתן לשינוי לאחר יצירה</label>
                            <input
                                required
                                disabled={!!editVertical}
                                placeholder="watches"
                                dir="ltr"
                                value={form.slug}
                                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3] disabled:opacity-50"
                            />
                        </div>

                        {/* Language tabs for label/subtitle */}
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-2 block">שם ותת-כותרת</label>
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
                            <div className="space-y-3" dir={activeLang.dir}>
                                <input
                                    required={langTab === 'he'}
                                    placeholder={langTab === 'he' ? 'לדוגמה: עולם השעונים' : ''}
                                    value={(form as unknown as Record<string, string>)[`label_${langTab}`]}
                                    onChange={(e) => setForm({ ...form, [`label_${langTab}`]: e.target.value })}
                                    className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                                />
                                <input
                                    placeholder={langTab === 'he' ? 'תת-כותרת קצרה' : ''}
                                    value={(form as unknown as Record<string, string>)[`subtitle_${langTab}`]}
                                    onChange={(e) => setForm({ ...form, [`subtitle_${langTab}`]: e.target.value })}
                                    className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                                />
                            </div>
                        </div>

                        {/* Icon picker */}
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-2 block">אייקון</label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {VERTICAL_ICON_OPTIONS.map((iconKey) => {
                                    const Icon = getVerticalIcon(iconKey);
                                    return (
                                        <button
                                            key={iconKey}
                                            type="button"
                                            onClick={() => setForm({ ...form, icon: iconKey })}
                                            className={`aspect-square rounded-xl flex items-center justify-center border transition-colors ${form.icon === iconKey ? 'bg-[#d4af37] border-[#d4af37] text-[#080d1f]' : 'bg-[#111a2f] border-[#d4af37]/10 text-[#d4af37]/60 hover:border-[#d4af37]/40'}`}
                                        >
                                            <Icon size={18} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Options row */}
                        <div className="flex flex-wrap items-center gap-6">
                            <label className="flex items-center gap-2 text-sm text-[#f0e6d3]/70">
                                <input type="checkbox" checked={form.supports_appointments} onChange={(e) => setForm({ ...form, supports_appointments: e.target.checked })} />
                                מבוסס פגישות (כמו יהלומים)
                            </label>
                            <label className="flex items-center gap-2 text-sm text-[#f0e6d3]/70">
                                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                                פעיל
                            </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-6">
                            <label className="flex items-center gap-2 text-sm text-[#f0e6d3]/70">
                                <input type="checkbox" checked={form.requires_gabbai} onChange={(e) => setForm({ ...form, requires_gabbai: e.target.checked })} />
                                מצריך רישום כגבאי (כמו קידושים)
                            </label>
                            <label className="flex items-center gap-2 text-sm text-[#f0e6d3]/70">
                                <input type="checkbox" checked={form.allows_custom_items_note} onChange={(e) => setForm({ ...form, allows_custom_items_note: e.target.checked })} />
                                מאפשר הערת פריטים נוספים בעגלה
                            </label>
                            <label className="flex items-center gap-2 text-sm text-[#f0e6d3]/70">
                                <input type="checkbox" checked={form.hide_prices} onChange={(e) => setForm({ ...form, hide_prices: e.target.checked })} />
                                הסתר מחירים באתר (עולם בבנייה)
                            </label>
                        </div>

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">מיון ברירת מחדל</label>
                            <select
                                value={form.default_sort}
                                onChange={(e) => setForm({ ...form, default_sort: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl bg-[#0e1628] border border-[#f0e6d3]/20 text-[#f0e6d3] text-sm focus:outline-none focus:border-[#d4af37]/50"
                            >
                                {SORT_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">סדר הצגה</label>
                            <input
                                type="number"
                                value={form.display_order}
                                onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
                                className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                            />
                        </div>

                        {/* Attribute fields builder */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs text-[#f0e6d3]/50 block font-bold uppercase tracking-wider">מאפיינים ייחודיים לעולם</label>
                                <button type="button" onClick={addAttrField} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#d4af37]/10 text-[#d4af37] hover:bg-[#d4af37]/20 transition-colors">
                                    <PlusCircle size={13} /> הוסף שדה
                                </button>
                            </div>
                            <div className="space-y-3">
                                {form.attribute_fields.map((field, i) => (
                                    <div key={i} className="bg-[#111a2f] rounded-xl p-3 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <input
                                                placeholder="מזהה (carat)"
                                                dir="ltr"
                                                value={field.key}
                                                onChange={(e) => updateAttrField(i, { key: e.target.value.replace(/[^a-z0-9_]/g, '') })}
                                                className="flex-1 bg-[#0e1628] rounded-lg px-3 py-2 text-sm text-[#f0e6d3]"
                                            />
                                            <select
                                                value={field.type}
                                                onChange={(e) => updateAttrField(i, { type: e.target.value as FormAttrField['type'] })}
                                                className="bg-[#0e1628] rounded-lg px-3 py-2 text-sm text-[#f0e6d3]"
                                            >
                                                <option value="text">טקסט</option>
                                                <option value="number">מספר</option>
                                                <option value="select">בחירה</option>
                                            </select>
                                            <button type="button" onClick={() => removeAttrField(i)} className="text-red-400/50 hover:text-red-400 transition-colors shrink-0 p-2 -m-2">
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <input
                                                placeholder="תווית בעברית"
                                                value={field.label_he}
                                                onChange={(e) => updateAttrField(i, { label_he: e.target.value })}
                                                className="bg-[#0e1628] rounded-lg px-3 py-2 text-sm text-[#f0e6d3]"
                                            />
                                            <input
                                                placeholder="תווית באנגלית"
                                                dir="ltr"
                                                value={field.label_en}
                                                onChange={(e) => updateAttrField(i, { label_en: e.target.value })}
                                                className="bg-[#0e1628] rounded-lg px-3 py-2 text-sm text-[#f0e6d3]"
                                            />
                                        </div>
                                        {field.type === 'select' ? (
                                            <input
                                                placeholder="אפשרויות, מופרדות בפסיקים"
                                                value={field.options}
                                                onChange={(e) => updateAttrField(i, { options: e.target.value })}
                                                className="w-full bg-[#0e1628] rounded-lg px-3 py-2 text-sm text-[#f0e6d3]"
                                            />
                                        ) : (
                                            <input
                                                placeholder="Placeholder (אופציונלי)"
                                                dir="ltr"
                                                value={field.placeholder}
                                                onChange={(e) => updateAttrField(i, { placeholder: e.target.value })}
                                                className="w-full bg-[#0e1628] rounded-lg px-3 py-2 text-sm text-[#f0e6d3]"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                            {editVertical ? 'שמור שינויים' : 'שמור'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
