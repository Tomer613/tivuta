'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BASE_URL } from '@/lib/api';
import { getPreferredRedirect, swapLocaleInPath } from '@/lib/localePreference';


export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role?: 'member' | 'admin';
    gender?: 'male' | 'female' | null;
    city?: string | null;
    birth_year?: number | null;
    id_number?: string | null;
    club_affiliation?: string | null;
    membership_tracks?: string[] | null;
    notification_prefs?: Record<string, boolean> | null;
    preferred_language?: string | null;
    customer_number?: string | null;
    points_balance?: number;
    locked_until?: string | null;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
    signup: (userData: Record<string, unknown>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const logout = () => {
        localStorage.removeItem('tivuta_token');
        setToken(null);
        setUser(null);
    };

    const fetchUser = async (authToken: string) => {
        try {
            const response = await fetch(`${BASE_URL}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
            } else {
                logout();
            }
        } catch (error) {
            console.error('Failed to fetch user:', error);
            logout();
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        Promise.resolve().then(() => {
            const storedToken = localStorage.getItem('tivuta_token');
            if (storedToken) {
                setToken(storedToken);
                fetchUser(storedToken);
            } else {
                setIsLoading(false);
            }
        });
    }, []);

    // Once the user's stored preference loads, land them on it by default - the header's language
    // switcher (markManualLocaleOverride) is what keeps this from fighting a deliberate manual
    // switch for the rest of this browsing session; a fresh visit later goes back to defaulting
    // to the stored preference.
    useEffect(() => {
        // The legacy /benefits/{locale}/... sub-app has its own separate URL shape (locale is
        // segment 2, not 1) and is treated as frozen elsewhere in this codebase - skip it here too
        // rather than risk corrupting its URL by swapping the wrong segment.
        if (!user || !pathname || pathname.startsWith('/benefits/')) return;
        const currentLocale = pathname.split('/')[1] || 'he';
        const target = getPreferredRedirect(user, currentLocale);
        if (target) {
            // usePathname() excludes the query string/hash - read them from window.location so a
            // deep link like /he/products?id=42 or /he/cart#section keeps its query/anchor across
            // the redirect instead of silently losing it.
            const suffix = typeof window !== 'undefined' ? window.location.search + window.location.hash : '';
            router.replace(swapLocaleInPath(pathname, target) + suffix);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, pathname]);

    const login = async (authToken: string) => {
        localStorage.setItem('tivuta_token', authToken);
        setToken(authToken);
        await fetchUser(authToken);
    };

    const signup = async (userData: Record<string, unknown>) => {
        // Handle signup logic
        const response = await fetch(`${BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Signup failed');
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout, signup }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
