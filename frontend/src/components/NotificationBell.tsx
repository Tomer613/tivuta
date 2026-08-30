'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Bell, X, CheckCheck } from 'lucide-react';
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '@/lib/api';
import { useOutsideClick } from '@/lib/useOutsideClick';

interface Notification {
    id: number;
    type: string;
    title: string;
    message?: string | null;
    locale?: string;
    is_read: boolean;
    link?: string | null;
    created_at: string;
}

export default function NotificationBell({ token }: { token: string }) {
    const params = useParams();
    const router = useRouter();
    const locale = (params?.locale as string) || 'he';
    const isRTL = locale === 'he' || locale === 'yi';
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unread, setUnread] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    const load = async () => {
        const [notifs, count] = await Promise.all([getNotifications(token), getUnreadCount(token)]);
        setNotifications(notifs);
        setUnread(count);
    };

    useEffect(() => {
        Promise.resolve().then(load);
        const interval = setInterval(load, 60_000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useOutsideClick(ref, () => setOpen(false));

    const handleMarkRead = async (id: number) => {
        await markNotificationRead(token, id);
        setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
        setUnread((c) => Math.max(0, c - 1));
    };

    const handleNotificationClick = (n: Notification) => {
        handleMarkRead(n.id);
        if (n.link) {
            setOpen(false);
            router.push(`/${locale}${n.link}`);
        }
    };

    const handleMarkAll = async () => {
        await markAllNotificationsRead(token);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnread(0);
    };

    const typeIcon: Record<string, string> = {
        lead_status: '📋',
        appointment_reminder: '📅',
        system: '🔔',
        followup: '⏰',
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="relative w-10 h-10 rounded-full bg-[#111a2f] border border-[#d4af37]/20 flex items-center justify-center hover:border-[#d4af37]/50 transition-colors"
            >
                <Bell size={17} className="text-[#f0e6d3]/70" />
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#d4af37] text-[#080d1f] text-[9px] font-black rounded-full flex items-center justify-center">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute end-0 top-11 w-80 max-w-[90vw] bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl shadow-2xl z-[300] overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#d4af37]/10">
                        <span className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest">התראות</span>
                        <div className="flex items-center gap-2">
                            {unread > 0 && (
                                <button onClick={handleMarkAll} className="flex items-center gap-1 text-[10px] text-[#d4af37] hover:opacity-70 transition-opacity font-bold">
                                    <CheckCheck size={11} /> סמן הכל
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="text-[#f0e6d3]/30 hover:text-[#f0e6d3]/70">
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className="text-center text-[#f0e6d3]/30 text-sm py-8">אין התראות</p>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`px-4 py-3 border-b border-[#d4af37]/5 ${n.link ? 'cursor-pointer' : 'cursor-default'} hover:bg-[#111a2f] transition-colors ${!n.is_read ? 'bg-[#d4af37]/5' : ''}`}
                                    onClick={() => handleNotificationClick(n)}
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="text-base leading-none mt-0.5">{typeIcon[n.type] || '🔔'}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs leading-snug mb-0.5 ${!n.is_read ? 'font-bold text-[#f0e6d3]' : 'text-[#f0e6d3]/70'}`}>
                                                {n.title}
                                            </p>
                                            {n.message && (
                                                <p className="text-[10px] text-[#f0e6d3]/40 line-clamp-2">{n.message}</p>
                                            )}
                                            <p className="text-[9px] text-[#f0e6d3]/25 mt-1">
                                                {new Date(n.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        {!n.is_read && <div className="w-2 h-2 rounded-full bg-[#d4af37] shrink-0 mt-1" />}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
