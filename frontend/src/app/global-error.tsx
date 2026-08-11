'use client';

import './globals.css';
import { useEffect } from 'react';
import { reportError } from '@/lib/sentry';

// Next.js's required fallback for an error thrown by the root layout itself — since it
// replaces the whole tree when triggered, it must render its own <html>/<body>. Kept
// deliberately simple (Hebrew-only, no shared layout components) since this is the last-resort
// path for when something above it — potentially the locale/layout machinery itself — has failed.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        reportError(error);
    }, [error]);

    return (
        <html lang="he" dir="rtl">
            <body className="bg-[#111a2f] font-sans">
                <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
                    <h1 className="text-2xl font-black text-[#f0e6d3]">משהו השתבש</h1>
                    <p className="text-[#f0e6d3]/60 max-w-sm">קרתה שגיאה בלתי צפויה. ניתן לנסות שוב.</p>
                    <button onClick={reset} className="btn-primary mt-2">נסה שוב</button>
                </div>
            </body>
        </html>
    );
}
