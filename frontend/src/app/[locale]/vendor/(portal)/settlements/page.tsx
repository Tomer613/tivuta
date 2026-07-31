'use client';

import { useEffect, useState } from 'react';
import { Wallet, Loader2 } from 'lucide-react';
import { useVendorAuth } from '@/context/VendorAuthContext';
import { vendorListSettlements, CommissionSettlementPeriod } from '@/lib/api';

export default function VendorSettlementsPage() {
    const { token } = useVendorAuth();
    const [periods, setPeriods] = useState<CommissionSettlementPeriod[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        vendorListSettlements(token).then(setPeriods).finally(() => setLoading(false));
    }, [token]);

    return (
        <div>
            <h1 className="text-3xl font-black text-[#f0e6d3] mb-2 flex items-center gap-2">
                <Wallet className="text-[#d4af37]" /> התחשבנות עמלות
            </h1>
            <p className="text-[#f0e6d3]/50 text-sm mb-8">היסטוריית תקופות התחשבנות מול TIVUTA — נפתחות ונסגרות על ידי הצוות שלנו</p>

            {loading ? (
                <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#d4af37]" size={28} /></div>
            ) : periods.length === 0 ? (
                <div className="bg-[#0e1628] border-2 border-dashed border-[#d4af37]/20 rounded-2xl p-10 text-center text-[#f0e6d3]/40">
                    עדיין אין תקופות התחשבנות
                </div>
            ) : (
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-x-auto">
                    <table className="w-full text-start">
                        <thead className="bg-[#111a2f] text-[#f0e6d3]/60 text-xs uppercase">
                            <tr>
                                <th className="p-4 text-start">תקופה</th>
                                <th className="p-4 text-start">סכום</th>
                                <th className="p-4 text-start">סטטוס</th>
                                <th className="p-4 text-start">הערה</th>
                            </tr>
                        </thead>
                        <tbody>
                            {periods.map((p) => (
                                <tr key={p.id} className="border-t border-[#d4af37]/10 text-[#f0e6d3] text-sm">
                                    <td className="p-4">
                                        {new Date(p.period_start).toLocaleDateString('he-IL')} – {new Date(p.period_end).toLocaleDateString('he-IL')}
                                    </td>
                                    <td className="p-4 font-bold">₪{p.total_amount_ils.toLocaleString()}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.status === 'settled' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                            {p.status === 'settled' ? 'שולם' : 'פתוח'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-[#f0e6d3]/50 text-xs">{p.note || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
