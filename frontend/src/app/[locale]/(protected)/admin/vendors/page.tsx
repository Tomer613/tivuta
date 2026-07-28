'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    adminListVendors, adminCreateVendor, adminUpdateVendor, adminDeleteVendor, adminSetVendorPortalAccess,
    adminListSettlements, adminOpenSettlementPeriod, adminSettlePeriod, adminListVerticals, CommissionSettlementPeriod, Vertical,
    adminListOrders, adminListVendorBatches, adminCreateVendorBatch, adminUpdateVendorBatchStatus,
    CustomerOrder, VendorPurchaseBatch,
} from '@/lib/api';
import { openPrintableTable, downloadCsv } from '@/lib/printDocument';
import { Plus, X, Loader2, Store, Pencil, Trash2, CheckCircle2, AlertCircle, KeyRound, Wallet, Boxes, Printer, Download, Square, CheckSquare } from 'lucide-react';

const BATCH_STATUS_LABEL: Record<string, string> = { open: 'פתוחה', ordered: 'הוזמנה', received: 'התקבלה' };
const BATCH_STATUS_COLOR: Record<string, string> = {
    open: 'bg-blue-500/20 text-blue-400',
    ordered: 'bg-[#d4af37]/20 text-[#d4af37]',
    received: 'bg-green-500/20 text-green-400',
};

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
    vertical: '',
    name_he: '',
    name_en: '',
    name_fr: '',
    name_yi: '',
    is_active: true,
    weekly: emptyWeekly() as Record<string, { enabled: boolean; start: string; end: string }>,
    slot_minutes: 30,
    commission_rate_percent: 0,
    points_rate_percent: '',
});

