'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    adminListSettings, adminUpdateSettings, SystemSetting,
    adminListSales, adminCreateSale, adminReviewSale, SaleTransaction,
    adminListAtRiskVendors, adminCheckUnsettledDeactivation, VendorAtRisk,
    adminListVendors, Vendor,
} from '@/lib/api';
import { ShieldAlert, Loader2, CheckCircle2, AlertCircle, Settings, Flag, Wallet, Check, Undo2, ReceiptText, Send } from 'lucide-react';

function newIdempotencyKey(): string {
    return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `key-${Date.now()}-${Math.random()}`;
}

const SETTING_LABELS: Record<string, string> = {
    point_value_ils: 'ערך נקודה (₪)',
    default_points_rate_percent: 'אחוז נקודות ברירת מחדל (%)',
    default_commission_rate_percent: 'אחוז עמלה ברירת מחדל (%)',
    min_transaction_ils: 'סכום עסקה מינימלי (₪)',
    max_transaction_ils: 'סכום עסקה מקסימלי (₪)',
    max_vendor_sales_per_hour: 'מקסימום עסקאות לספק בשעה',
    max_customer_vendor_sales_per_day: 'מקסימום עסקאות ללקוח-ספק ביום',
    max_unsettled_ils_before_deactivate: 'סף חוב להשבתה אוטומטית (₪)',
    unsettled_grace_days: 'ימי חסד לפני השבתה',
};
const SETTING_ORDER = Object.keys(SETTING_LABELS);

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold ${
            type === 'success' ? 'bg-[#0e1628] border border-green-500/50 text-green-400' : 'bg-[#0e1628] border border-red-500/50 text-red-400'
        }`}>
            {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message}
        </div>
    );
}

export default function AdminLoyaltyPage() {
    const { token } = useAuth();
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    const [settings, setSettings] = useState<Record<string, string>>({});
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);

    const [flaggedSales, setFlaggedSales] = useState<SaleTransaction[]>([]);
    const [salesLoading, setSalesLoading] = useState(true);
    const [reviewingId, setReviewingId] = useState<number | null>(null);

    const [atRiskVendors, setAtRiskVendors] = useState<VendorAtRisk[]>([]);
    const [atRiskLoading, setAtRiskLoading] = useState(true);
    const [checkingDeactivation, setCheckingDeactivation] = useState(false);

    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [manualForm, setManualForm] = useState({ vendorId: '', customerNumber: '', amountIls: '', productId: '' });
    const [manualIdempotencyKey, setManualIdempotencyKey] = useState(newIdempotencyKey);
    const [submittingManualSale, setSubmittingManualSale] = useState(false);

    const loadSettings = () => {
        if (!token) return;
        setSettingsLoading(true);
        adminListSettings(token)
            .then((rows) => setSettings(Object.fromEntries(rows.map((r: SystemSetting) => [r.key, r.value]))))
            .finally(() => setSettingsLoading(false));
    };

    const loadFlaggedSales = () => {
        if (!token) return;
        setSalesLoading(true);
        adminListSales(token, { status: 'flagged' }).then(setFlaggedSales).finally(() => setSalesLoading(false));
    };

    const loadAtRisk = () => {
        if (!token) return;
        setAtRiskLoading(true);
        adminListAtRiskVendors(token).then(setAtRiskVendors).finally(() => setAtRiskLoading(false));
    };

    useEffect(() => {
        loadSettings();
        loadFlaggedSales();
        loadAtRisk();
        if (token) adminListVendors(token).then(setVendors).catch(() => {});
    }, [token]);

    const handleSaveSettings = async () => {
        if (!token) return;
        setSavingSettings(true);
        try {
            await adminUpdateSettings(token, settings);
            showToast('ההגדרות נשמרו ✓');
        } catch (err: any) {
            showToast(err.message || 'שגיאה בשמירת ההגדרות', 'error');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleReview = async (saleId: number, action: 'confirm' | 'reverse') => {
        if (!token) return;
        setReviewingId(saleId);
        try {
            await adminReviewSale(token, saleId, action);
            showToast(action === 'confirm' ? 'העסקה אושרה ✓' : 'העסקה בוטלה');
            setFlaggedSales((prev) => prev.filter((s) => s.id !== saleId));
        } catch (err: any) {
            showToast(err.message || 'שגיאה בעדכון העסקה', 'error');
        } finally {
            setReviewingId(null);
        }
    };

    const handleSubmitManualSale = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !manualForm.vendorId) return;
        setSubmittingManualSale(true);
        try {
            const sale = await adminCreateSale(token, {
                vendor_id: Number(manualForm.vendorId),
                customer_number: manualForm.customerNumber.trim(),
                amount_ils: Number(manualForm.amountIls),
                product_id: manualForm.productId ? Number(manualForm.productId) : null,
                idempotency_key: manualIdempotencyKey,
            });
            showToast(
                sale.status === 'flagged'
                    ? 'העסקה נרשמה אך סומנה לבדיקה (חרגה מהמגבלות) — הנקודות ימתינו לאישור'
                    : `העסקה נרשמה ואושרה ✓ (${sale.points_awarded} נקודות, עמלה ₪${sale.commission_owed_ils})`
            );
            setManualForm({ vendorId: manualForm.vendorId, customerNumber: '', amountIls: '', productId: '' });
            setManualIdempotencyKey(newIdempotencyKey());
            loadFlaggedSales();
            loadAtRisk();
        } catch (err: any) {
            showToast(err.message || 'שגיאה ברישום העסקה', 'error');
        } finally {
            setSubmittingManualSale(false);
        }
    };

    const handleCheckDeactivation = async () => {
        if (!token) return;
        setCheckingDeactivation(true);
        try {
            const result = await adminCheckUnsettledDeactivation(token);
            if (result.deactivated.length > 0) {
                showToast(`${result.deactivated.length} ספקים הושבתו: ${result.deactivated.map((v) => v.name_he).join(', ')}`);
            } else {
                showToast(`נבדקו ${result.checked} ספקים — אף אחד לא הושבת`);
            }
            loadAtRisk();
        } catch (err: any) {
            showToast(err.message || 'שגיאה בבדיקה', 'error');
        } finally {
            setCheckingDeactivation(false);
        }
    };

    return (
        <div className="space-y-8">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <h1 className="text-3xl font-black text-[#f0e6d3] flex items-center gap-2">
                <ShieldAlert size={26} className="text-[#d4af37]" /> נאמנות והונאות
            </h1>

            {/* ── Manual sale entry (admin-as-vendor-proxy) ── */}
            <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-6">
                <h2 className="text-sm font-black text-[#f0e6d3] uppercase tracking-widest mb-1 flex items-center gap-2">
                    <ReceiptText size={15} className="text-[#d4af37]" /> רישום עסקה ידני
                </h2>
                <p className="text-xs text-[#f0e6d3]/40 mb-5">לדיווח עסקה בשם ספק שאין לו עדיין גישה לפורטל הספקים העצמאי</p>
                <form onSubmit={handleSubmitManualSale} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-[#f0e6d3]/50 mb-1 block">ספק</label>
                        <select
                            required
                            value={manualForm.vendorId}
                            onChange={(e) => setManualForm({ ...manualForm, vendorId: e.target.value })}
                            className="w-full bg-[#111a2f] border border-[#d4af37]/20 rounded-xl px-4 py-2.5 text-sm text-[#f0e6d3]"
                        >
                            <option value="">בחר ספק...</option>
                            {vendors.filter((v) => v.is_active).map((v) => (
                                <option key={v.id} value={v.id}>{v.name_he}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-[#f0e6d3]/50 mb-1 block">מספר לקוח סידורי</label>
                        <input
                            required
                            value={manualForm.customerNumber}
                            onChange={(e) => setManualForm({ ...manualForm, customerNumber: e.target.value })}
                            placeholder="TVT-XXXXXXXXXX"
                            className="w-full bg-[#111a2f] border border-[#d4af37]/20 rounded-xl px-4 py-2.5 text-sm text-[#f0e6d3]"
                            dir="ltr"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-[#f0e6d3]/50 mb-1 block">סכום העסקה (₪)</label>
                        <input
                            required
                            type="number"
                            min={0}
                            step="0.01"
                            value={manualForm.amountIls}
                            onChange={(e) => setManualForm({ ...manualForm, amountIls: e.target.value })}
                            className="w-full bg-[#111a2f] border border-[#d4af37]/20 rounded-xl px-4 py-2.5 text-sm text-[#f0e6d3]"
                            dir="ltr"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-[#f0e6d3]/50 mb-1 block">מזהה מוצר (אופציונלי)</label>
                        <input
                            type="number"
                            value={manualForm.productId}
                            onChange={(e) => setManualForm({ ...manualForm, productId: e.target.value })}
                            placeholder="לא חובה"
                            className="w-full bg-[#111a2f] border border-[#d4af37]/20 rounded-xl px-4 py-2.5 text-sm text-[#f0e6d3]"
                            dir="ltr"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={submittingManualSale}
                        className="btn-primary !text-sm flex items-center justify-center gap-2 disabled:opacity-60 sm:col-span-2"
                    >
                        {submittingManualSale ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                        רשום עסקה
                    </button>
                </form>
            </div>

            {/* ── System settings ── */}
            <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-6">
                <h2 className="text-sm font-black text-[#f0e6d3] uppercase tracking-widest mb-5 flex items-center gap-2">
                    <Settings size={15} className="text-[#d4af37]" /> הגדרות מערכת
                </h2>
                {settingsLoading ? (
                    <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={24} />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {SETTING_ORDER.map((key) => (
                            <div key={key}>
                                <label className="text-xs text-[#f0e6d3]/50 mb-1 block">{SETTING_LABELS[key] || key}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={settings[key] ?? ''}
                                    onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                                    className="w-full bg-[#111a2f] border border-[#d4af37]/20 rounded-xl px-4 py-2.5 text-sm text-[#f0e6d3]"
                                    dir="ltr"
                                />
                            </div>
                        ))}
                    </div>
                )}
                <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings || settingsLoading}
                    className="btn-primary mt-5 !text-sm flex items-center gap-2 disabled:opacity-60"
                >
                    {savingSettings ? <Loader2 className="animate-spin" size={14} /> : null}
                    שמור הגדרות
                </button>
            </div>

            {/* ── Flagged sales ── */}
            <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-6">
                <h2 className="text-sm font-black text-[#f0e6d3] uppercase tracking-widest mb-5 flex items-center gap-2">
                    <Flag size={15} className="text-orange-400" /> עסקאות מסומנות לבדיקה ({flaggedSales.length})
                </h2>
                {salesLoading ? (
                    <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={24} />
                ) : flaggedSales.length === 0 ? (
                    <p className="text-[#f0e6d3]/40 text-sm text-center py-6">אין עסקאות הממתינות לבדיקה כרגע</p>
                ) : (
                    <div className="space-y-2">
                        {flaggedSales.map((sale) => (
                            <div key={sale.id} className="flex items-center justify-between gap-4 bg-[#111a2f] rounded-xl px-4 py-3 flex-wrap">
                                <div>
                                    <p className="text-sm font-semibold text-[#f0e6d3]">
                                        {sale.vendor_name_he} ← {sale.customer_name}
                                    </p>
                                    <p className="text-xs text-[#f0e6d3]/40 mt-0.5">
                                        ₪{sale.amount_ils.toLocaleString()} · {sale.points_awarded} נקודות · עמלה ₪{sale.commission_owed_ils.toLocaleString()} ·{' '}
                                        {new Date(sale.reported_at).toLocaleString('he-IL')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleReview(sale.id, 'confirm')}
                                        disabled={reviewingId === sale.id}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-50"
                                    >
                                        <Check size={13} /> אשר
                                    </button>
                                    <button
                                        onClick={() => handleReview(sale.id, 'reverse')}
                                        disabled={reviewingId === sale.id}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                                    >
                                        <Undo2 size={13} /> בטל
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── At-risk vendors ── */}
            <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-6">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                    <h2 className="text-sm font-black text-[#f0e6d3] uppercase tracking-widest flex items-center gap-2">
                        <Wallet size={15} className="text-[#d4af37]" /> ספקים עם חוב פתוח
                    </h2>
                    <button
                        onClick={handleCheckDeactivation}
                        disabled={checkingDeactivation}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                    >
                        {checkingDeactivation ? <Loader2 className="animate-spin" size={13} /> : <ShieldAlert size={13} />}
                        בדוק והשבת ספקים חורגים
                    </button>
                </div>
                {atRiskLoading ? (
                    <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={24} />
                ) : atRiskVendors.length === 0 ? (
                    <p className="text-[#f0e6d3]/40 text-sm text-center py-6">אין ספקים עם חוב פתוח כרגע</p>
                ) : (
                    <div className="space-y-2">
                        {atRiskVendors.map((v) => (
                            <div key={v.vendor_id} className="flex items-center justify-between gap-4 bg-[#111a2f] rounded-xl px-4 py-3">
                                <div>
                                    <p className="text-sm font-semibold text-[#f0e6d3]">{v.name_he}</p>
                                    <p className="text-xs text-[#f0e6d3]/40 mt-0.5">
                                        {v.oldest_unsettled_days != null ? `העסקה הישנה ביותר שלא שולמה: ${v.oldest_unsettled_days} ימים` : 'אין עסקאות לא מסולקות'}
                                    </p>
                                </div>
                                <div className="text-end">
                                    <p className="text-sm font-black text-[#d4af37]">₪{v.commission_owed_total.toLocaleString()}</p>
                                    {v.over_threshold && (
                                        <span className="text-[10px] font-bold text-red-400">מעל הסף</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
