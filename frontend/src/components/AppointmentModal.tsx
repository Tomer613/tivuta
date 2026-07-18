'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CalendarCheck, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Vendor } from '@/lib/api';

interface T {
    title: string;
    pickDate: string;
    pickTime: string;
    confirm: string;
    cancel: string;
    noSlots: string;
}

const translations: Record<string, T> = {
    he: { title: 'קביעת פגישת התרשמות', pickDate: 'בחר תאריך', pickTime: 'בחר שעה', confirm: 'אישור קביעת פגישה', cancel: 'ביטול', noSlots: 'אין שעות פנויות ביום זה' },
    en: { title: 'Schedule a Viewing', pickDate: 'Pick a date', pickTime: 'Pick a time', confirm: 'Confirm Appointment', cancel: 'Cancel', noSlots: 'No available times on this day' },
    fr: { title: 'Planifier une visite', pickDate: 'Choisissez une date', pickTime: "Choisissez l'heure", confirm: 'Confirmer le rendez-vous', cancel: 'Annuler', noSlots: 'Aucun créneau disponible ce jour' },
    yi: { title: 'מאכן א באגעגעניש', pickDate: 'קלייב א דאטום', pickTime: 'קלייב א צייט', confirm: 'באשטעטיגן', cancel: 'אפזאגן', noSlots: 'קיין פרייע צייטן נישטא היינט' },
};

const WEEKDAY_LABELS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

const MONTH_LABELS: Record<string, string[]> = {
    he: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    yi: ['יאנואר', 'פעברואר', 'מערץ', 'אפריל', 'מיי', 'יוני', 'יולי', 'אויגוסט', 'סעפטעמבער', 'אקטאבער', 'נאוועמבער', 'דעצעמבער'],
};

const DEFAULT_AVAILABILITY = {
    weekly: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [String(i), { enabled: true, start: '09:00', end: '18:00' }])),
    slot_minutes: 30,
};

function toDateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function timeToMinutes(t: string) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function minutesToTime(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function AppointmentModal({
    locale,
    productTitle,
    vendor,
    onClose,
    onConfirm,
}: {
    locale: string;
    productTitle: string;
    vendor?: Vendor | null;
    onClose: () => void;
    onConfirm: (date: Date) => Promise<void>;
}) {
    const t = translations[locale] || translations.he;
    const monthLabels = MONTH_LABELS[locale] || MONTH_LABELS.he;

    const availability = vendor && vendor.is_active === false
        ? null
        : vendor?.availability?.weekly
            ? vendor.availability
            : DEFAULT_AVAILABILITY;

    const tomorrow = useMemo(() => {
        const d = startOfDay(new Date());
        d.setDate(d.getDate() + 1);
        return d;
    }, []);

    const [viewMonth, setViewMonth] = useState(() => new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1));
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const isDayAvailable = (date: Date) => {
        if (!availability) return false;
        if (date < tomorrow) return false;
        const day = availability.weekly[String(date.getDay())];
        return !!day?.enabled;
    };

    const slotsForDate = (date: Date): string[] => {
        if (!availability) return [];
        const day = availability.weekly[String(date.getDay())];
        if (!day?.enabled || !day.start || !day.end) return [];
        const slotMinutes = availability.slot_minutes || 30;
        const startMin = timeToMinutes(day.start);
        const endMin = timeToMinutes(day.end);
        const slots: string[] = [];
        for (let m = startMin; m < endMin; m += slotMinutes) {
            slots.push(minutesToTime(m));
        }
        return slots;
    };

    const handleSelectDay = (date: Date) => {
        if (!isDayAvailable(date)) return;
        setSelectedDate(date);
        setSelectedSlot(null);
    };

    const handleConfirm = async () => {
        if (!selectedDate || !selectedSlot) return;
        setSubmitting(true);
        await onConfirm(new Date(`${toDateKey(selectedDate)}T${selectedSlot}:00`));
        setSubmitting(false);
    };

    const changeMonth = (delta: number) => {
        setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };

    const isPrevDisabled = viewMonth.getFullYear() === tomorrow.getFullYear() && viewMonth.getMonth() === tomorrow.getMonth();

    // Build the 7-column day grid, padded with leading blanks so the 1st lands under its real weekday.
    const gridCells = useMemo(() => {
        const year = viewMonth.getFullYear();
        const month = viewMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells: (Date | null)[] = Array(firstDay.getDay()).fill(null);
        for (let d = 1; d <= daysInMonth; d++) {
            cells.push(new Date(year, month, d));
        }
        return cells;
    }, [viewMonth]);

    const slots = selectedDate ? slotsForDate(selectedDate) : [];

    const modal = (
        <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-6"
            onClick={onClose}
        >
            <div
                className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl shadow-2xl p-8 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-[#f0e6d3]">{t.title}</h2>
                    <button onClick={onClose} aria-label="close" className="text-[#f0e6d3]/60 hover:text-[#f0e6d3] transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <p className="text-[#d4af37] font-bold mb-6">{productTitle}</p>

                {/* Month header */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        type="button"
                        onClick={() => !isPrevDisabled && changeMonth(-1)}
                        disabled={isPrevDisabled}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#f0e6d3]/60 hover:text-[#d4af37] hover:bg-[#111a2f] transition-colors disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-[#f0e6d3]/60"
                        aria-label="previous month"
                    >
                        <ChevronRight size={18} />
                    </button>
                    <span className="text-sm font-black text-[#f0e6d3] tracking-wide">
                        {monthLabels[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                    </span>
                    <button
                        type="button"
                        onClick={() => changeMonth(1)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#f0e6d3]/60 hover:text-[#d4af37] hover:bg-[#111a2f] transition-colors"
                        aria-label="next month"
                    >
                        <ChevronLeft size={18} />
                    </button>
                </div>

                {/* Weekday header */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                    {WEEKDAY_LABELS.map((w) => (
                        <div key={w} className="text-center text-[10px] font-black text-[#f0e6d3]/35 uppercase py-1">{w}</div>
                    ))}
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-7 gap-1 mb-5">
                    {gridCells.map((date, i) => {
                        if (!date) return <div key={`b${i}`} />;
                        const available = isDayAvailable(date);
                        const isSelected = selectedDate && toDateKey(selectedDate) === toDateKey(date);
                        return (
                            <button
                                key={toDateKey(date)}
                                type="button"
                                disabled={!available}
                                onClick={() => handleSelectDay(date)}
                                className={`aspect-square rounded-xl text-sm font-bold transition-colors flex items-center justify-center
                                    ${isSelected
                                        ? 'bg-[#d4af37] text-[#080d1f]'
                                        : available
                                            ? 'text-[#f0e6d3] hover:bg-[#d4af37]/15 cursor-pointer'
                                            : 'text-[#f0e6d3]/15 cursor-not-allowed'}`}
                            >
                                {date.getDate()}
                            </button>
                        );
                    })}
                </div>

                {/* Time slots */}
                {selectedDate && (
                    <div className="mb-6">
                        <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest mb-2 block">{t.pickTime}</label>
                        {slots.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {slots.map((slot) => (
                                    <button
                                        key={slot}
                                        type="button"
                                        onClick={() => setSelectedSlot(slot)}
                                        className={`px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
                                            selectedSlot === slot
                                                ? 'bg-[#d4af37] text-[#080d1f]'
                                                : 'bg-[#111a2f] text-[#f0e6d3]/80 border border-[#d4af37]/20 hover:border-[#d4af37]/50'
                                        }`}
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-[#f0e6d3]/40">{t.noSlots}</p>
                        )}
                    </div>
                )}

                <div className="flex gap-3">
                    <button onClick={onClose} className="btn-secondary flex-1 !text-sm">{t.cancel}</button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedDate || !selectedSlot || submitting}
                        className="btn-primary flex-1 !text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        {submitting ? <Loader2 className="animate-spin" size={18} /> : <CalendarCheck size={18} />}
                        {t.confirm}
                    </button>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
