'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminListVendors, adminCreateVendor, adminUpdateVendor, adminDeleteVendor } from '@/lib/api';
import { Plus, X, Loader2, Store, Pencil, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

const VERTICAL_LABEL: Record<string, string> = { diamonds: 'יהלומים', cars: 'רכב', insurance: 'ביטוח' };
const VERTICALS = ['diamonds', 'cars', 'insurance'];
const WEEKDAY_LABELS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const SLOT_OPTIONS = [15, 30, 60];

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

function emptyWeekly() {
    return Object.fromEntries(
        Array.from({ length: 7 }, (_, i) => [String(i), { enabled: false, start: '10:00', end: '18:00' }])
    );
}

const emptyForm = () => ({
    vertical: 'diamonds',
    name_he: '',
    name_en: '',
    name_fr: '',
    name_yi: '',
    is_active: true,
    weekly: emptyWeekly() as Record<string, { enabled: boolean; start: string; end: string }>,
    slot_minutes: 30,
});

export default function AdminVendorsPage() {
    const { token } = useAuth();
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterVertical, setFilterVertical] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editVendor, setEditVendor] = useState<any | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [form, setForm] = useState(emptyForm());

    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    const load = () => {
        if (!token) return;
        setLoading(true);
        adminListVendors(token).then(setVendors).finally(() => setLoading(false));
    };

    useEffect(load, [token]);

    const filtered = filterVertical ? vendors.filter((v) => v.vertical === filterVertical) : vendors;

    const openCreateForm = () => {
        setEditVendor(null);
        setForm(emptyForm());
        setShowForm(true);
    };

    const openEditForm = (vendor: any) => {
        setEditVendor(vendor);
        const weekly = { ...emptyWeekly(), ...(vendor.availability?.weekly || {}) };
        setForm({
            vertical: vendor.vertical,
            name_he: vendor.name_he,
            name_en: vendor.name_en || '',
            name_fr: vendor.name_fr || '',
            name_yi: vendor.name_yi || '',
            is_active: vendor.is_active,
            weekly,
            slot_minutes: vendor.availability?.slot_minutes || 30,
        });
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditVendor(null);
        setForm(emptyForm());
    };

    const toggleDay = (dayKey: string) => {
        setForm((f) => ({
            ...f,
            weekly: { ...f.weekly, [dayKey]: { ...f.weekly[dayKey], enabled: !f.weekly[dayKey].enabled } },
        }));
    };

    const setDayTime = (dayKey: string, field: 'start' | 'end', value: string) => {
        setForm((f) => ({
            ...f,
            weekly: { ...f.weekly, [dayKey]: { ...f.weekly[dayKey], [field]: value } },
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        const payload = {
            vertical: form.vertical,
            name_he: form.name_he,
            name_en: form.name_en || null,
            name_fr: form.name_fr || null,
            name_yi: form.name_yi || null,
            is_active: form.is_active,
            availability: { weekly: form.weekly, slot_minutes: form.slot_minutes },
        };
        try {
            if (editVendor) {
                await adminUpdateVendor(token, editVendor.id, payload);
                showToast('הספק עודכן בהצלחה ✓');
            } else {
                await adminCreateVendor(token, payload);
                showToast('הספק נוצר בהצלחה ✓');
            }
            closeForm();
            load();
        } catch (err: any) {
            showToast(err.message || 'שגיאה בשמירת הספק', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!token) return;
        try {
            await adminDeleteVendor(token, id);
            setDeletingId(null);
            showToast('הספק הושבת');
            load();
        } catch {
            showToast('שגיאה במחיקה', 'error');
        }
    };

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-black text-[#f0e6d3] flex items-center gap-2">
                    <Store size={26} className="text-[#d4af37]" /> ספקים / חנויות
                </h1>
                <button onClick={openCreateForm} className="btn-primary flex items-center gap-2 !text-sm">
                    <Plus size={16} /> ספק חדש
                </button>
            </div>

            <div className="flex items-center gap-3 mb-6">
                <select value={filterVertical} onChange={(e) => setFilterVertical(e.target.value)} className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]">
                    <option value="">כל העולמות</option>
                    {VERTICALS.map((v) => <option key={v} value={v}>{VERTICAL_LABEL[v]}</option>)}
                </select>
            </div>

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={32} />
            ) : (
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-hidden">
                    <table className="w-full text-start">
                        <thead className="bg-[#111a2f] text-[#f0e6d3]/60 text-xs uppercase">
                            <tr>
                                <th className="p-4 text-start">שם הספק</th>
                                <th className="p-4 text-start">עולם</th>
                                <th className="p-4 text-start">ימים פעילים</th>
                                <th className="p-4 text-start">סטטוס</th>
                                <th className="p-4 text-start">פעולות</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-[#f0e6d3]/40">אין ספקים עדיין</td>
                                </tr>
                            )}
                            {filtered.map((vendor) => {
                                const activeDays = Object.values(vendor.availability?.weekly || {}).filter((d: any) => d.enabled).length;
                                return (
                                    <tr key={vendor.id} className="border-t border-[#d4af37]/10 text-[#f0e6d3]">
                                        <td className="p-4 font-semibold">{vendor.name_he}</td>
                                        <td className="p-4 text-sm">{VERTICAL_LABEL[vendor.vertical] ?? vendor.vertical}</td>
                                        <td className="p-4 text-sm">{activeDays} מתוך 7</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${vendor.is_active ? 'bg-green-500/20 text-green-400' : 'bg-[#111a2f] text-[#f0e6d3]/40'}`}>
                                                {vendor.is_active ? 'פעיל' : 'כבוי'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => openEditForm(vendor)} className="text-[#d4af37]/50 hover:text-[#d4af37] transition-colors" title="עריכה">
                                                    <Pencil size={15} />
                                                </button>
                                                {deletingId === vendor.id ? (
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <span className="text-[#f0e6d3]/50">בטוח?</span>
                                                        <button onClick={() => handleDelete(vendor.id)} className="text-red-400 font-bold hover:text-red-300">כן</button>
                                                        <button onClick={() => setDeletingId(null)} className="text-[#f0e6d3]/40 hover:text-[#f0e6d3]">לא</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setDeletingId(vendor.id)} className="text-red-400/30 hover:text-red-400 transition-colors" title="השבת ספק">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6 overflow-y-auto" onClick={closeForm}>
                    <form onSubmit={handleSubmit} className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-lg space-y-4 my-8" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-[#f0e6d3] flex items-center gap-2">
                                <Store size={20} /> {editVendor ? 'עריכת ספק' : 'ספק חדש'}
                            </h2>
                            <button type="button" onClick={closeForm}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">עולם</label>
                            <select
                                value={form.vertical}
                                onChange={(e) => setForm({ ...form, vertical: e.target.value })}
                                className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                            >
                                {VERTICALS.map((v) => <option key={v} value={v}>{VERTICAL_LABEL[v]}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">שם הספק (עברית)</label>
                            <input
                                required
                                placeholder="שם הספק"
                                value={form.name_he}
                                onChange={(e) => setForm({ ...form, name_he: e.target.value })}
                                className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <input placeholder="שם (אנגלית)" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className="bg-[#111a2f] rounded-xl px-3 py-2 text-sm text-[#f0e6d3]" />
                            <input placeholder="שם (צרפתית)" value={form.name_fr} onChange={(e) => setForm({ ...form, name_fr: e.target.value })} className="bg-[#111a2f] rounded-xl px-3 py-2 text-sm text-[#f0e6d3]" />
                            <input placeholder="שם (יידיש)" value={form.name_yi} onChange={(e) => setForm({ ...form, name_yi: e.target.value })} className="bg-[#111a2f] rounded-xl px-3 py-2 text-sm text-[#f0e6d3]" />
                        </div>

                        <label className="flex items-center gap-2 text-sm text-[#f0e6d3]/70">
                            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-[#d4af37] w-4 h-4" />
                            ספק פעיל
                        </label>

                        <div className="border-t border-[#d4af37]/15 pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-xs text-[#f0e6d3]/50 font-bold uppercase tracking-wider">ימי ושעות זמינות לפגישות</label>
                                <select
                                    value={form.slot_minutes}
                                    onChange={(e) => setForm({ ...form, slot_minutes: Number(e.target.value) })}
                                    className="bg-[#111a2f] rounded-lg px-2 py-1 text-xs text-[#f0e6d3]"
                                >
                                    {SLOT_OPTIONS.map((m) => <option key={m} value={m}>{m} דק׳ לתור</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                {WEEKDAY_LABELS.map((label, i) => {
                                    const dayKey = String(i);
                                    const day = form.weekly[dayKey];
                                    return (
                                        <div key={dayKey} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${day.enabled ? 'bg-[#111a2f]' : 'bg-[#111a2f]/40'}`}>
                                            <label className="flex items-center gap-2 w-20 shrink-0 cursor-pointer">
                                                <input type="checkbox" checked={day.enabled} onChange={() => toggleDay(dayKey)} className="accent-[#d4af37] w-4 h-4" />
                                                <span className={`text-sm font-semibold ${day.enabled ? 'text-[#f0e6d3]' : 'text-[#f0e6d3]/30'}`}>{label}</span>
                                            </label>
                                            <input
                                                type="time"
                                                disabled={!day.enabled}
                                                value={day.start}
                                                onChange={(e) => setDayTime(dayKey, 'start', e.target.value)}
                                                style={{ colorScheme: 'dark' }}
                                                className="flex-1 bg-[#0e1628] border border-[#d4af37]/20 rounded-lg px-2 py-1.5 text-xs text-[#f0e6d3] disabled:opacity-30"
                                            />
                                            <span className="text-[#f0e6d3]/30 text-xs">עד</span>
                                            <input
                                                type="time"
                                                disabled={!day.enabled}
                                                value={day.end}
                                                onChange={(e) => setDayTime(dayKey, 'end', e.target.value)}
                                                style={{ colorScheme: 'dark' }}
                                                className="flex-1 bg-[#0e1628] border border-[#d4af37]/20 rounded-lg px-2 py-1.5 text-xs text-[#f0e6d3] disabled:opacity-30"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <button type="submit" className="btn-primary w-full">{editVendor ? 'שמור שינויים' : 'שמור ספק'}</button>
                    </form>
                </div>
            )}
        </div>
    );
}
