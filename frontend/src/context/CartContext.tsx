'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const CART_KEY = 'tivuta_cart_v1';

export interface CartItem {
    id: number;
    vertical: string;
    title_he: string;
    title_en?: string | null;
    title_fr?: string | null;
    title_yi?: string | null;
    image_url?: string | null;
    price?: number | null;
    quantity: number;
}

interface CartContextType {
    items: CartItem[];
    totalCount: number;
    addToCart: (product: Omit<CartItem, 'quantity'>, quantity?: number) => void;
    removeFromCart: (productId: number) => void;
    updateQuantity: (productId: number, quantity: number) => void;
    clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<CartItem[]>([]);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(CART_KEY);
            if (raw) setItems(JSON.parse(raw));
        } catch { /* ignore */ }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(items));
        } catch { /* ignore */ }
    }, [items, hydrated]);

    const addToCart: CartContextType['addToCart'] = (product, quantity = 1) => {
        setItems((prev) => {
            const existing = prev.find((i) => i.id === product.id);
            if (existing) {
                return prev.map((i) => i.id === product.id ? { ...i, quantity: Math.min(99, i.quantity + quantity) } : i);
            }
            return [...prev, { ...product, quantity: Math.min(99, quantity) }];
        });
    };

    const removeFromCart = (productId: number) => {
        setItems((prev) => prev.filter((i) => i.id !== productId));
    };

    const updateQuantity = (productId: number, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(productId);
            return;
        }
        setItems((prev) => prev.map((i) => i.id === productId ? { ...i, quantity: Math.min(99, quantity) } : i));
    };

    const clearCart = () => setItems([]);

    const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <CartContext.Provider value={{ items, totalCount, addToCart, removeFromCart, updateQuantity, clearCart }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
