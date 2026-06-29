'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Notification {
    id: string;
    text_he: string;
    text_en: string;
    type: 'info' | 'success' | 'warning';
    isRead: boolean;
    link?: string;
    createdAt: Date;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Initial dummy notifications for onboarding
    useEffect(() => {
        const initialNotifications: Notification[] = [
            {
                id: '1',
                text_he: 'בא להזמין את כרטיס האשראי של TIVUTA וליהנות מהטבות?',
                text_en: 'Want to order TIVUTA credit card and enjoy benefits?',
                type: 'info',
                isRead: false,
                link: '/card',
                createdAt: new Date()
            },
            {
                id: '2',
                text_he: 'בא לפתוח חשבון בנק ולקבל הטבות בלעדיות?',
                text_en: 'Want to open a bank account and get exclusive benefits?',
                type: 'info',
                isRead: false,
                link: '/monthly',
                createdAt: new Date()
            },
            {
                id: '3',
                text_he: 'בא להעביר את הביטוחים שלך ולחסוך מאות שקלים?',
                text_en: 'Want to transfer your insurances and save hundreds?',
                type: 'info',
                isRead: false,
                link: '/monthly',
                createdAt: new Date()
            }
        ];
        setNotifications(initialNotifications);
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    };

    const addNotification = (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
        const newNotification: Notification = {
            ...notification,
            id: Math.random().toString(36).substr(2, 9),
            isRead: false,
            createdAt: new Date()
        };
        setNotifications(prev => [newNotification, ...prev]);
    };

    const clearAll = () => {
        setNotifications([]);
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, addNotification, clearAll }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
