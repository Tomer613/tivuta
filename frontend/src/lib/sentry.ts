/**
 * Thin wrapper around @sentry/browser, lazy-loaded via dynamic import() so the SDK's code is
 * its own chunk — fetched only when NEXT_PUBLIC_SENTRY_DSN is actually set, never blocking
 * initial paint. `initPromise` is memoized so init() only ever runs once regardless of how many
 * callers (SentryInit on mount, an error boundary reporting before that effect has fired) reach
 * loadSentry() first.
 */
type SentryModule = typeof import('@sentry/browser');

let initPromise: Promise<SentryModule | null> | null = null;

function loadSentry(): Promise<SentryModule | null> {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return Promise.resolve(null);
    if (!initPromise) {
        initPromise = import('@sentry/browser').then((Sentry) => {
            Sentry.init({ dsn });
            return Sentry;
        });
    }
    return initPromise;
}

export function initSentry(): void {
    void loadSentry();
}

export function reportError(error: unknown): void {
    void loadSentry().then((Sentry) => Sentry?.captureException(error));
}