export default function AdminVendorsPage() {
    const { token } = useAuth();
    const [vendors, setVendors] = useState<any[]>([]);
    const [verticals, setVerticals] = useState<Vertical[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterVertical, setFilterVertical] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editVendor, setEditVendor] = useState<any | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [form, setForm] = useState(emptyForm());
    const [portalAccessVendor, setPortalAccessVendor] = useState<any | null>(null);
    const [portalEmail, setPortalEmail] = useState('');
    const [portalPassword, setPortalPassword] = useState('');
    const [savingPortalAccess, setSavingPortalAccess] = useState(false);
    const [settlementsVendor, setSettlementsVendor] = useState<any | null>(null);
    const [settlements, setSettlements] = useState<CommissionSettlementPeriod[]>([]);
    const [loadingSettlements, setLoadingSettlements] = useState(false);
    const [newPeriodStart, setNewPeriodStart] = useState('');
    const [newPeriodEnd, setNewPeriodEnd] = useState('');
    const [savingSettlement, setSavingSettlement] = useState(false);
    const [orders, setOrders] = useState<CustomerOrder[]>([]);
    const [batchesVendor, setBatchesVendor] = useState<any | null>(null);
    const [batches, setBatches] = useState<VendorPurchaseBatch[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());
    const [savingBatch, setSavingBatch] = useState(false);
    const [updatingBatchId, setUpdatingBatchId] = useState<number | null>(null);
    const [docsBatchId, setDocsBatchId] = useState<number | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    const load = () => {
        if (!token) return;
        setLoading(true);
        adminListVendors(token).then(setVendors).finally(() => setLoading(false));
    };

    useEffect(load, [token]);

    useEffect(() => {
        if (!token) return;
        adminListOrders(token).then(setOrders).catch(() => {});
    }, [token]);

    useEffect(() => {
        if (!token) return;
        adminListVerticals(token).then(setVerticals).catch(() => {});
    }, [token]);

    const VERTICAL_LABEL: Record<string, string> = Object.fromEntries(verticals.map((v) => [v.slug, v.label_he]));
    const activeVerticals = verticals.filter((v) => v.is_active);

    const filtered = filterVertical ? vendors.filter((v) => v.vertical === filterVertical) : vendors;

    const openCreateForm = () => {
        setEditVendor(null);
        setForm({ ...emptyForm(), vertical: activeVerticals[0]?.slug || '' });
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
            commission_rate_percent: vendor.commission_rate_percent ?? 0,
            points_rate_percent: vendor.points_rate_percent != null ? String(vendor.points_rate_percent) : '',
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
        const invalidDay = Object.values(form.weekly).find(
            (d) => d.enabled && (!d.start || !d.end || d.start >= d.end)
        );
        if (invalidDay) {
            showToast('עבור כל יום פעיל, יש להזין שעת התחלה מוקדמת משעת הסיום', 'error');
            return;
        }
        const payload = {
            vertical: form.vertical,
            name_he: form.name_he,
            name_en: form.name_en || null,
            name_fr: form.name_fr || null,
            name_yi: form.name_yi || null,
            is_active: form.is_active,
            availability: { weekly: form.weekly, slot_minutes: form.slot_minutes },
            commission_rate_percent: Number(form.commission_rate_percent) || 0,
            points_rate_percent: form.points_rate_percent !== '' ? Number(form.points_rate_percent) : null,
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

    const openPortalAccessForm = (vendor: any) => {
        setPortalAccessVendor(vendor);
        setPortalEmail(vendor.login_email || '');
        setPortalPassword('');
    };

    const closePortalAccessForm = () => {
        setPortalAccessVendor(null);
        setPortalEmail('');
        setPortalPassword('');
    };

    const handleSavePortalAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !portalAccessVendor) return;
        setSavingPortalAccess(true);
        try {
            await adminSetVendorPortalAccess(token, portalAccessVendor.id, portalEmail, portalPassword);
            showToast('פרטי הכניסה לפורטל הספק עודכנו ✓');
            closePortalAccessForm();
            load();
        } catch (err: any) {
            showToast(err.message || 'שגיאה בעדכון פרטי הכניסה', 'error');
        } finally {
            setSavingPortalAccess(false);
        }
    };

    const loadSettlements = (vendorId: number) => {
        if (!token) return;
        setLoadingSettlements(true);
        adminListSettlements(token, vendorId).then(setSettlements).finally(() => setLoadingSettlements(false));
    };

    const openSettlementsPanel = (vendor: any) => {
        setSettlementsVendor(vendor);
        setNewPeriodStart('');
        setNewPeriodEnd('');
        loadSettlements(vendor.id);
    };

    const closeSettlementsPanel = () => {
        setSettlementsVendor(null);
        setSettlements([]);
    };

    const handleOpenPeriod = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !settlementsVendor) return;
        setSavingSettlement(true);
        try {
            await adminOpenSettlementPeriod(token, settlementsVendor.id, newPeriodStart, newPeriodEnd);
            showToast('תקופת התחשבנות נפתחה ✓');
            setNewPeriodStart('');
            setNewPeriodEnd('');
            loadSettlements(settlementsVendor.id);
            load();
        } catch (err: any) {
            showToast(err.message || 'שגיאה בפתיחת תקופה', 'error');
        } finally {
            setSavingSettlement(false);
        }
    };

    const handleSettlePeriod = async (periodId: number) => {
        if (!token || !settlementsVendor) return;
        try {
            await adminSettlePeriod(token, settlementsVendor.id, periodId);
            showToast('התקופה סומנה כשולמה ✓');
            loadSettlements(settlementsVendor.id);
            load();
        } catch (err: any) {
            showToast(err.message || 'שגיאה בסימון תשלום', 'error');
        }
    };

    // ---- Vendor purchase batches (consolidate many customers' orders into one procurement) ----

    const unbatchedItemsForVendor = (vendorId: number) => {
        const items: { id: number; product_title_he: string; order_number: string; user_name: string; quantity: number }[] = [];
        orders.forEach((o) => {
            o.items.forEach((i) => {
                if (
                    i.lead_type === 'contact_request' &&
                    i.vendor_id === vendorId &&
                    !i.vendor_batch_id &&
                    i.status !== 'closed' &&
                    i.status !== 'cancelled'
                ) {
                    items.push({
                        id: i.id,
                        product_title_he: i.product_title_he || '—',
                        order_number: o.order_number,
                        user_name: o.user_name || '—',
                        quantity: i.quantity || 1,
                    });
                }
            });
        });
        return items;
    };

    const loadBatches = (vendorId: number) => {
        if (!token) return;
        setLoadingBatches(true);
        adminListVendorBatches(token, vendorId).then(setBatches).finally(() => setLoadingBatches(false));
    };

    const openBatchesPanel = (vendor: any) => {
        setBatchesVendor(vendor);
        setSelectedLeadIds(new Set());
        setDocsBatchId(null);
        loadBatches(vendor.id);
    };

    const closeBatchesPanel = () => {
        setBatchesVendor(null);
        setBatches([]);
        setSelectedLeadIds(new Set());
        setDocsBatchId(null);
    };

    const toggleSelectLead = (id: number) => setSelectedLeadIds((prev) => {
        const s = new Set(prev);
        s.has(id) ? s.delete(id) : s.add(id);
        return s;
    });

    const toggleSelectAllLeads = (ids: number[]) => setSelectedLeadIds((prev) =>
        prev.size === ids.length ? new Set() : new Set(ids)
    );

    const handleOpenBatch = async () => {
        if (!token || !batchesVendor || selectedLeadIds.size === 0) return;
        const requestedCount = selectedLeadIds.size;
        setSavingBatch(true);
        try {
            const batch = await adminCreateVendorBatch(token, batchesVendor.id, Array.from(selectedLeadIds));
            showToast(
                batch.items.length < requestedCount
                    ? `נפתחה אצווה עם ${batch.items.length} מתוך ${requestedCount} פריטים שנבחרו — השאר כבר שובצו לאצווה אחרת בינתיים`
                    : 'אצוות רכש נפתחה ✓'
            );
            setSelectedLeadIds(new Set());
            loadBatches(batchesVendor.id);
            adminListOrders(token).then(setOrders).catch(() => {});
        } catch (err: any) {
            showToast(err.message || 'שגיאה בפתיחת אצווה', 'error');
        } finally {
            setSavingBatch(false);
        }
    };

    const handleAdvanceBatchStatus = async (batch: VendorPurchaseBatch, nextStatus: string) => {
        if (!token || !batchesVendor) return;
        setUpdatingBatchId(batch.id);
        try {
            await adminUpdateVendorBatchStatus(token, batchesVendor.id, batch.id, nextStatus);
            showToast('סטטוס האצווה עודכן ✓');
            loadBatches(batchesVendor.id);
        } catch (err: any) {
            showToast(err.message || 'שגיאה בעדכון סטטוס', 'error');
        } finally {
            setUpdatingBatchId(null);
        }
    };

    const printPickingList = (batch: VendorPurchaseBatch) => {
        const byProduct = new Map<string, number>();
        batch.items.forEach((i) => {
            const key = i.product_title_he || '—';
            byProduct.set(key, (byProduct.get(key) || 0) + (i.quantity || 1));
        });
        const rows = Array.from(byProduct.entries()).map(([product, qty]) => [product, qty]);
        openPrintableTable(`רשימת ליקוט — ${batch.batch_number}`, ['מוצר', 'כמות כוללת'], rows);
    };

    const exportPickingListCsv = (batch: VendorPurchaseBatch) => {
        const byProduct = new Map<string, number>();
        batch.items.forEach((i) => {
            const key = i.product_title_he || '—';
            byProduct.set(key, (byProduct.get(key) || 0) + (i.quantity || 1));
        });
        const rows = Array.from(byProduct.entries()).map(([product, qty]) => [product, qty]);
        downloadCsv(`picking-list-${batch.batch_number}.csv`, ['מוצר', 'כמות כוללת'], rows);
    };

    const printPackingList = (batch: VendorPurchaseBatch) => {
        const rows = batch.items.map((i) => [
            i.order_number || '—',
            i.user_name || '—',
            i.user_phone || i.user_email || '—',
            i.product_title_he || '—',
            i.quantity || 1,
        ]);
        openPrintableTable(`רשימת חלוקה — ${batch.batch_number}`, ['הזמנה', 'לקוח', 'יצירת קשר', 'מוצר', 'כמות'], rows);
    };

    const exportPackingListCsv = (batch: VendorPurchaseBatch) => {
        const rows = batch.items.map((i) => [
            i.order_number || '—',
            i.user_name || '—',
            i.user_phone || i.user_email || '—',
            i.product_title_he || '—',
            i.quantity || 1,
        ]);
        downloadCsv(`packing-list-${batch.batch_number}.csv`, ['הזמנה', 'לקוח', 'יצירת קשר', 'מוצר', 'כמות'], rows);
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
                    {verticals.map((v) => <option key={v.slug} value={v.slug}>{v.label_he}</option>)}
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
                                <th className="p-4 text-start">עמלה</th>
                                <th className="p-4 text-start">חוב לTIVUTA</th>
                                <th className="p-4 text-start">סטטוס</th>
                                <th className="p-4 text-start">פעולות</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-[#f0e6d3]/40">אין ספקים עדיין</td>
                                </tr>
                            )}
                            {filtered.map((vendor) => {
                                const activeDays = Object.values(vendor.availability?.weekly || {}).filter((d: any) => d.enabled).length;
                                return (
                                    <tr key={vendor.id} className="border-t border-[#d4af37]/10 text-[#f0e6d3]">
                                        <td className="p-4 font-semibold">{vendor.name_he}</td>
                                        <td className="p-4 text-sm">{VERTICAL_LABEL[vendor.vertical] ?? vendor.vertical}</td>
                                        <td className="p-4 text-sm">{activeDays} מתוך 7</td>
                                        <td className="p-4 text-sm">{vendor.commission_rate_percent}%</td>
                                        <td className="p-4 text-sm text-[#d4af37]">₪{(vendor.commission_owed_total ?? 0).toLocaleString()}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${vendor.is_active ? 'bg-green-500/20 text-green-400' : 'bg-[#111a2f] text-[#f0e6d3]/40'}`}>
                                                {vendor.is_active ? 'פעיל' : 'כבוי'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => openPortalAccessForm(vendor)} className="text-[#d4af37]/50 hover:text-[#d4af37] transition-colors" title={vendor.login_email ? 'עדכון פרטי כניסה לפורטל' : 'הפעלת פורטל ספק'}>
                                                    <KeyRound size={15} />
                                                </button>
                                                <button onClick={() => openSettlementsPanel(vendor)} className="text-[#d4af37]/50 hover:text-[#d4af37] transition-colors" title="התחשבנות עמלות">
                                                    <Wallet size={15} />
                                                </button>
                                                <button onClick={() => openBatchesPanel(vendor)} className="text-[#d4af37]/50 hover:text-[#d4af37] transition-colors" title="אצוות רכש">
                                                    <Boxes size={15} />
                                                </button>
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
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">עולם{editVendor ? ' (לא ניתן לשינוי לאחר יצירה)' : ''}</label>
                            <select
                                value={form.vertical}
                                disabled={!!editVendor}
                                onChange={(e) => setForm({ ...form, vertical: e.target.value })}
                                className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3] disabled:opacity-50"
                            >
                                {activeVerticals.map((v) => <option key={v.slug} value={v.slug}>{v.label_he}</option>)}
                                {editVendor && !activeVerticals.some((v) => v.slug === form.vertical) && (
                                    <option value={form.vertical}>{VERTICAL_LABEL[form.vertical] || form.vertical}</option>
                                )}
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

                        <div className="border-t border-[#d4af37]/15 pt-4 grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-[#f0e6d3]/50 mb-1 block">אחוז עמלה ל-TIVUTA (%)</label>
                                <input
                                    type="number" min={0} max={100} step="0.1"
                                    value={form.commission_rate_percent}
                                    onChange={(e) => setForm({ ...form, commission_rate_percent: Number(e.target.value) })}
                                    className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                                    dir="ltr"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-[#f0e6d3]/50 mb-1 block">אחוז נקודות ללקוח (%, ריק = ברירת מחדל)</label>
                                <input
                                    type="number" min={0} max={100} step="0.1"
                                    value={form.points_rate_percent}
                                    onChange={(e) => setForm({ ...form, points_rate_percent: e.target.value })}
                                    placeholder="ברירת מחדל"
                                    className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                                    dir="ltr"
                                />
                            </div>
                        </div>

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

            {portalAccessVendor && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6" onClick={closePortalAccessForm}>
                    <form onSubmit={handleSavePortalAccess} className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-[#f0e6d3] flex items-center gap-2">
                                <KeyRound size={20} /> פורטל ספק — {portalAccessVendor.name_he}
                            </h2>
                            <button type="button" onClick={closePortalAccessForm}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>
                        <p className="text-xs text-[#f0e6d3]/50">הזן/י אימייל וסיסמה שהספק ישתמש בהם כדי להתחבר לפורטל דיווח העסקאות שלו.</p>
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">אימייל כניסה</label>
                            <input
                                required
                                type="email"
                                value={portalEmail}
                                onChange={(e) => setPortalEmail(e.target.value)}
                                className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">סיסמה חדשה (8 תווים לפחות)</label>
                            <input
                                required
                                type="text"
                                minLength={8}
                                value={portalPassword}
                                onChange={(e) => setPortalPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                                dir="ltr"
                            />
                        </div>
                        <button type="submit" disabled={savingPortalAccess} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
                            {savingPortalAccess ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />}
                            שמור פרטי כניסה
                        </button>
                    </form>
                </div>
            )}

            {settlementsVendor && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6 overflow-y-auto" onClick={closeSettlementsPanel}>
                    <div className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-lg space-y-5 my-8" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-black text-[#f0e6d3] flex items-center gap-2">
                                <Wallet size={20} /> התחשבנות — {settlementsVendor.name_he}
                            </h2>
                            <button type="button" onClick={closeSettlementsPanel}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>
                        <div className="text-sm text-[#f0e6d3]/70">
                            חוב נוכחי: <span className="text-[#d4af37] font-bold">₪{(settlementsVendor.commission_owed_total ?? 0).toLocaleString()}</span>
                        </div>

                        <form onSubmit={handleOpenPeriod} className="bg-[#111a2f] rounded-2xl p-4 space-y-3">
                            <label className="text-xs text-[#f0e6d3]/50 font-bold uppercase tracking-wider block">פתיחת תקופת התחשבנות חדשה</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    required
                                    type="datetime-local"
                                    value={newPeriodStart}
                                    onChange={(e) => setNewPeriodStart(e.target.value)}
                                    style={{ colorScheme: 'dark' }}
                                    className="bg-[#0e1628] border border-[#d4af37]/20 rounded-lg px-3 py-2 text-sm text-[#f0e6d3]"
                                />
                                <input
                                    required
                                    type="datetime-local"
                                    value={newPeriodEnd}
                                    onChange={(e) => setNewPeriodEnd(e.target.value)}
                                    style={{ colorScheme: 'dark' }}
                                    className="bg-[#0e1628] border border-[#d4af37]/20 rounded-lg px-3 py-2 text-sm text-[#f0e6d3]"
                                />
                            </div>
                            <button type="submit" disabled={savingSettlement} className="btn-primary w-full !text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                                {savingSettlement ? <Loader2 className="animate-spin" size={14} /> : <Wallet size={14} />}
                                פתח תקופה (יסכם עסקאות שלא שולמו בטווח זה)
                            </button>
                        </form>

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 font-bold uppercase tracking-wider mb-2 block">היסטוריית תקופות</label>
                            {loadingSettlements ? (
                                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={20} />
                            ) : settlements.length === 0 ? (
                                <p className="text-xs text-[#f0e6d3]/40 text-center py-4">אין תקופות התחשבנות עדיין</p>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {settlements.map((p) => (
                                        <div key={p.id} className="flex items-center justify-between bg-[#111a2f] rounded-xl px-4 py-3 text-sm">
                                            <div>
                                                <div className="text-[#f0e6d3]">
                                                    {new Date(p.period_start).toLocaleDateString('he-IL')} – {new Date(p.period_end).toLocaleDateString('he-IL')}
                                                </div>
                                                <div className="text-[#d4af37] font-bold">₪{p.total_amount_ils.toLocaleString()}</div>
                                            </div>
                                            {p.status === 'settled' ? (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-400">שולם</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleSettlePeriod(p.id)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
                                                >
                                                    סמן כשולם
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {batchesVendor && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6 overflow-y-auto" onClick={closeBatchesPanel}>
                    <div className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-2xl space-y-5 my-8" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-black text-[#f0e6d3] flex items-center gap-2">
                                <Boxes size={20} /> אצוות רכש — {batchesVendor.name_he}
                            </h2>
                            <button type="button" onClick={closeBatchesPanel}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>

                        {(() => {
                            const unbatched = unbatchedItemsForVendor(batchesVendor.id);
                            const allIds = unbatched.map((i) => i.id);
                            return (
                                <div className="bg-[#111a2f] rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-[#f0e6d3]/50 font-bold uppercase tracking-wider">
                                            הזמנות פעילות שטרם שובצו לאצווה ({unbatched.length})
                                        </label>
                                        {unbatched.length > 0 && (
                                            <button onClick={() => toggleSelectAllLeads(allIds)} className="text-xs text-[#d4af37] hover:text-[#d4af37]/70 flex items-center gap-1">
                                                {selectedLeadIds.size === allIds.length ? <CheckSquare size={13} /> : <Square size={13} />}
                                                בחר הכל
                                            </button>
                                        )}
                                    </div>
                                    {unbatched.length === 0 ? (
                                        <p className="text-xs text-[#f0e6d3]/40 text-center py-3">אין כרגע הזמנות פעילות של ספק זה שטרם שובצו לאצווה</p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-56 overflow-y-auto">
                                            {unbatched.map((item) => (
                                                <label key={item.id} className="flex items-center gap-2.5 bg-[#0e1628] rounded-lg px-3 py-2 text-xs text-[#f0e6d3] cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedLeadIds.has(item.id)}
                                                        onChange={() => toggleSelectLead(item.id)}
                                                        className="accent-[#d4af37] w-4 h-4 shrink-0"
                                                    />
                                                    <span className="flex-1 truncate">{item.product_title_he} {item.quantity > 1 && <span className="text-[#d4af37] font-bold">×{item.quantity}</span>}</span>
                                                    <span className="text-[#f0e6d3]/40 shrink-0">{item.order_number}</span>
                                                    <span className="text-[#f0e6d3]/40 shrink-0">{item.user_name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                    <button
                                        onClick={handleOpenBatch}
                                        disabled={savingBatch || selectedLeadIds.size === 0}
                                        className="btn-primary w-full !text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                                    >
                                        {savingBatch ? <Loader2 className="animate-spin" size={14} /> : <Boxes size={14} />}
                                        פתח אצווית רכש ({selectedLeadIds.size} פריטים נבחרים)
                                    </button>
                                </div>
                            );
                        })()}

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 font-bold uppercase tracking-wider mb-2 block">היסטוריית אצוות</label>
                            {loadingBatches ? (
                                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={20} />
                            ) : batches.length === 0 ? (
                                <p className="text-xs text-[#f0e6d3]/40 text-center py-4">אין אצוות רכש עדיין</p>
                            ) : (
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    {batches.map((b) => (
                                        <div key={b.id} className="bg-[#111a2f] rounded-xl px-4 py-3 text-sm space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-[#f0e6d3] font-bold">{b.batch_number}</span>
                                                    <span className="text-[#f0e6d3]/40 text-xs ms-2">{b.items.length} פריטים · {new Date(b.created_at).toLocaleDateString('he-IL')}</span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${BATCH_STATUS_COLOR[b.status]}`}>
                                                    {BATCH_STATUS_LABEL[b.status] ?? b.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {b.status === 'open' && (
                                                    <button
                                                        onClick={() => handleAdvanceBatchStatus(b, 'ordered')}
                                                        disabled={updatingBatchId === b.id}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors disabled:opacity-50"
                                                    >
                                                        {updatingBatchId === b.id ? <Loader2 className="animate-spin" size={12} /> : 'סמן כהוזמן'}
                                                    </button>
                                                )}
                                                {b.status === 'ordered' && (
                                                    <button
                                                        onClick={() => handleAdvanceBatchStatus(b, 'received')}
                                                        disabled={updatingBatchId === b.id}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                                                    >
                                                        {updatingBatchId === b.id ? <Loader2 className="animate-spin" size={12} /> : 'סמן כהתקבל'}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setDocsBatchId(docsBatchId === b.id ? null : b.id)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d4af37]/15 text-[#d4af37] hover:bg-[#d4af37]/25 transition-colors"
                                                >
                                                    מסמכים
                                                </button>
                                            </div>

                                            {docsBatchId === b.id && (
                                                <div className="border-t border-[#d4af37]/10 pt-2.5 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-[#f0e6d3]/60">רשימת ליקוט (סה״כ לפי מוצר)</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <button onClick={() => printPickingList(b)} className="p-1.5 rounded-lg bg-[#0e1628] text-[#d4af37]/70 hover:text-[#d4af37]" title="הדפס">
                                                                <Printer size={13} />
                                                            </button>
                                                            <button onClick={() => exportPickingListCsv(b)} className="p-1.5 rounded-lg bg-[#0e1628] text-[#d4af37]/70 hover:text-[#d4af37]" title="CSV">
                                                                <Download size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-[#f0e6d3]/60">רשימת חלוקה (לפי הזמנת לקוח)</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <button onClick={() => printPackingList(b)} className="p-1.5 rounded-lg bg-[#0e1628] text-[#d4af37]/70 hover:text-[#d4af37]" title="הדפס">
                                                                <Printer size={13} />
                                                            </button>
                                                            <button onClick={() => exportPackingListCsv(b)} className="p-1.5 rounded-lg bg-[#0e1628] text-[#d4af37]/70 hover:text-[#d4af37]" title="CSV">
                                                                <Download size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-[#f0e6d3]/30">
                                                        רשימת החלוקה מציגה פרטי יצירת קשר עם הלקוח (טלפון/מייל) — להזמנות מוצר רגילות אין כתובת משלוח שמורה במערכת.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
