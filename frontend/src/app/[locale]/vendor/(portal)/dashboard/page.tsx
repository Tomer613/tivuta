'use client';

import { useEffect, useState } from 'react';
import { Wallet, Percent, Gift, Loader2, ReceiptText } from 'lucide-react';
import { useVendorAuth } from '@/context/VendorAuthContext';
import { vendorListSales, SaleTransaction } from '@/lib/api';

export default function VendorDashboardPage() {
    const { vendor, token, refresh } = useVendorAuth();
    const [sales, setSales] = useState<SaleTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        refresh();
        vendorListSales(token)
            .then((data) => setSales(data.slice(0, 10)))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    return (
        <div>
            <h1 className="text-3xl font-black text-[#f0e6d3] mb-8">בקרה</h1>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-6">
                    <div className="flex items-center gap-2 text-[#f0e6d3]/50 text-xs font-black uppercase tracking-widest mb-3">
                        <Wallet size={14} /> חוב עמלה ל-TIVUTA
                    </div>
                    <div className="text-3xl font-black text-[#d4af37]">₪{(vendor?.commission_owed_total ?? 0).toLocaleString()}</div>
                </div>
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-6">
                    <div className="flex items-center gap-2 text-[#f0e6d3]/50 text-xs font-black uppercase tracking-widest mb-3">
                        <Percent size={14} /> אחוז עמלה
                    </div>
                    <div className="text-3xl font-black text-[#f0e6d3]">{vendor?.commission_rate_percent ?? 0}%</div>
                </div>
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-6">
                    <div className="flex items-center gap-2 text-[#f0e6d3]/50 text-xs font-black uppercase tracking-widest mb-3">
                        <Gift size={14} /> אחוז נקודות ללקוח
                    </div>
                    <div className="text-3xl font-black text-[#f0e6d3]">{vendor?.points_rate_percent ?? 'ברירת מחדל'}{vendor?.points_rate_percent != null ? '%' : ''}</div>
                </div>
            </div>

            <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#d4af37]/10 flex items-center gap-2">
                    <ReceiptText size={16} className="text-[#d4af37]" />
                    <h2 className="text-sm font-black text-[#f0e6d3] uppercase tracking-widest">עסקאות אחרונות</h2>
                </div>
                {loading ? (
                    <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#d4af37]" size={28} /></div>
                ) : sales.length === 0 ? (
                    <div className="p-10 text-center text-[#f0e6d3]/40">עדיין לא דווחו עסקאות</div>
                ) : (
                    <table className="w-full text-start">
                        <thead className="bg-[#111a2f] text-[#f0e6d3]/60 text-xs uppercase">
                            <tr>
                                <th className="p-4 text-start">לקוח</th>
                                <th className="p-4 text-start">מוצר</th>
                                <th className="p-4 text-start">סכום</th>
                                <th className="p-4 text-start">נקודות</th>
                                <th className="p-4 text-start">עמלה</th>
                                <th className="p-4 text-start">תאריך</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.map((s) => (
                                <tr key={s.id} className="border-t border-[#d4af37]/10 text-[#f0e6d3] text-sm">
                                    <td className="p-4">{s.customer_name || '—'}</td>
                                    <td className="p-4 text-[#f0e6d3]/60">{s.product_title_he || '—'}</td>
                                    <td className="p-4 font-bold">₪{s.amount_ils.toLocaleString()}</td>
                                    <td className="p-4 text-[#d4af37]">{s.points_awarded}</td>
                                    <td className="p-4 text-[#f0e6d3]/60">₪{s.commission_owed_ils.toLocaleString()}</td>
                                    <td className="p-4 text-[#f0e6d3]/40 text-xs">{new Date(s.reported_at).toLocaleString('he-IL')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
