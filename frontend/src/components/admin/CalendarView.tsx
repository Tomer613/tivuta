'use client';

import { useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Bell } from 'lucide-react';

/**
 * Extracted from two byte-identical copies (admin/orders and admin/leads pages) that had already
 * drifted once before (one carried a `FlatLine[]` type, the other left it `any[]`). Both pages'
 * existing appointment-line objects already satisfy this shape as-is — no call-site remapping
 * needed, just swap the import and delete the local definition.
 */
export interface CalendarItem {
    id: number;
    scheduled_at?: string | null;
    user_name?: string | null;
    product_title_he?: string | null;
}

export default function CalendarView({ lines, onSendReminder, sendingIds }: { lines: CalendarItem[]; onSendReminder: (id: number) => void; sendingIds: Set<number> }) {
    const today = new Date();
    const [month, setMonth] = useState(today.getMonth());
    const [year, setYear] = useState(today.getFullYear());

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    const byDay: Record<number, CalendarItem[]> = {};
    lines.forEach((l) => {
        // Both current callers pre-filter to items with a real scheduled_at, but this component
        // is shared/exported now — guard here too rather than relying on that staying true.
        if (!l.scheduled_at) return;
        const d = new Date(l.scheduled_at);
        if (d.getMonth() === month && d.getFullYear() === year) {
            const day = d.getDate();
            if (!byDay[day]) byDay[day] = [];
            byDay[day].push(l);
        }
    });

    const monthLabel = new Date(year, month, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    const cells: (number | null)[] = [...Array(firstDayOfWeek).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

    return (
        <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => { setMonth((m) => m === 0 ? 11 : m - 1); if (month === 0) setYear((y) => y - 1); }} className="p-2 hover:bg-[#111a2f] rounded-xl transition-colors text-[#f0e6d3]/60"><ChevronRight size={16} /></button>
                <h3 className="font-black text-[#f0e6d3]">{monthLabel}</h3>
                <button onClick={() => { setMonth((m) => m === 11 ? 0 : m + 1); if (month === 11) setYear((y) => y + 1); }} className="p-2 hover:bg-[#111a2f] rounded-xl transition-colors text-[#f0e6d3]/60"><ChevronLeft size={16} /></button>
            </div>
            <div className="overflow-x-auto no-scrollbar -mx-2 px-2">
            <div className="min-w-[420px]">
            <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[10px] text-[#f0e6d3]/30 font-bold">
                {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => {
                    if (!day) return <div key={i} />;
                    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                    const appts = byDay[day] || [];
                    return (
                        <div key={i} className={`min-h-[64px] rounded-xl p-1.5 border transition-colors ${isToday ? 'border-[#d4af37]/50 bg-[#d4af37]/5' : 'border-[#d4af37]/5 hover:border-[#d4af37]/20'}`}>
                            <div className={`text-[10px] font-bold mb-1 text-end ${isToday ? 'text-[#d4af37]' : 'text-[#f0e6d3]/30'}`}>{day}</div>
                            {appts.map((l) => (
                                <div key={l.id} className="group/cal bg-[#111a2f] rounded-lg px-1.5 py-1 mb-1 cursor-default">
                                    <p className="text-[9px] text-[#f0e6d3]/80 font-semibold line-clamp-1">{l.user_name}</p>
                                    <p className="text-[9px] text-[#f0e6d3]/40 line-clamp-1">{l.product_title_he}</p>
                                    <button
                                        onClick={() => onSendReminder(l.id)}
                                        disabled={sendingIds.has(l.id)}
                                        className="hidden group-hover/cal:flex items-center gap-1 text-[8px] text-[#d4af37] mt-0.5"
                                    >
                                        {sendingIds.has(l.id) ? <Loader2 size={8} className="animate-spin" /> : <><Bell size={8} /> תזכורת</>}
                                    </button>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
            </div>
            </div>
        </div>
    );
}
