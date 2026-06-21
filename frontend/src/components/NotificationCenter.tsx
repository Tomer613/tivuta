'use client';

import React from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { Bell, CheckCircle, ArrowRight, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function NotificationCenter() {
    const { notifications, markAsRead, clearAll } = useNotifications();
    const params = useParams();
    const locale = params.locale as string || 'he';

    if (notifications.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0e1628] p-6 rounded-[2.5rem] shadow-sm border border-[#d4af37]/20 flex flex-col"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#f0e6d3] flex items-center gap-3">
                    <Bell className="text-[#d4af37]" size={18} />
                    {locale === 'he' ? 'הודעות' : 'Messages'}
                </h3>
                <button 
                    onClick={clearAll}
                    className="text-[10px] font-bold text-[#f0e6d3]/60 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                    <Trash2 size={12} />
                    {locale === 'he' ? 'נקה' : 'Clear'}
                </button>
            </div>


            <div className="space-y-3">


                <AnimatePresence mode="popLayout">
                    {notifications.map((notif) => (
                        <motion.div
                            key={notif.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className={`p-4 rounded-2xl border transition-all ${notif.isRead ? 'bg-[#111a2f] border-[#d4af37]/20 opacity-60' : 'bg-[#0e1628] border-amber-100 shadow-sm border-s-4 border-s-amber-400'}`}
                        >
                            <div className="flex justify-between gap-4">
                                <div className="flex-grow">
                                    <p className={`text-sm font-bold ${notif.isRead ? 'text-[#f0e6d3]/60' : 'text-[#f0e6d3]'}`}>
                                        {locale === 'he' ? notif.text_he : notif.text_en}
                                    </p>
                                    <p className="text-[10px] text-[#f0e6d3]/60 mt-2 font-medium">
                                        {new Date(notif.createdAt).toLocaleTimeString(locale === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {!notif.isRead && (
                                        <button 
                                            onClick={() => markAsRead(notif.id)}
                                            className="p-1.5 bg-[#d4af37]/10 text-[#d4af37] rounded-lg hover:bg-[#d4af37]/20 transition-colors"
                                            title={locale === 'he' ? 'סמן כנקרא' : 'Mark as read'}
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                    )}
                                    {notif.link && (
                                        <Link 
                                            href={`/${locale}${notif.link}`}
                                            className="p-1.5 bg-[#080d1f] text-white rounded-lg hover:bg-slate-800 transition-colors"
                                            title={locale === 'he' ? 'מעבר לפרטים' : 'View details'}
                                        >
                                            <ArrowRight size={16} className={locale === 'he' ? 'rotate-180' : ''} />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
