import type { useRouter } from 'next/navigation';

type Router = ReturnType<typeof useRouter>;

/**
 * Guards an action that needs a logged-in user (contact/schedule/favorite, etc.) on a page that
 * is itself viewable without login. Returns true when the caller should proceed; otherwise sends
 * the visitor to login with a `?redirect=` back to where they were, same pattern already used by
 * AuthGate/cart/page.tsx.
 */
export function requireLogin(token: string | null, router: Router, locale: string, currentPath: string): token is string {
    if (token) return true;
    router.push(`/${locale}/login?redirect=${encodeURIComponent(currentPath)}`);
    return false;
}
