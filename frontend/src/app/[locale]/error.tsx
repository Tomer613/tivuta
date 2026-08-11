'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { normalizeLocale } from '@/lib/locales';
import { reportError } from '@/lib/sentry';

const TEXT = {
    he: { title: 'משהו השתבש', body: 'קרתה שגיאה בלתי צפויה. ניתן לנסות שוב.', retry: 'נסה שוב' },
    en: { title: 'Something went wrong', body: 'An unexpected error occurred. You can try again.', retry: 'Try again' },
    fr: { title: 'Une erreur est survenue', body: "Une erreur inattendue s'est produite. Vous pouvez réessayer.", retry: 'Réessayer' },
    yi: { title: 'עפעס איז שיף געגאנגען', body: 'עס איז פארגעקומען אן אומגעריכטע גרייז. איר קענט פרובירן נאכאמאל.', retry: 'פרובירט נאכאמאל' },
};

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const params = useParams();
    const locale = normalizeLocale(params?.locale as string | undefined);
    const t = TEXT[locale];

    useEffect(() => {
        reportError(error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-[#111a2f]">
            <h1 className="text-2xl font-black text-[#f0e6d3]">{t.title}</h1>
            <p className="text-[#f0e6d3]/60 max-w-sm">{t.body}</p>
            <button onClick={reset} className="btn-primary mt-2">{t.retry}</button>
        </div>
    );
}
