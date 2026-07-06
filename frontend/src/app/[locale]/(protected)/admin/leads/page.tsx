'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminListLeads, adminUpdateLeadStatus } from '@/lib/api';
import { Loader2, CheckCircle2, AlertCircle, Phone, Mail, Gem, Car, ShieldCheck, CalendarDays } from 'lucide-react';

const STATUSES = [
    { value: 'new',       label: 'חדשה',    color: 'bg-blue-500/20 text-blue-400' },
    { value: 'confirmed', label: 'מאושרת',  color: 'bg-green-500/20 text-green-400' },
    { value: 'contacted', label: 'טופלה',   color: 'bg-[#d4af37]/20 text-[#d4af37]' },
    { value: 'closed',    label: 'סגורה',   color: 'bg-[#111a2f] text-[#f0e6d3]/30' },
];

const VERTICAL_LABEL: Record<string, string> = { diamonds: 'יהלומים', cars: 'רכב', insurance: 'ביטוח' };
const TYPE_LABEL: Record<string, string> = { appointment: 'פגישה', contact_request: 'פנייה', club_signup: 'הצטרפות' };

function VerticalIcon({ v }: { v: string }) {
    if (v === 'diamonds') return <Gem size={14} className="text-[#d4af37]" />;
    if (v === 'cars')     return <Car size={14} className="text-[#d4af37]" />;
    return <ShieldCheck size={14} className="text-[#d4af37]" />;
}

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

export default function AdminLeadsPage() {
    const { token } = useAuth();
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterVertical, setFilterVertical] = useState('');
    const [search, setSearch] = useState('');
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    const load = () => {
        if (!token) return;
        setLoading(true);
        adminListLeads(token).then(setLeads).finally(() => setLoading(false));
    };

    useEffect(load, [token]);

    const filtered = useMemo(() => {
        return leads.filter((l) => {
            if (filterStatus && l.status !== filterStatus) return false;
            if (filterVertical && l.product_vertical !== filterVertical) return false;
            if (search) {
                const q = search.toLowerCase();
                const hay = `${l.user_name} ${l.user_email} ${l.product_title_he}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [leads, filterStatus, filterVertical, search]);

    const counts = useMemo(() => {
        const c: Record<string, number> = { new: 0, confirmed: 0, contacted: 0, closed: 0 };
        leads.forEach((l) => { if (c[l.status] !== undefined) c[l.status]++; });
        return c;
    }, [leads]);

    const handleStatusChange = async (lead: any, newStatus: string) => {
        if (!token || lead.status === newStatus) return;
        setUpdatingId(lead.id);
        try {
            await adminUpdateLeadStatus(token, lead.id, newStatus);
            setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, status: newStatus } : l));
            showToast('הסטטוס עודכן ✓');
        } catch {
            showToast('שגיאה בעדכון סטטוס', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    const statusInfo = (val: string) => STATUSES.find((s) => s.value === val) ?? STATUSES[0];

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-black text-[#f0e6d3]">פניות</h1>
                <div className="flex gap-4 flex-wrap">
                    {STATUSES.map((s) => (
                        <div key={s.value} className="text-center">
                            <div className="text-2xl font-black text-[#f0e6d3]">{counts[s.value]}</div>
                            <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                <input
                    placeholder="חיפוש שם / מייל / מוצר..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3] w-56"
                />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]">
                    <option value="">כל הסטטוסים</option>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select value={filterVertical} onChange={(e) => setFilterVertical(e.target.value)} className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]">
                    <option value="">כל העולמות</option>
                    <option value="diamonds">יהלומים</option>
                    <option value="cars">רכב</option>
                    <option value="insurance">ביטוח</option>
                </select>
            </div>

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={32} />
            ) : (
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-hidden">
                    <table className="w-full text-start">
                        <thead className="bg-[#111a2f] text-[#f0e6d3]/60 text-xs uppercase">
                            <tr>
                                <th className="p-4 text-start">פונה</th>
                                <th className="p-4 text-start">מוצר</th>
                                <th className="p-4 text-start">סוג</th>
                                <th className="p-4 text-start">תאריך</th>
                                <th className="p-4 text-start">סטטוס</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-[#f0e6d3]/40">אין פניות התואמות את הסינון.</td></tr>
                            )}
                            {filtered.map((lead) => {
                                const si = statusInfo(lead.status);
                                return (
                                    <tr key={lead.id} className="border-t border-[#d4af37]/10 text-[#f0e6d3] hover:bg-[#111a2f]/50 transition-colors">
                                        {/* User */}
                                        <td className="p-4">
                                            <p className="font-semibold text-sm">{lead.user_name || '—'}</p>
                                            {lead.user_email && (
                                                <a href={`mailto:${lead.user_email}`} className="flex items-center gap-1 text-xs text-[#f0e6d3]/40 hover:text-[#d4af37] mt-0.5">
                                                    <Mail size={11} /> {lead.user_email}
                                                </a>
                                            )}
                                            {lead.user_phone && (
                                                <a href={`tel:${lead.user_phone}`} className="flex items-center gap-1 text-xs text-[#f0e6d3]/40 hover:text-[#d4af37] mt-0.5" dir="ltr">
                                                    <Phone size={11} /> {lead.user_phone}
                                                </a>
                                            )}
                                        </td>

                                        {/* Product */}
                                        <td className="p-4">
                                            {lead.product_title_he ? (
                                                <div>
                                                    <p className="text-sm font-semibold">{lead.product_title_he}</p>
                                                    {lead.product_vertical && (
                                                        <span className="flex items-center gap-1 text-xs text-[#f0e6d3]/40 mt-0.5">
                                                            <VerticalIcon v={lead.product_vertical} />
                                                            {VERTICAL_LABEL[lead.product_vertical] ?? lead.product_vertical}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : <span className="text-[#f0e6d3]/25">—</span>}
                                        </td>

                                        {/* Type + scheduled */}
                                        <td className="p-4">
                                            <span className="text-sm">{TYPE_LABEL[lead.lead_type] ?? lead.lead_type}</span>
                                            {lead.scheduled_at && (
                                                <div className="flex items-center gap-1 text-xs text-[#d4af37]/70 mt-0.5">
                                                    <CalendarDays size={11} />
                                                    {new Date(lead.scheduled_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </td>

                                        {/* Date */}
                                        <td className="p-4 text-xs text-[#f0e6d3]/50">
                                            {new Date(lead.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                        </td>

                                        {/* Status selector */}
                                        <td className="p-4">
                                            {updatingId === lead.id ? (
                                                <Loader2 size={16} className="animate-spin text-[#d4af37]" />
                                            ) : (
                                                <select
                                                    value={lead.status}
                                                    onChange={(e) => handleStatusChange(lead, e.target.value)}
                                                    className={`rounded-xl px-3 py-1.5 text-xs font-bold border-0 cursor-pointer ${si.color} bg-transparent`}
                                                    style={{ background: 'transparent' }}
                                                >
                                                    {STATUSES.map((s) => (
                                                        <option key={s.value} value={s.value} className="bg-[#0e1628] text-[#f0e6d3]">{s.label}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
