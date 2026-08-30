import { LOCALES, Locale } from './locales';

const MANUAL_OVERRIDE_KEY = 'tivuta_locale_manual_override';

/** Replaces the locale segment (index 1) of a `/{locale}/...` pathname. */
export function swapLocaleInPath(pathname: string, newLocale: string): string {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    return segments.join('/');
}

/** Called by the header language switcher when a user manually picks a language, so the
 * preferred-language auto-redirect doesn't immediately fight a deliberate choice for the rest of
 * this browser tab. sessionStorage (not localStorage) is deliberate: a fresh visit later should
 * still default back to the stored preference. */
export function markManualLocaleOverride() {
    try {
        sessionStorage.setItem(MANUAL_OVERRIDE_KEY, '1');
    } catch {
        // Ignore - a private-browsing/blocked-storage session just won't remember the override.
    }
}

function hasManualLocaleOverride(): boolean {
    try {
        return sessionStorage.getItem(MANUAL_OVERRIDE_KEY) === '1';
    } catch {
        return false;
    }
}

/** Returns the locale a logged-in user should be redirected to given their stored preference and
 * the page's current locale, or null if no redirect is needed (no preference set, preference
 * already matches, or the user manually overrode the language earlier this session). */
export function getPreferredRedirect(
    user: { preferred_language?: string | null } | null,
    currentLocale: string
): Locale | null {
    const preferred = user?.preferred_language;
    if (!preferred || !(LOCALES as readonly string[]).includes(preferred)) return null;
    if (preferred === currentLocale) return null;
    if (hasManualLocaleOverride()) return null;
    return preferred as Locale;
}
