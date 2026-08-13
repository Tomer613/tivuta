'use client';

import { Clock, CheckCircle2 } from 'lucide-react';
import { useCountdown } from '@/lib/useCountdown';

interface T {
    tooMany: string;
    tryAgainIn: string;
    canRetry: string;
}

const translations: Record<string, T> = {
    he: { tooMany: 'יותר מדי ניסיונות כניסה כושלים', tryAgainIn: 'ניתן לנסות שוב בעוד', canRetry: 'ניתן לנסות שוב כעת' },
    en: { tooMany: 'Too many failed login attempts', tryAgainIn: 'You can try again in', canRetry: 'You can try again now' },
    fr: { tooMany: 'Trop de tentatives de connexion échouées', tryAgainIn: 'Vous pourrez réessayer dans', canRetry: 'Vous pouvez réessayer maintenant' },
    yi: { tooMany: 'צופיל פאדעכטע פרואוון אריינצוגיין', tryAgainIn: 'איר קענט ווידער פרובירן אין', canRetry: 'איר קענט יעצט ווידער פרובירן' },
};

/** Live-ticking replacement for a static "try again in N minutes" message — computes the exact
 * remaining time from the real locked_until instant, so it stays accurate across page refreshes
 * instead of always showing the full configured lockout duration. */
export default function LockoutCountdown({ lockedUntil, locale }: { lockedUntil: string; locale: string }) {
    const t = translations[locale] || translations.he;
    const r = useCountdown(lockedUntil);

    if (!r) {
        return (
            <div className="flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                <span>{t.canRetry}</span>
            </div>
        );
    }

    const mm = r.d > 0 ? r.d * 24 + r.h : r.h;
    return (
        <div className="flex flex-col items-center gap-1">
            <span>{t.tooMany}</span>
            <div className="flex items-center gap-1.5">
                <Clock size={14} />
                <span>{t.tryAgainIn}</span>
                <span className="font-black tabular-nums" dir="ltr">
                    {mm > 0 && `${String(mm).padStart(2, '0')}:`}{String(r.m).padStart(2, '0')}:{String(r.s).padStart(2, '0')}
                </span>
            </div>
        </div>
    );
}
