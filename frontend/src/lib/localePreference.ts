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

/** Clears a prior manual override so the preferred-language auto-redirect can take effect again.
 * Called on logout only - a shared computer/tab must not let one account's manual language
 * choice silently suppress the auto-redirect for whichever different account logs in next in the
 * same tab. Deliberately NOT called after a preferred-language save: that action calls
 * markManualLocaleOverride() itself (see ProfileClient.tsx), and clearing it there instead would
 * reintroduce the exact bug that call exists to prevent - AuthContext's redirect effect would see
 * its own still-stale in-memory `user.preferred_language` disagree with the just-navigated-to URL
 * and immediately redirect back to the old language. */
export function clearManualLocaleOverride() {
    try {
        sessionStorage.removeItem(MANUAL_OVERRIDE_KEY);
    } catch {
        // Ignore - nothing to clear if storage was never writable to begin with.
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
