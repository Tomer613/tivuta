'use client';

import { useState } from 'react';
import { X, CalendarCheck, Loader2 } from 'lucide-react';

interface T {
    title: string;
    date: string;
    time: string;
    confirm: string;
    cancel: string;
}

const translations: Record<string, T> = {
    he: { title: 'קביעת פגישת התרשמות', date: 'תאריך', time: 'שעה', confirm: 'אישור קביעת פגישה', cancel: 'ביטול' },
    en: { title: 'Schedule a Viewing', date: 'Date', time: 'Time', confirm: 'Confirm Appointment', cancel: 'Cancel' },
    fr: { title: 'Planifier une visite', date: 'Date', time: 'Heure', confirm: 'Confirmer le rendez-vous', cancel: 'Annuler' },
    yi: { title: 'מאכן א באגעגעניש', date: 'דאטום', time: 'צייט', confirm: 'באשטעטיגן', cancel: 'אפזאגן' },
};

function minDateString() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

export default function AppointmentModal({
    locale,
    productTitle,
    onClose,
    onConfirm,
}: {
    locale: string;
    productTitle: string;
    onClose: () => void;
    onConfirm: (date: Date) => Promise<void>;
}) {
    const t = translations[locale] || translations.he;
    const [date, setDate] = useState('');
    const [time, setTime] = useState('12:00');
    const [submitting, setSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!date) return;
        setSubmitting(true);
        await onConfirm(new Date(`${date}T${time}:00`));
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150] flex items-center justify-center p-6" onClick={onClose}>
            <div
                className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl shadow-2xl p-8 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-[#f0e6d3]">{t.title}</h2>
                    <button onClick={onClose} aria-label="close" className="text-[#f0e6d3]/60 hover:text-[#f0e6d3]">
                        <X size={20} />
                    </button>
                </div>

                <p className="text-[#d4af37] font-bold mb-6">{productTitle}</p>

                <div className="space-y-4 mb-8">
                    <div className="flex flex-col gap-2 items-start">
                        <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest">{t.date}</label>
                        <input
                            type="date"
                            min={minDateString()}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#d4af37] transition-all text-[#f0e6d3]"
                        />
                    </div>
                    <div className="flex flex-col gap-2 items-start">
                        <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest">{t.time}</label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#d4af37] transition-all text-[#f0e6d3]"
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="btn-secondary flex-1 !text-sm">{t.cancel}</button>
                    <button
                        onClick={handleConfirm}
                        disabled={!date || submitting}
                        className="btn-primary flex-1 !text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        {submitting ? <Loader2 className="animate-spin" size={18} /> : <CalendarCheck size={18} />}
                        {t.confirm}
                    </button>
                </div>
            </div>
        </div>
    );
}
