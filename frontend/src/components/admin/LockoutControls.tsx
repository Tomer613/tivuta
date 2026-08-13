'use client';

import { Lock, Unlock } from 'lucide-react';

/** Red "נעול" badge for a locked account row — shown only while the caller has already confirmed
 * `isAccountLocked(entity.locked_until)`. `compact` trims padding/icon size for denser tables
 * (e.g. admin/vendors, which has more columns than admin/users). */
export function LockedBadge({ compact = false }: { compact?: boolean }) {
    return (
        <span
            className={`flex items-center gap-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 ${compact ? 'px-2 py-0.5' : 'px-3 py-1'}`}
            title="חשבון נעול עקב ניסיונות התחברות כושלים"
        >
            <Lock size={compact ? 11 : 12} /> נעול
        </span>
    );
}

/** "בטל נעילה" unlock action for a locked account row — same visibility precondition as
 * `LockedBadge`. `showLabel=false` renders icon-only, for tighter action columns. */
export function UnlockButton({ onClick, showLabel = true }: { onClick: () => void; showLabel?: boolean }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1 text-xs font-bold text-red-400/70 hover:text-red-400 transition-colors"
            title="הסר נעילה"
        >
            <Unlock size={showLabel ? 14 : 15} />
            {showLabel && 'בטל נעילה'}
        </button>
    );
}
