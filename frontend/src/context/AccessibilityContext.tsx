'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface AccessibilityPrefs {
    fontSize: 'normal' | 'large' | 'xlarge';
    highContrast: boolean;
    grayscale: boolean;
    underlineLinks: boolean;
    readableFont: boolean;
    stopAnimations: boolean;
}

const DEFAULT_PREFS: AccessibilityPrefs = {
    fontSize: 'normal',
    highContrast: false,
    grayscale: false,
    underlineLinks: false,
    readableFont: false,
    stopAnimations: false,
};

const STORAGE_KEY = 'tivuta_a11y_prefs';

interface AccessibilityContextType {
    prefs: AccessibilityPrefs;
    setFontSize: (size: AccessibilityPrefs['fontSize']) => void;
    toggle: (key: keyof Omit<AccessibilityPrefs, 'fontSize'>) => void;
    reset: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

function applyToDocument(prefs: AccessibilityPrefs) {
    const html = document.documentElement;
    html.setAttribute('data-a11y-fontsize', prefs.fontSize);
    html.setAttribute('data-a11y-contrast', prefs.highContrast ? 'high' : 'normal');
    html.setAttribute('data-a11y-grayscale', String(prefs.grayscale));
    html.setAttribute('data-a11y-underline-links', String(prefs.underlineLinks));
    html.setAttribute('data-a11y-readable-font', String(prefs.readableFont));
    html.setAttribute('data-a11y-stop-animations', String(prefs.stopAnimations));
}

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [prefs, setPrefs] = useState<AccessibilityPrefs>(DEFAULT_PREFS);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = { ...DEFAULT_PREFS, ...JSON.parse(stored) };
                setPrefs(parsed);
                applyToDocument(parsed);
            } else {
                applyToDocument(DEFAULT_PREFS);
            }
        } catch {
            applyToDocument(DEFAULT_PREFS);
        }
    }, []);

    const persist = (next: AccessibilityPrefs) => {
        setPrefs(next);
        applyToDocument(next);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
            // localStorage unavailable - preference just won't persist across reloads.
        }
    };

    const setFontSize = (size: AccessibilityPrefs['fontSize']) => {
        persist({ ...prefs, fontSize: size });
    };

    const toggle = (key: keyof Omit<AccessibilityPrefs, 'fontSize'>) => {
        persist({ ...prefs, [key]: !prefs[key] });
    };

    const reset = () => {
        persist(DEFAULT_PREFS);
    };

    return (
        <AccessibilityContext.Provider value={{ prefs, setFontSize, toggle, reset }}>
            {children}
        </AccessibilityContext.Provider>
    );
};

export const useAccessibility = () => {
    const context = useContext(AccessibilityContext);
    if (context === undefined) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider');
    }
    return context;
};
