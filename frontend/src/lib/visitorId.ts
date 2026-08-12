const STORAGE_KEY = 'tivuta_visitor_id';

// Anonymous, per-browser identifier for approximate unique-visitor counts — not a cookie, never
// sent cross-site, no PII. Cleared if localStorage is cleared, which is the accepted trade-off
// (privacy over precision).
export function getOrCreateVisitorId(): string {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
}
