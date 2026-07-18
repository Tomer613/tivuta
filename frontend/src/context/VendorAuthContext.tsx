'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { vendorGetMe, VendorMe } from '@/lib/api';

interface VendorAuthContextType {
    vendor: VendorMe | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
    refresh: () => Promise<void>;
}

const VendorAuthContext = createContext<VendorAuthContextType | undefined>(undefined);

// Deliberately a separate localStorage key from 'tivuta_token' — a vendor and a member session
// must never collide if someone is logged into both in the same browser.
const STORAGE_KEY = 'tivuta_vendor_token';

export const VendorAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [vendor, setVendor] = useState<VendorMe | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            setToken(stored);
            fetchVendor(stored);
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchVendor = async (authToken: string) => {
        try {
            const data = await vendorGetMe(authToken);
            setVendor(data);
        } catch {
            logout();
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (authToken: string) => {
        localStorage.setItem(STORAGE_KEY, authToken);
        setToken(authToken);
        await fetchVendor(authToken);
    };

    const logout = () => {
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setVendor(null);
    };

    const refresh = async () => {
        if (token) await fetchVendor(token);
    };

    return (
        <VendorAuthContext.Provider value={{ vendor, token, isLoading, login, logout, refresh }}>
            {children}
        </VendorAuthContext.Provider>
    );
};

export const useVendorAuth = () => {
    const context = useContext(VendorAuthContext);
    if (context === undefined) {
        throw new Error('useVendorAuth must be used within a VendorAuthProvider');
    }
    return context;
};
