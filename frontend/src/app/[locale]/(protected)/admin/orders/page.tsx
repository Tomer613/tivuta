'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    adminListOrders, adminUpdateOrderNotes, adminUpdateLeadStatus, adminUpdateLeadNotes,
    adminAssignLead, adminSendAppointmentReminder, adminGetAdminUsers, adminBulkLeadAction,
    vendorCode, CustomerOrder, CustomerOrderLine,
} from '@/lib/api';
import { useVerticals } from '@/lib/useVerticals';
import { getVerticalIcon } from '@/lib/verticalIcons';
import { useBulkSelection } from '@/lib/useBulkSelection';
import BulkActionToolbar from '@/components/admin/BulkActionToolbar';
import CalendarView from '@/components/admin/CalendarView';
import {
    Loader2, CheckCircle2, AlertCircle, Phone, Mail, CalendarDays, Download, ExternalLink,
    MessageSquare, Check, X, LayoutList, CalendarRange, Bell,
    History, Kanban, Store, Square, CheckSquare,
} from 'lucide-react';

const STATUSES = [
    { value: 'new',       label: 'חדשה',    color: 'bg-blue-500/20 text-blue-400' },
    { value: 'confirmed', label: 'מאושרת',  color: 'bg-green-500/20 text-green-400' },
    { value: 'contacted', label: 'טופלה',   color: 'bg-[#d4af37]/20 text-[#d4af37]' },
    { value: 'closed',    label: 'סגורה',   color: 'bg-[#111a2f] text-[#f0e6d3]/30' },
];

const TYPE_LABEL: Record<string, string> = { appointment: 'פגישה', contact_request: 'הזמנת מוצר', club_signup: 'הצטרפות', card_order: 'הזמנת כרטיס' };

type FlatLine = CustomerOrderLine & { order_number: string; user_name?: string | null; user_email?: string | null; user_phone?: string | null };

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

