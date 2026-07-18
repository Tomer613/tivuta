'use client';

import { useEffect, useState } from 'react';
import { ReceiptText, Loader2, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { useVendorAuth } from '@/context/VendorAuthContext';
import { vendorCreateSale } from '@/lib/api';

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold ${
            type === 'success' ? 'bg-[#0e1628] border border-green-500/50 text-green-400' : 'bg-[#0e1628] border border-red-500/50 text-red-400'
        }`}>
            {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message}
        </div>
    );
}

function newIdempotencyKey(): string {
    return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `key-${Date.now()}-${Math.random()}`;
}

export default function VendorReportSalePage() {
    const { token, refresh } = useVendorAuth();
    const [customerNumber, setCustomerNumber] = useState('');
    const [amountIls, setAmountIls] = useState('');
    const [productId, setProductId] = useState('');
    // Generated once per "logical" submission attempt and reused across retries — if the
    // request fails (e.g. network error) and the vendor clicks submit again, the same key is
    // sent, so a sale can never be double-counted just because a request had to be retried.
    const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        setSubmitting(true);
        try {
            const sale = await vendorCreateSale(token, {
                customer_number: customerNumber.trim(),
                amount_ils: Number(amountIls),
                product_id: productId ? Number(productId) : null,
                idempotency_key: idempotencyKey,
            });
            const message = sale.status === 'flagged'
                ? 'העסקה דווחה ונשלחה לבדיקת צוות טיבותא — הנקודות יזוכו ללקוח לאחר אישור'
                : `העסקה דווחה בהצלחה! ${sale.points_awarded} נקודות נצברו ללקוח`;
            setToast({ message, type: 'success' });
            setCustomerNumber('');
            setAmountIls('');
            setProductId('');
            setIdempotencyKey(newIdempotencyKey());
            refresh();
        } catch (err: any) {
            setToast({ message: err.message || 'שגיאה בדיווח העסקה', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-lg">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <h1 className="text-3xl font-black text-[#f0e6d3] mb-2 flex items-center gap-2">
                <ReceiptText className="text-[#d4af37]" /> דיווח עסקה
            </h1>
            <p className="text-[#f0e6d3]/50 text-sm mb-8">הזן את המספר הסידורי של הלקוח (מוצג בפרופיל שלו באתר) וסכום העסקה</p>

            <form onSubmit={handleSubmit} className="bg-[#0e1628] border border-[#d4af37]/20 rounded-3xl p-8 space-y-5">
                <div>
                    <label className="text-xs text-[#f0e6d3]/50 mb-1 block">מספר לקוח סידורי</label>
                    <input
                        required
                        value={customerNumber}
                        onChange={(e) => setCustomerNumber(e.target.value)}
                        placeholder="TVT-XXXXXXXXXX"
                        className="w-full bg-[#111a2f] border border-[#d4af37]/20 rounded-xl px-4 py-3 text-[#f0e6d3] outline-none focus:ring-2 focus:ring-[#d4af37]"
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
                        value={amountIls}
                        onChange={(e) => setAmountIls(e.target.value)}
                        placeholder="1000"
                        className="w-full bg-[#111a2f] border border-[#d4af37]/20 rounded-xl px-4 py-3 text-[#f0e6d3] outline-none focus:ring-2 focus:ring-[#d4af37]"
                        dir="ltr"
                    />
                </div>
                <div>
                    <label className="text-xs text-[#f0e6d3]/50 mb-1 block">מזהה מוצר (אופציונלי)</label>
                    <input
                        type="number"
                        value={productId}
                        onChange={(e) => setProductId(e.target.value)}
                        placeholder="לא חובה"
                        className="w-full bg-[#111a2f] border border-[#d4af37]/20 rounded-xl px-4 py-3 text-[#f0e6d3] outline-none focus:ring-2 focus:ring-[#d4af37]"
                        dir="ltr"
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#d4af37] text-[#080d1f] py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                >
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                    דווח עסקה
                </button>
            </form>
        </div>
    );
}
