'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { adminListLeads, adminUpdateLeadStatus, adminUpdateLeadNotes, adminAssignLead, adminSendAppointmentReminder, adminGetAdminUsers, adminBulkLeadAction } from '@/lib/api';
import { useVerticals } from '@/lib/useVerticals';
import { getVerticalIcon } from '@/lib/verticalIcons';
import { useBulkSelection } from '@/lib/useBulkSelection';
import BulkActionToolbar from '@/components/admin/BulkActionToolbar';
import CalendarView from '@/components/admin/CalendarView';
import { Loader2, CheckCircle2, AlertCircle, Phone, Mail, CalendarDays, Download, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, ChevronLeft, ChevronRight, MessageSquare, Check, X, LayoutList, CalendarRange, Bell, History, Square, CheckSquare, Kanban } from 'lucide-react';

const PAGE_SIZE = 50;

const STATUSES = [
    { value: 'new',       label: 'חדשה',    color: 'bg-blue-500/20 text-blue-400' },
    { value: 'confirmed', label: 'מאושרת',  color: 'bg-green-500/20 text-green-400' },
    { value: 'contacted', label: 'טופלה',   color: 'bg-[#d4af37]/20 text-[#d4af37]' },
    { value: 'closed',    label: 'סגורה',   color: 'bg-[#111a2f] text-[#f0e6d3]/30' },
];

const TYPE_LABEL: Record<string, string> = { appointment: 'פגישה', contact_request: 'פנייה', club_signup: 'הצטרפות', card_order: 'הזמנת כרטיס' };