function KanbanView({ lines, onStatusChange, updatingId }: { lines: FlatLine[]; onStatusChange: (line: FlatLine, status: string) => void; updatingId: number | null }) {
    const [dragging, setDragging] = useState<number | null>(null);

    const handleDrop = (status: string) => {
        if (dragging === null) return;
        const line = lines.find((l) => l.id === dragging);
        if (line && line.status !== status) onStatusChange(line, status);
        setDragging(null);
    };

    return (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {STATUSES.map((col) => {
                const colLines = lines.filter((l) => l.status === col.value);
                return (
                    <div
                        key={col.value}
                        className="bg-[#0e1628] border border-[#d4af37]/15 rounded-2xl flex flex-col min-h-[300px]"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(col.value)}
                    >
                        <div className={`px-4 py-3 rounded-t-2xl flex items-center justify-between ${col.color} bg-opacity-10 border-b border-[#d4af37]/10`}>
                            <span className="text-xs font-black uppercase tracking-wider">{col.label}</span>
                            <span className="text-xs font-bold bg-[#111a2f] px-2 py-0.5 rounded-full text-[#f0e6d3]/60">{colLines.length}</span>
                        </div>
                        <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[600px]">
                            {colLines.map((line) => {
                                const sla = line.status === 'new' && (Date.now() - new Date(line.created_at).getTime()) > 86_400_000;
                                return (
                                    <div
                                        key={line.id}
                                        draggable
                                        onDragStart={() => setDragging(line.id)}
                                        onDragEnd={() => setDragging(null)}
                                        className={`bg-[#111a2f] rounded-xl p-3 cursor-grab active:cursor-grabbing border transition-all ${
                                            dragging === line.id ? 'opacity-50 scale-95' : ''
                                        } ${sla ? 'border-red-500/40' : 'border-transparent hover:border-[#d4af37]/20'}`}
                                    >
                                        {sla && <div className="text-[9px] text-red-400 font-bold mb-1.5 flex items-center gap-1">⏰ ממתין מעל 24 שעות</div>}
                                        <p className="text-[10px] text-[#d4af37]/70 font-black mb-0.5">{line.order_number}</p>
                                        <p className="text-sm font-bold text-[#f0e6d3] truncate">{line.user_name || '—'}</p>
                                        <p className="text-xs text-[#f0e6d3]/40 truncate">{line.product_title_he || TYPE_LABEL[line.lead_type] || '—'}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            {line.product_vertical && <VerticalIcon v={line.product_vertical} />}
                                            <span className="text-[9px] text-[#d4af37]/50 font-bold">{TYPE_LABEL[line.lead_type]}</span>
                                            <span className="text-[10px] text-[#f0e6d3]/30 ms-auto">
                                                {new Date(line.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                        </div>
                                        {updatingId === line.id && <Loader2 size={10} className="animate-spin text-[#d4af37] mt-1" />}
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

/** Groups one order's line items first by vertical, then by vendor within each vertical.
 *  The vendor suffix is that vendor's own stable code (vendorCode()), so e.g. ORD-000123-007
 *  always means vendor #7 — consistent across every order, not just within this one. */
function groupOrderItems(items: CustomerOrderLine[]) {
    const suffixFor = (vendorId?: number | null) => vendorId != null ? vendorCode(vendorId) : null;

    const byVertical = new Map<string, CustomerOrderLine[]>();
    for (const item of items) {
        const key = item.product_vertical || '__none__';
        if (!byVertical.has(key)) byVertical.set(key, []);
        byVertical.get(key)!.push(item);
    }

    const verticalGroups = Array.from(byVertical.entries()).map(([vertical, verticalItems]) => {
        const byVendor = new Map<string, CustomerOrderLine[]>();
        for (const item of verticalItems) {
            const key = item.vendor_id != null ? String(item.vendor_id) : '__novendor__';
            if (!byVendor.has(key)) byVendor.set(key, []);
            byVendor.get(key)!.push(item);
        }
        const vendorGroups = Array.from(byVendor.entries()).map(([key, vendorItems]) => ({
            key,
            vendorName: vendorItems[0].vendor_name_he || null,
            suffix: suffixFor(vendorItems[0].vendor_id),
            items: vendorItems,
        }));
        return { vertical, items: verticalItems, vendorGroups };
    });

    return verticalGroups;
}

export default function AdminOrdersPage() {
    const { token } = useAuth();
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const [orders, setOrders] = useState<CustomerOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [adminUsers, setAdminUsers] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterVertical, setFilterVertical] = useState('');
    const [filterType, setFilterType] = useState('');
    const [view, setView] = useState<'table' | 'calendar' | 'kanban'>('table');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [updatingLineId, setUpdatingLineId] = useState<number | null>(null);
    const [sendingReminderIds, setSendingReminderIds] = useState<Set<number>>(new Set());
    const [editingNoteLineId, setEditingNoteLineId] = useState<number | null>(null);
    const [noteValue, setNoteValue] = useState('');
    const [savingNoteLineId, setSavingNoteLineId] = useState<number | null>(null);
    const [editingOrderNoteId, setEditingOrderNoteId] = useState<number | null>(null);
    const [orderNoteValue, setOrderNoteValue] = useState('');
    const [savingOrderNoteId, setSavingOrderNoteId] = useState<number | null>(null);
    const [expandedHistoryLineId, setExpandedHistoryLineId] = useState<number | null>(null);
    const [bulkAction, setBulkAction] = useState('');
    const [bulkValue, setBulkValue] = useState('');
    const [bulkLoading, setBulkLoading] = useState(false);
    const verticals = useVerticals();
    const VERTICAL_LABEL: Record<string, string> = Object.fromEntries(verticals.map((v) => [v.slug, v.label_he]));
    // Cleared whenever the active filters change, so a bulk action can never silently act on
    // line items that scrolled out of view.
    const { selectedIds, toggleSelect, toggleSelectAll, clear: clearSelection } = useBulkSelection(`${search}|${filterStatus}|${filterVertical}|${filterType}`);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    const load = () => {
        if (!token) return;
        setLoading(true);
        Promise.all([adminListOrders(token), adminGetAdminUsers(token)])
            .then(([o, u]) => { setOrders(o); setAdminUsers(u); })
            .finally(() => setLoading(false));
    };

    useEffect(load, [token]);

    // How many of a customer's other orders still have an open (non closed/cancelled) line item.
    const activeOrderCountByUser = useMemo(() => {
        const counts: Record<number, number> = {};
        orders.forEach((o) => {
            const hasOpen = o.items.some((i) => i.status !== 'closed' && i.status !== 'cancelled');
            if (hasOpen) counts[o.user_id] = (counts[o.user_id] || 0) + 1;
        });
        return counts;
    }, [orders]);

    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            if (search) {
                const q = search.toLowerCase();
                const hay = `${order.user_name} ${order.user_email} ${order.items.map((i) => i.product_title_he).join(' ')}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            if (filterStatus && !order.items.some((i) => i.status === filterStatus)) return false;
            if (filterVertical && !order.items.some((i) => i.product_vertical === filterVertical)) return false;
            if (filterType && !order.items.some((i) => i.lead_type === filterType)) return false;
            return true;
        });
    }, [orders, search, filterStatus, filterVertical, filterType]);

    const toFlatLines = (list: CustomerOrder[]): FlatLine[] => list.flatMap((o) =>
        o.items.map((i) => ({ ...i, order_number: o.order_number, user_name: o.user_name, user_email: o.user_email, user_phone: o.user_phone }))
    );
    const flatLines: FlatLine[] = useMemo(() => toFlatLines(orders), [orders]);
    const filteredFlatLines: FlatLine[] = useMemo(() => toFlatLines(filteredOrders), [filteredOrders]);

    const counts = useMemo(() => {
        const c: Record<string, number> = { new: 0, confirmed: 0, contacted: 0, closed: 0 };
        flatLines.forEach((l) => { if (c[l.status] !== undefined) c[l.status]++; });
        return c;
    }, [flatLines]);

    const updateLineInState = (lineId: number, patch: Partial<CustomerOrderLine>) => {
        setOrders((prev) => prev.map((o) => ({
            ...o,
            items: o.items.map((i) => i.id === lineId ? { ...i, ...patch } : i),
        })));
    };

    const handleStatusChange = async (line: CustomerOrderLine, newStatus: string) => {
        if (!token || line.status === newStatus) return;
        setUpdatingLineId(line.id);
        try {
            await adminUpdateLeadStatus(token, line.id, newStatus);
            updateLineInState(line.id, { status: newStatus });
            showToast('הסטטוס עודכן ✓');
        } catch {
            showToast('שגיאה בעדכון סטטוס', 'error');
        } finally {
            setUpdatingLineId(null);
        }
    };

    const handleAssign = async (lineId: number, userId: number | null) => {
        if (!token) return;
        try {
            await adminAssignLead(token, lineId, userId);
            updateLineInState(lineId, { assigned_to: userId, assigned_to_name: adminUsers.find((u) => u.id === userId)?.first_name || null });
            showToast('הוקצה ✓');
        } catch {
            showToast('שגיאה בהקצאה', 'error');
        }
    };

    const handleSendReminder = async (lineId: number) => {
        if (!token) return;
        setSendingReminderIds((prev) => new Set(prev).add(lineId));
        try {
            await adminSendAppointmentReminder(token, lineId);
            showToast('תזכורת נשלחה ✓');
        } catch {
            showToast('שגיאה בשליחת תזכורת', 'error');
        } finally {
            setSendingReminderIds((prev) => { const s = new Set(prev); s.delete(lineId); return s; });
        }
    };

    const startEditNote = (line: CustomerOrderLine) => { setEditingNoteLineId(line.id); setNoteValue(line.notes || ''); };
    const cancelEditNote = () => { setEditingNoteLineId(null); setNoteValue(''); };
    const saveNote = async (lineId: number) => {
        if (!token) return;
        setSavingNoteLineId(lineId);
        try {
            await adminUpdateLeadNotes(token, lineId, noteValue);
            updateLineInState(lineId, { notes: noteValue });
            setEditingNoteLineId(null);
            showToast('ההערה נשמרה ✓');
        } catch {
            showToast('שגיאה בשמירת הערה', 'error');
        } finally {
            setSavingNoteLineId(null);
        }
    };

    const startEditOrderNote = (order: CustomerOrder) => { setEditingOrderNoteId(order.id); setOrderNoteValue(order.notes || ''); };
    const cancelEditOrderNote = () => { setEditingOrderNoteId(null); setOrderNoteValue(''); };
    const saveOrderNote = async (orderId: number) => {
        if (!token) return;
        setSavingOrderNoteId(orderId);
        try {
            await adminUpdateOrderNotes(token, orderId, orderNoteValue);
            setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, notes: orderNoteValue } : o));
            setEditingOrderNoteId(null);
            showToast('הערת ההזמנה נשמרה ✓');
        } catch {
            showToast('שגיאה בשמירת הערה', 'error');
        } finally {
            setSavingOrderNoteId(null);
        }
    };

    const statusInfo = (val: string) => STATUSES.find((s) => s.value === val) ?? STATUSES[0];

    const handleBulkAction = async () => {
        if (!token || !bulkAction || selectedIds.size === 0) return;
        setBulkLoading(true);
        try {
            await adminBulkLeadAction(token, Array.from(selectedIds), bulkAction, bulkValue || undefined);
            // Patch locally instead of refetching the whole (unpaginated) order list — we already
            // know exactly which ids changed and to what, same pattern as handleStatusChange/handleAssign.
            const patch: Partial<CustomerOrderLine> =
                bulkAction === 'set_status' ? { status: bulkValue } :
                bulkAction === 'assign' ? {
                    assigned_to: bulkValue ? Number(bulkValue) : null,
                    assigned_to_name: bulkValue ? (adminUsers.find((u) => u.id === Number(bulkValue))?.first_name || null) : null,
                } : {};
            selectedIds.forEach((id) => updateLineInState(id, patch));
            showToast(`${selectedIds.size} פריטים עודכנו ✓`);
            clearSelection();
            setBulkAction('');
            setBulkValue('');
        } catch {
            showToast('שגיאה בפעולה מרוכזת', 'error');
        } finally {
            setBulkLoading(false);
        }
    };

    const exportCsv = () => {
        const header = ['הזמנה', 'שם לקוח', 'מייל', 'טלפון', 'מוצר', 'עולם', 'ספק', 'סוג', 'כמות', 'סטטוס', 'תאריך'];
        const rows = filteredOrders.flatMap((order) => order.items.map((l) => [
            order.order_number,
            order.user_name ?? '',
            order.user_email ?? '',
            order.user_phone ?? '',
            l.product_title_he ?? '',
            VERTICAL_LABEL[l.product_vertical ?? ''] ?? l.product_vertical ?? '',
            l.vendor_name_he ?? '',
            TYPE_LABEL[l.lead_type] ?? l.lead_type,
            l.quantity ?? '',
            STATUSES.find((s) => s.value === l.status)?.label ?? l.status,
            new Date(l.created_at).toLocaleDateString('he-IL'),
        ]));
        const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-black text-[#f0e6d3]">הזמנות</h1>
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
                <button onClick={exportCsv} disabled={filteredOrders.length === 0} className="flex items-center gap-2 bg-[#0e1628] border border-[#d4af37]/30 text-[#d4af37] rounded-xl px-4 py-2 text-sm font-bold hover:bg-[#111a2f] disabled:opacity-40 transition-colors">
                    <Download size={15} /> ייצוא CSV ({filteredOrders.length})
                </button>
                {view === 'table' && filteredFlatLines.length > 0 && (
                    <button onClick={() => toggleSelectAll(filteredFlatLines.map((l) => l.id))} className="flex items-center gap-2 text-xs text-[#f0e6d3]/40 hover:text-[#d4af37] transition-colors">
                        {selectedIds.size === filteredFlatLines.length ? <CheckSquare size={14} className="text-[#d4af37]" /> : <Square size={14} />}
                        בחר הכל
                    </button>
                )}
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
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3] w-56"
                />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]">
                    <option value="">כל הסטטוסים</option>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select value={filterVertical} onChange={(e) => setFilterVertical(e.target.value)} className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]">
                    <option value="">כל העולמות</option>
                    {verticals.map((v) => <option key={v.slug} value={v.slug}>{v.label_he}</option>)}
                </select>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]">
                    <option value="">כל הסוגים</option>
                    {Object.entries(TYPE_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
            </div>

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={32} />
            ) : view === 'calendar' ? (
                <CalendarView lines={filteredFlatLines.filter((l) => l.lead_type === 'appointment' && l.scheduled_at)} onSendReminder={handleSendReminder} sendingIds={sendingReminderIds} />
            ) : view === 'kanban' ? (
                <KanbanView lines={filteredFlatLines} onStatusChange={handleStatusChange} updatingId={updatingLineId} />
            ) : (
                <div className="space-y-4">
                    {filteredOrders.length === 0 && (
                        <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-8 text-center text-[#f0e6d3]/40">אין הזמנות התואמות את הסינון.</div>
                    )}
                    {filteredOrders.map((order) => {
                        const otherActive = Math.max(0, (activeOrderCountByUser[order.user_id] || 0) - (order.items.some((i) => i.status !== 'closed' && i.status !== 'cancelled') ? 1 : 0));
                        const groups = groupOrderItems(order.items);
                        return (
                            <div key={order.id} className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-hidden">
                                {/* Order header */}
                                <div className="p-5 border-b border-[#d4af37]/10 flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-lg font-black text-[#d4af37]">{order.order_number}</span>
                                            {otherActive > 0 && (
                                                <span className="text-[10px] font-bold bg-[#d4af37]/15 text-[#d4af37] px-2 py-0.5 rounded-full">
                                                    {otherActive} הזמנות פעילות נוספות מלקוח זה
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm font-semibold text-[#f0e6d3] mt-1">{order.user_name || '—'}</p>
                                        <div className="flex items-center gap-3 text-xs text-[#f0e6d3]/40 mt-0.5 flex-wrap">
                                            {order.user_email && (
                                                <a href={`mailto:${order.user_email}`} className="flex items-center gap-1 hover:text-[#d4af37]">
                                                    <Mail size={11} /> {order.user_email}
                                                </a>
                                            )}
                                            {order.user_phone && (
                                                <a href={`tel:${order.user_phone}`} dir="ltr" className="flex items-center gap-1 hover:text-[#d4af37]">
                                                    <Phone size={11} /> {order.user_phone}
                                                </a>
                                            )}
                                            <span>{new Date(order.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                                        </div>
                                    </div>
                                    <div className="min-w-[220px]">
                                        {editingOrderNoteId === order.id ? (
                                            <div className="flex items-start gap-1">
                                                <textarea
                                                    value={orderNoteValue}
                                                    onChange={(e) => setOrderNoteValue(e.target.value)}
                                                    rows={2}
                                                    className="flex-1 bg-[#111a2f] rounded-lg px-2 py-1 text-xs text-[#f0e6d3] resize-none"
                                                    autoFocus
                                                />
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => saveOrderNote(order.id)} disabled={savingOrderNoteId === order.id} className="text-green-400 hover:text-green-300">
                                                        {savingOrderNoteId === order.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                    </button>
                                                    <button onClick={cancelEditOrderNote} className="text-[#f0e6d3]/30 hover:text-[#f0e6d3]"><X size={12} /></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={() => startEditOrderNote(order)} className="flex items-start gap-1.5 text-start group/note w-full">
                                                <MessageSquare size={12} className={`mt-0.5 shrink-0 ${order.notes ? 'text-[#d4af37]/60' : 'text-[#f0e6d3]/15 group-hover/note:text-[#f0e6d3]/40'}`} />
                                                <span className="text-xs text-[#f0e6d3]/50 group-hover/note:text-[#f0e6d3]/80 line-clamp-2 leading-tight">
                                                    {order.notes || <span className="text-[#f0e6d3]/15">הוסף הערת הזמנה...</span>}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Line items grouped by vertical then vendor */}
                                <div className="p-5 space-y-5">
                                    {groups.map((g) => (
                                        <div key={g.vertical}>
                                            <div className="flex items-center gap-2 text-xs font-black text-[#f0e6d3]/50 uppercase tracking-wider mb-2">
                                                {g.vertical !== '__none__' ? (
                                                    <>
                                                        <VerticalIcon v={g.vertical} />
                                                        {VERTICAL_LABEL[g.vertical] ?? g.vertical}
                                                    </>
                                                ) : 'בקשת כרטיס'}
                                            </div>
                                            <div className="space-y-3">
                                                {g.vendorGroups.map((vg) => (
                                                    <div key={vg.key}>
                                                        {(vg.vendorName || vg.suffix) && (
                                                            <div className="flex items-center gap-1.5 text-[11px] text-[#d4af37]/70 font-bold mb-1.5">
                                                                <Store size={11} />
                                                                {vg.vendorName || 'ללא ספק'}
                                                                {vg.suffix && <span className="text-[#f0e6d3]/30 font-normal">({order.order_number}-{vg.suffix})</span>}
                                                            </div>
                                                        )}
                                                        <div className="space-y-1.5">
                                                            {vg.items.map((line) => {
                                                                const si = statusInfo(line.status);
                                                                const historyExpanded = expandedHistoryLineId === line.id;
                                                                const isSlaBreached = line.status === 'new' && (Date.now() - new Date(line.created_at).getTime()) > 86_400_000;
                                                                return (
                                                                    <Fragment key={line.id}>
                                                                    <div className={`bg-[#111a2f] rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 ${isSlaBreached ? 'border border-red-500/40' : 'border border-transparent'}`}>
                                                                        <button onClick={() => toggleSelect(line.id)} className="text-[#f0e6d3]/40 hover:text-[#d4af37] transition-colors shrink-0">
                                                                            {selectedIds.has(line.id) ? <CheckSquare size={14} className="text-[#d4af37]" /> : <Square size={14} />}
                                                                        </button>
                                                                        <span className="text-[10px] font-bold text-[#d4af37]/60 bg-[#0e1628] px-2 py-0.5 rounded-full">{TYPE_LABEL[line.lead_type] ?? line.lead_type}</span>
                                                                        {line.vendor_batch_id != null && line.vendor_id != null && (
                                                                            <span className="text-[10px] font-bold text-green-400/80 bg-[#0e1628] px-2 py-0.5 rounded-full">
                                                                                אצווה PB-{vendorCode(line.vendor_id)}-{String(line.vendor_batch_id).padStart(6, '0')}
                                                                            </span>
                                                                        )}
                                                                        <div className="min-w-[140px] flex-1">
                                                                            {line.product_title_he ? (
                                                                                <a
                                                                                    href={line.product_id ? `/${locale}/products?id=${line.product_id}` : `/${locale}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-sm font-semibold text-[#f0e6d3] hover:text-[#d4af37] transition-colors flex items-center gap-1 group/link"
                                                                                >
                                                                                    {line.product_title_he}
                                                                                    {line.quantity != null && line.quantity > 1 && <span className="text-[#d4af37] font-black">×{line.quantity}</span>}
                                                                                    <ExternalLink size={11} className="opacity-0 group-hover/link:opacity-60 transition-opacity" />
                                                                                </a>
                                                                            ) : line.lead_type === 'card_order' && line.shipping_address ? (
                                                                                <div className="text-xs text-[#f0e6d3]/70 space-y-0.5">
                                                                                    <p className="font-semibold text-[#f0e6d3]">{line.shipping_address.full_name}</p>
                                                                                    <p>{line.shipping_address.street}, {line.shipping_address.city} {line.shipping_address.zip_code || ''}</p>
                                                                                    <p dir="ltr" className="text-[#d4af37]/70">{line.shipping_address.phone}</p>
                                                                                </div>
                                                                            ) : <span className="text-[#f0e6d3]/25 text-sm">—</span>}
                                                                            {line.scheduled_at && (
                                                                                <div className="flex items-center gap-1 text-xs text-[#d4af37]/70 mt-0.5">
                                                                                    <CalendarDays size={11} />
                                                                                    {new Date(line.scheduled_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Notes */}
                                                                        <div className="min-w-[120px] max-w-[160px]">
                                                                            {editingNoteLineId === line.id ? (
                                                                                <div className="flex items-start gap-1">
                                                                                    <textarea
                                                                                        value={noteValue}
                                                                                        onChange={(e) => setNoteValue(e.target.value)}
                                                                                        rows={2}
                                                                                        className="flex-1 bg-[#0e1628] rounded-lg px-2 py-1 text-xs text-[#f0e6d3] resize-none w-24"
                                                                                        autoFocus
                                                                                    />
                                                                                    <div className="flex flex-col gap-1">
                                                                                        <button onClick={() => saveNote(line.id)} disabled={savingNoteLineId === line.id} className="text-green-400 hover:text-green-300">
                                                                                            {savingNoteLineId === line.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                                                        </button>
                                                                                        <button onClick={cancelEditNote} className="text-[#f0e6d3]/30 hover:text-[#f0e6d3]"><X size={12} /></button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <button onClick={() => startEditNote(line)} className="flex items-start gap-1.5 text-start group/note w-full" title="הוסף הערה">
                                                                                    <MessageSquare size={12} className={`mt-0.5 shrink-0 ${line.notes ? 'text-[#d4af37]/60' : 'text-[#f0e6d3]/15 group-hover/note:text-[#f0e6d3]/40'}`} />
                                                                                    <span className="text-xs text-[#f0e6d3]/50 group-hover/note:text-[#f0e6d3]/80 line-clamp-2 leading-tight">
                                                                                        {line.notes || <span className="text-[#f0e6d3]/15">הוסף הערה...</span>}
                                                                                    </span>
                                                                                </button>
                                                                            )}
                                                                        </div>

                                                                        {/* Assignment */}
                                                                        <select
                                                                            value={line.assigned_to ?? ''}
                                                                            onChange={(e) => handleAssign(line.id, e.target.value ? Number(e.target.value) : null)}
                                                                            className="bg-[#0e1628] border border-[#d4af37]/10 rounded-lg px-2 py-1 text-xs text-[#f0e6d3]/70 max-w-[100px]"
                                                                        >
                                                                            <option value="">ללא</option>
                                                                            {adminUsers.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                                                                        </select>

                                                                        {/* Status */}
                                                                        {updatingLineId === line.id ? (
                                                                            <Loader2 size={16} className="animate-spin text-[#d4af37]" />
                                                                        ) : (
                                                                            <select
                                                                                value={line.status}
                                                                                onChange={(e) => handleStatusChange(line, e.target.value)}
                                                                                className={`rounded-xl px-3 py-1.5 text-xs font-bold border-0 cursor-pointer ${si.color}`}
                                                                            >
                                                                                {STATUSES.map((s) => <option key={s.value} value={s.value} className="bg-[#0e1628] text-[#f0e6d3]">{s.label}</option>)}
                                                                            </select>
                                                                        )}

                                                                        {line.lead_type === 'appointment' && line.scheduled_at && (
                                                                            <button onClick={() => handleSendReminder(line.id)} disabled={sendingReminderIds.has(line.id)} className="text-[#f0e6d3]/20 hover:text-[#d4af37] transition-colors" title="שלח תזכורת לפגישה">
                                                                                {sendingReminderIds.has(line.id) ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
                                                                            </button>
                                                                        )}

                                                                        {line.history && line.history.length > 0 && (
                                                                            <button onClick={() => setExpandedHistoryLineId(historyExpanded ? null : line.id)} className="text-[#f0e6d3]/20 hover:text-[#d4af37] transition-colors" title="היסטוריה">
                                                                                <History size={13} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    {historyExpanded && line.history && (
                                                                        <div className="bg-[#0a1020] rounded-xl px-6 py-3 -mt-1">
                                                                            <p className="text-[10px] font-black text-[#f0e6d3]/30 uppercase tracking-widest mb-2">היסטוריית שינויים</p>
                                                                            <div className="space-y-1">
                                                                                {line.history.map((h, idx) => (
                                                                                    <div key={idx} className="flex items-center gap-3 text-xs text-[#f0e6d3]/50">
                                                                                        <span className="text-[#f0e6d3]/25 tabular-nums">{new Date(h.ts).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                                                        <span className="text-[#d4af37]/60">{h.action === 'status_change' || h.action === 'bulk_status_change' ? 'סטטוס' : h.action === 'assigned' || h.action === 'bulk_assign' ? 'הקצאה' : h.action}</span>
                                                                                        {h.from_val && <span>{h.from_val} → {h.to_val}</span>}
                                                                                        {!h.from_val && h.to_val && <span>→ {h.to_val}</span>}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    </Fragment>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
