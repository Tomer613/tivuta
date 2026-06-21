'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { motion } from 'framer-motion';

export default function NotificationBell() {
    const { unreadCount } = useNotifications();

    if (unreadCount === 0) return null;

    return (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ 
                scale: 1,
                rotate: [0, -15, 15, -15, 15, 0],
            }}
            transition={{ 
                rotate: {
                    repeat: Infinity,
                    duration: 2,
                    ease: "easeInOut",
                    repeatDelay: 3
                }
            }}
            className="relative"
        >
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white z-10 animate-pulse">
                {unreadCount}
            </div>
            <div className="p-2 bg-[#d4af37]/20 text-[#d4af37] rounded-full shadow-sm hover:bg-amber-200 transition-colors">
                <Bell size={18} />
            </div>
        </motion.div>
    );
}
