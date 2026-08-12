'use client';

import { Loader2, CheckCircle2, X } from 'lucide-react';

interface BulkStatusOption {
    value: string;
    label: string;
}

interface AdminUserBrief {
    id: number;
    first_name: string;
    last_name: string;
}

interface BulkActionToolbarProps {
    selectedCount: number;
    statuses: BulkStatusOption[];
    adminUsers: AdminUserBrief[];
    bulkAction: string;
    onBulkActionChange: (value: string) => void;
    bulkValue: string;
    onBulkValueChange: (value: string) => void;
    onExecute: () => void;
    onClear: () => void;
    loading: boolean;
}

/** Shared "select many, act once" toolbar — used by both admin/leads and admin/orders, which
 *  both bulk-act on Lead ids via the same adminBulkLeadAction endpoint. */
export default function BulkActionToolbar({
    selectedCount, statuses, adminUsers, bulkAction, onBulkActionChange, bulkValue, onBulkValueChange,
    onExecute, onClear, loading,
}: BulkActionToolbarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-3 mb-4 bg-[#0e1628] border border-[#d4af37]/30 rounded-2xl px-5 py-3">
            <span className="text-sm font-bold text-[#d4af37]">{selectedCount} נבחרו</span>
            <select data-testid="bulk-action-select" value={bulkAction} onChange={(e) => onBulkActionChange(e.target.value)} className="bg-[#111a2f] border border-[#d4af37]/20 rounded-xl px-3 py-1.5 text-xs text-[#f0e6d3]">
                <option value="">בחר פעולה...</option>
                <option value="set_status">שינוי סטטוס</option>
                <option value="assign">הקצאה לנציג</option>
            </select>
            {bulkAction === 'set_status' && (
                <select data-testid="bulk-value-select" value={bulkValue} onChange={(e) => onBulkValueChange(e.target.value)} className="bg-[#111a2f] border border-[#d4af37]/20 rounded-xl px-3 py-1.5 text-xs text-[#f0e6d3]">
                    <option value="">בחר סטטוס</option>
                    {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            )}
            {bulkAction === 'assign' && (
                <select data-testid="bulk-value-select" value={bulkValue} onChange={(e) => onBulkValueChange(e.target.value)} className="bg-[#111a2f] border border-[#d4af37]/20 rounded-xl px-3 py-1.5 text-xs text-[#f0e6d3]">
                    <option value="">ללא נציג</option>
                    {adminUsers.map((u) => <option key={u.id} value={String(u.id)}>{u.first_name} {u.last_name}</option>)}
                </select>
            )}
            <button data-testid="bulk-execute-button" onClick={onExecute} disabled={loading || !bulkAction} className="bg-[#d4af37] text-[#080d1f] px-4 py-1.5 rounded-xl text-xs font-black disabled:opacity-50 flex items-center gap-1.5">
                {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} בצע
            </button>
            <button onClick={onClear} className="text-xs text-[#f0e6d3]/40 hover:text-[#f0e6d3]"><X size={14} /></button>
        </div>
    );
}