function VerticalIcon({ v }: { v: string }) {
    const verticals = useVerticals();
    const Icon = getVerticalIcon(verticals.find((x) => x.slug === v)?.icon || 'Store');
    return <Icon size={14} className="text-[#d4af37]" />;
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

function KanbanView({ leads, onStatusChange, updatingId }: { leads: any[]; onStatusChange: (lead: any, status: string) => void; updatingId: number | null }) {
    const [dragging, setDragging] = useState<number | null>(null);

    const handleDrop = (status: string) => {
        if (dragging === null) return;
        const lead = leads.find((l) => l.id === dragging);
        if (lead && lead.status !== status) onStatusChange(lead, status);
        setDragging(null);
    };

    return (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {STATUSES.map((col) => {
                const colLeads = leads.filter((l) => l.status === col.value);
                return (
                    <div
                        key={col.value}
                        className="bg-[#0e1628] border border-[#d4af37]/15 rounded-2xl flex flex-col min-h-[300px]"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(col.value)}
                    >
                        <div className={`px-4 py-3 rounded-t-2xl flex items-center justify-between ${col.color} bg-opacity-10 border-b border-[#d4af37]/10`}>
                            <span className="text-xs font-black uppercase tracking-wider">{col.label}</span>
                            <span className="text-xs font-bold bg-[#111a2f] px-2 py-0.5 rounded-full text-[#f0e6d3]/60">{colLeads.length}</span>
                        </div>
                        <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[600px]">
                            {colLeads.map((lead) => {
                                const sla = lead.status === 'new' && (Date.now() - new Date(lead.created_at).getTime()) > 86_400_000;
                                return (
                                    <div
                                        key={lead.id}
                                        draggable
                                        onDragStart={() => setDragging(lead.id)}
                                        onDragEnd={() => setDragging(null)}
                                        className={`bg-[#111a2f] rounded-xl p-3 cursor-grab active:cursor-grabbing border transition-all ${
                                            dragging === lead.id ? 'opacity-50 scale-95' : ''
                                        } ${sla ? 'border-red-500/40' : 'border-transparent hover:border-[#d4af37]/20'}`}
                                    >
                                        {sla && <div className="text-[9px] text-red-400 font-bold mb-1.5 flex items-center gap-1">⏰ ממתין מעל 24 שעות</div>}
                                        <p className="text-sm font-bold text-[#f0e6d3] truncate">{lead.user_name || '—'}</p>
                                        <p className="text-xs text-[#f0e6d3]/40 truncate">{lead.product_title_he || TYPE_LABEL[lead.lead_type] || '—'}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            {lead.product_vertical && <VerticalIcon v={lead.product_vertical} />}
                                            <span className="text-[10px] text-[#f0e6d3]/30">
                                                {new Date(lead.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                        </div>
                                        {updatingId === lead.id && <Loader2 size={10} className="animate-spin text-[#d4af37] mt-1" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function AdminLeadsPage() {
    const { token } = useAuth();
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterVertical, setFilterVertical] = useState('');
    const [search, setSearch] = useState('');
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [sortKey, setSortKey] = useState<'created_at' | 'scheduled_at'>('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
    const [noteValue, setNoteValue] = useState('');
    const [savingNoteId, setSavingNoteId] = useState<number | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [view, setView] = useState<'table' | 'calendar' | 'kanban'>('table');
    const [adminUsers, setAdminUsers] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
    const [sendingReminderId, setSendingReminderIds] = useState<Set<number>>(new Set());
    const [bulkAction, setBulkAction] = useState('');
    const [bulkValue, setBulkValue] = useState('');
    const [bulkLoading, setBulkLoading] = useState(false);
    const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);
    const verticals = useVerticals();
    const VERTICAL_LABEL: Record<string, string> = Object.fromEntries(verticals.map((v) => [v.slug, v.label_he]));
    // Cleared whenever the visible page/filter set changes, so a bulk action can never silently
    // act on ids that scrolled out of view.
    const { selectedIds, toggleSelect, toggleSelectAll, clear: clearSelection } = useBulkSelection(`${filterStatus}|${filterVertical}|${search}|${page}`);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });
    const resetPage = () => setPage(1);

    const load = () => {
        if (!token) return;
        setLoading(true);
        Promise.all([adminListLeads(token), adminGetAdminUsers(token)])
            .then(([l, u]) => { setLeads(l); setAdminUsers(u); })
            .finally(() => setLoading(false));
    };

    useEffect(load, [token]);

    const handleAssign = async (leadId: number, userId: number | null) => {
        if (!token) return;
        try {
            await adminAssignLead(token, leadId, userId);
            setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, assigned_to: userId, assigned_to_name: adminUsers.find((u) => u.id === userId)?.first_name || null } : l));
            showToast('הוקצה ✓');
        } catch {
            showToast('שגיאה בהקצאה', 'error');
        }
    };

    const handleSendReminder = async (leadId: number) => {
        if (!token) return;
        setSendingReminderIds((prev) => new Set(prev).add(leadId));
        try {
            await adminSendAppointmentReminder(token, leadId);
            showToast('תזכורת נשלחה ✓');
        } catch {
            showToast('שגיאה בשליחת תזכורת', 'error');
        } finally {
            setSendingReminderIds((prev) => { const s = new Set(prev); s.delete(leadId); return s; });
        }
    };

    const filtered = useMemo(() => {
        let list = leads.filter((l) => {
            if (filterStatus && l.status !== filterStatus) return false;
            if (filterVertical && l.product_vertical !== filterVertical) return false;
            if (search) {
                const q = search.toLowerCase();
                const hay = `${l.user_name} ${l.user_email} ${l.product_title_he}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
        list = [...list].sort((a, b) => {
            const av = a[sortKey] ? new Date(a[sortKey]).getTime() : 0;
            const bv = b[sortKey] ? new Date(b[sortKey]).getTime() : 0;
            return sortDir === 'desc' ? bv - av : av - bv;
        });
        return list;
    }, [leads, filterStatus, filterVertical, search, sortKey, sortDir]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const goToPage = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)));

    const toggleSort = (key: 'created_at' | 'scheduled_at') => {
        if (sortKey === key) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    const SortIcon = ({ col }: { col: 'created_at' | 'scheduled_at' }) => {
        if (sortKey !== col) return <ArrowUpDown size={12} className="opacity-30" />;
        return sortDir === 'desc' ? <ArrowDown size={12} className="text-[#d4af37]" /> : <ArrowUp size={12} className="text-[#d4af37]" />;
    };

    const exportCsv = () => {
        const header = ['שם', 'מייל', 'טלפון', 'מוצר', 'עולם', 'סוג', 'סטטוס', 'תאריך פגישה', 'תאריך יצירה'];
        const rows = filtered.map((l) => [
            l.user_name ?? '',
            l.user_email ?? '',
            l.user_phone ?? '',
            l.product_title_he ?? '',
            VERTICAL_LABEL[l.product_vertical] ?? l.product_vertical ?? '',
            TYPE_LABEL[l.lead_type] ?? l.lead_type,
            STATUSES.find((s) => s.value === l.status)?.label ?? l.status,
            l.scheduled_at ? new Date(l.scheduled_at).toLocaleDateString('he-IL') : '',
            new Date(l.created_at).toLocaleDateString('he-IL'),
        ]);
        const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

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

    const handleBulkAction = async () => {
        if (!token || !bulkAction || selectedIds.size === 0) return;
        setBulkLoading(true);
        try {
            await adminBulkLeadAction(token, Array.from(selectedIds), bulkAction, bulkValue || undefined);
            // Refresh leads
            const updated = await adminListLeads(token);
            setLeads(updated);
            showToast(`${selectedIds.size} פניות עודכנו ✓`);
            clearSelection();
            setBulkAction('');
            setBulkValue('');
        } catch {
            showToast('שגיאה בפעולה מרוכזת', 'error');
        } finally {
            setBulkLoading(false);
        }
    };

    const startEditNote = (lead: any) => { setEditingNoteId(lead.id); setNoteValue(lead.notes || ''); };
    const cancelEditNote = () => { setEditingNoteId(null); setNoteValue(''); };
    const saveNote = async (leadId: number) => {
        if (!token) return;
        setSavingNoteId(leadId);
        try {
            await adminUpdateLeadNotes(token, leadId, noteValue);
            setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, notes: noteValue } : l));
            setEditingNoteId(null);
            showToast('ההערה נשמרה ✓');
        } catch {
            showToast('שגיאה בשמירת הערה', 'error');
        } finally {
            setSavingNoteId(null);
        }
    };

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-black text-[#f0e6d3]">פניות</h1>
                    <div className="flex bg-[#0e1628] border border-[#d4af37]/20 rounded-xl overflow-hidden">
                        <button onClick={() => setView('table')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${view === 'table' ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'text-[#f0e6d3]/40 hover:text-[#f0e6d3]/70'}`}>
                            <LayoutList size={13} /> טבלה
                        </button>
                        <button onClick={() => setView('calendar')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${view === 'calendar' ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'text-[#f0e6d3]/40 hover:text-[#f0e6d3]/70'}`}>
                            <CalendarRange size={13} /> לוח שנה
                        </button>
                        <button onClick={() => setView('kanban')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${view === 'kanban' ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'text-[#f0e6d3]/40 hover:text-[#f0e6d3]/70'}`}>
                            <Kanban size={13} /> קנבן
                        </button>
                    </div>
                </div>
                <button onClick={exportCsv} disabled={filtered.length === 0} className="flex items-center gap-2 bg-[#0e1628] border border-[#d4af37]/30 text-[#d4af37] rounded-xl px-4 py-2 text-sm font-bold hover:bg-[#111a2f] disabled:opacity-40 transition-colors">
                    <Download size={15} /> ייצוא CSV ({filtered.length})
                </button>
                <div className="flex gap-4 flex-wrap">
                    {STATUSES.map((s) => (
                        <div key={s.value} className="text-center">
                            <div className="text-2xl font-black text-[#f0e6d3]">{counts[s.value]}</div>
                            <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bulk Actions Toolbar */}
            <BulkActionToolbar
                selectedCount={selectedIds.size}
                statuses={STATUSES}
                adminUsers={adminUsers}
                bulkAction={bulkAction}
                onBulkActionChange={setBulkAction}
                bulkValue={bulkValue}
                onBulkValueChange={setBulkValue}
                onExecute={handleBulkAction}
                onClear={clearSelection}
                loading={bulkLoading}
            />

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                <input
                    placeholder="חיפוש שם / מייל / מוצר..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                    className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3] w-56"
                />
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); resetPage(); }} className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]">
                    <option value="">כל הסטטוסים</option>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select value={filterVertical} onChange={(e) => { setFilterVertical(e.target.value); resetPage(); }} className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]">
                    <option value="">כל העולמות</option>
                    {verticals.map((v) => <option key={v.slug} value={v.slug}>{v.label_he}</option>)}
                </select>
            </div>

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={32} />
            ) : view === 'calendar' ? (
                <CalendarView lines={leads.filter((l) => l.lead_type === 'appointment' && l.scheduled_at)} onSendReminder={handleSendReminder} sendingIds={sendingReminderId} />
            ) : view === 'kanban' ? (
                <KanbanView leads={filtered} onStatusChange={handleStatusChange} updatingId={updatingId} />
            ) : (
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-x-auto">
                    <table className="w-full text-start">
                        <thead className="bg-[#111a2f] text-[#f0e6d3]/60 text-xs uppercase">
                            <tr>
                                <th className="p-4 text-start w-8">
                                    <button onClick={() => toggleSelectAll(paginated.map((l: any) => l.id))} className="text-[#f0e6d3]/40 hover:text-[#d4af37] transition-colors">
                                        {selectedIds.size === paginated.length && paginated.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
                                    </button>
                                </th>
                                <th className="p-4 text-start">פונה</th>
                                <th className="p-4 text-start">מוצר</th>
                                <th className="p-4 text-start">סוג</th>
                                <th className="p-4 text-start cursor-pointer select-none hover:text-[#d4af37]" onClick={() => toggleSort('created_at')}>
                                    <span className="flex items-center gap-1">תאריך <SortIcon col="created_at" /></span>
                                </th>
                                <th className="p-4 text-start">הערות</th>
                                <th className="p-4 text-start">הקצאה</th>
                                <th className="p-4 text-start">סטטוס</th>
                                <th className="p-4 w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 && (
                                <tr><td colSpan={9} className="p-8 text-center text-[#f0e6d3]/40">אין פניות התואמות את הסינון.</td></tr>
                            )}
                            {paginated.map((lead) => {
                                const si = statusInfo(lead.status);
                                const isSelected = selectedIds.has(lead.id);
                                const historyExpanded = expandedHistoryId === lead.id;
                                const isSlaBreached = lead.status === 'new' && (Date.now() - new Date(lead.created_at).getTime()) > 86_400_000;
                                return (
                                    <Fragment key={lead.id}>
                                    <tr className={`border-t border-[#d4af37]/10 text-[#f0e6d3] hover:bg-[#111a2f]/50 transition-colors ${isSelected ? 'bg-[#d4af37]/5' : ''} ${isSlaBreached ? 'border-l-2 border-l-red-500/60' : ''}`}>
                                        {/* Checkbox */}
                                        <td className="p-4">
                                            <button onClick={() => toggleSelect(lead.id)} className="text-[#f0e6d3]/40 hover:text-[#d4af37] transition-colors">
                                                {isSelected ? <CheckSquare size={14} className="text-[#d4af37]" /> : <Square size={14} />}
                                            </button>
                                        </td>

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
                                                    <a
                                                        href={lead.product_id ? `/${locale}/products?id=${lead.product_id}` : `/${locale}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm font-semibold hover:text-[#d4af37] transition-colors flex items-center gap-1 group/link"
                                                    >
                                                        {lead.product_title_he}
                                                        {lead.quantity != null && lead.quantity > 1 && (
                                                            <span className="text-[#d4af37] font-black">×{lead.quantity}</span>
                                                        )}
                                                        <ExternalLink size={11} className="opacity-0 group-hover/link:opacity-60 transition-opacity" />
                                                    </a>
                                                    {lead.product_vertical && (
                                                        <span className="flex items-center gap-1 text-xs text-[#f0e6d3]/40 mt-0.5">
                                                            <VerticalIcon v={lead.product_vertical} />
                                                            {VERTICAL_LABEL[lead.product_vertical] ?? lead.product_vertical}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : lead.lead_type === 'card_order' && lead.shipping_address ? (
                                                <div className="text-xs text-[#f0e6d3]/70 space-y-0.5">
                                                    <p className="font-semibold text-[#f0e6d3]">{lead.shipping_address.full_name}</p>
                                                    <p>{lead.shipping_address.street}, {lead.shipping_address.city} {lead.shipping_address.zip_code || ''}</p>
                                                    <p dir="ltr" className="text-[#d4af37]/70">{lead.shipping_address.phone}</p>
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

                                        {/* Notes */}
                                        <td className="p-4 max-w-[160px]">
                                            {editingNoteId === lead.id ? (
                                                <div className="flex items-start gap-1">
                                                    <textarea
                                                        value={noteValue}
                                                        onChange={(e) => setNoteValue(e.target.value)}
                                                        rows={2}
                                                        className="flex-1 bg-[#111a2f] rounded-lg px-2 py-1 text-xs text-[#f0e6d3] resize-none w-24"
                                                        autoFocus
                                                    />
                                                    <div className="flex flex-col gap-1">
                                                        <button onClick={() => saveNote(lead.id)} disabled={savingNoteId === lead.id} className="text-green-400 hover:text-green-300">
                                                            {savingNoteId === lead.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                        </button>
                                                        <button onClick={cancelEditNote} className="text-[#f0e6d3]/30 hover:text-[#f0e6d3]"><X size={12} /></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startEditNote(lead)}
                                                    className="flex items-start gap-1.5 text-start group/note w-full"
                                                    title="הוסף הערה"
                                                >
                                                    <MessageSquare size={12} className={`mt-0.5 shrink-0 ${lead.notes ? 'text-[#d4af37]/60' : 'text-[#f0e6d3]/15 group-hover/note:text-[#f0e6d3]/40'}`} />
                                                    <span className="text-xs text-[#f0e6d3]/50 group-hover/note:text-[#f0e6d3]/80 line-clamp-2 leading-tight">
                                                        {lead.notes || <span className="text-[#f0e6d3]/15">הוסף הערה...</span>}
                                                    </span>
                                                </button>
                                            )}
                                        </td>

                                        {/* Assignment */}
                                        <td className="p-4">
                                            <select
                                                value={lead.assigned_to ?? ''}
                                                onChange={(e) => handleAssign(lead.id, e.target.value ? Number(e.target.value) : null)}
                                                className="bg-[#111a2f] border border-[#d4af37]/10 rounded-lg px-2 py-1 text-xs text-[#f0e6d3]/70 max-w-[100px]"
                                            >
                                                <option value="">ללא</option>
                                                {adminUsers.map((u) => (
                                                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                                ))}
                                            </select>
                                        </td>

                                        {/* Status selector */}
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
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
                                                {lead.lead_type === 'appointment' && lead.scheduled_at && (
                                                    <button
                                                        onClick={() => handleSendReminder(lead.id)}
                                                        disabled={sendingReminderId.has(lead.id)}
                                                        className="text-[#f0e6d3]/20 hover:text-[#d4af37] transition-colors"
                                                        title="שלח תזכורת לפגישה"
                                                    >
                                                        {sendingReminderId.has(lead.id) ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>

                                        {/* History toggle */}
                                        <td className="p-4">
                                            {lead.history && lead.history.length > 0 && (
                                                <button
                                                    onClick={() => setExpandedHistoryId(historyExpanded ? null : lead.id)}
                                                    className="text-[#f0e6d3]/20 hover:text-[#d4af37] transition-colors"
                                                    title="היסטוריה"
                                                >
                                                    <History size={13} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {historyExpanded && lead.history && (
                                        <tr key={`hist-${lead.id}`} className="bg-[#0a1020]">
                                            <td colSpan={9} className="px-8 py-3">
                                                <p className="text-[10px] font-black text-[#f0e6d3]/30 uppercase tracking-widest mb-2">היסטוריית שינויים</p>
                                                <div className="space-y-1">
                                                    {lead.history.map((h: any, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-3 text-xs text-[#f0e6d3]/50">
                                                            <span className="text-[#f0e6d3]/25 tabular-nums">{new Date(h.ts).toLocaleString('he-IL', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                                                            <span className="text-[#d4af37]/60">{h.action === 'status_change' || h.action === 'bulk_status_change' ? 'סטטוס' : h.action === 'assigned' || h.action === 'bulk_assign' ? 'הקצאה' : h.action}</span>
                                                            {h.from_val && <span>{h.from_val} → {h.to_val}</span>}
                                                            {!h.from_val && h.to_val && <span>→ {h.to_val}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm text-[#f0e6d3]/50">
                    <span>{filtered.length} פניות · עמוד {page} מתוך {totalPages}</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => goToPage(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-[#0e1628] disabled:opacity-30 transition-colors">
                            <ChevronRight size={16} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 2).map(p => (
                            <button key={p} onClick={() => goToPage(p)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${p === page ? 'bg-[#d4af37] text-[#080d1f]' : 'hover:bg-[#0e1628]'}`}>{p}</button>
                        ))}
                        <button onClick={() => goToPage(page + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-[#0e1628] disabled:opacity-30 transition-colors">
                            <ChevronLeft size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
