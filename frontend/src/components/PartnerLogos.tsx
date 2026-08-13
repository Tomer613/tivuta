'use client';

import { useState, useEffect, useRef } from 'react';

const allLogos = [
    "zara.png", "אור החיים.png", "אושר עד.png", "אפי קפיטל.png", "אפריל.png",
    "בגיר.png", "בנק פאגי.png", "גלי.png", "הדר דימול.png", "הלו תימן.png",
    "המנגנים.png", "המשביר לצרכן.png", "הצורפים.png", "יידישקייט.png", "ישראייר.png",
    "כלל.png", "כתר הרימון.png", "לניאדו.png", "מאפיית נחמה.png", "מגה ספורט.png",
    "מכבי.png", "מכללות.png", "מסילה.png", "משפחה מנויים.png", "מתנס חוגים.png",
    "נדרים פלוס.png", "נופש 2.png", "סולתם.png", "סופר פארם.png", "ספארי.png",
    "עוז קרמיקה.png", "פאות.png", "פיצה האט.png", "קידישיק.png", "קייטרינג.png",
    "קפה רימון.png", "רולדין.png", "רייסדור.png", "רמי לוי תקשורת.png", "רמי לוי.png",
    "שבת בוקינג.png", "שילב.png", "שלמה סיקסט.png", "שמלות כלה.png", "תיירות.png"
];

const splitHalf = Math.ceil(allLogos.length / 2);
const defaultRows: [string[], string[]] = [
    allLogos.slice(0, splitHalf),
    allLogos.slice(splitHalf),
];

interface LogoRowProps {
    logos: string[];
    reverse?: boolean;
    basePath: string;
}

// Defined at module level so React never remounts it on PartnerLogos re-renders
// (which would reset the animation).
const LogoRow = ({ logos, reverse = false, basePath }: LogoRowProps) => {
    const firstCopyRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        const first = firstCopyRef.current;
        const wrapper = wrapperRef.current;
        if (!first || !wrapper) return;

        // Percentage-based translateX(-50%) is unreliable on mobile browsers —
        // some compute the percentage against the viewport/parent width instead of
        // the element's own max-content width. We measure in pixels after all
        // images have loaded, then drive the animation with an exact pixel value.
        const start = () => {
            wrapper.style.setProperty('--copy-width', `${first.scrollWidth}px`);
            setAnimating(true);
        };

        const imgs = Array.from(first.querySelectorAll<HTMLImageElement>('img'));
        let pending = imgs.filter(img => !img.complete).length;

        if (pending === 0) {
            start();
            return;
        }

        const onSettled = () => {
            pending--;
            if (pending === 0) start();
        };

        imgs.forEach(img => {
            if (!img.complete) {
                img.addEventListener('load', onSettled, { once: true });
                img.addEventListener('error', onSettled, { once: true });
            }
        });
    }, [logos]);

    const animClass = animating
        ? `${reverse ? 'animate-scroll-reverse' : 'animate-scroll'} [animation-duration:30s] md:[animation-duration:60s] lg:[animation-duration:120s] hover:[animation-play-state:paused]`
        : '';

    return (
        // dir="ltr" ensures the flex row inside always starts from the physical
        // left edge regardless of the page's RTL direction.
        <div className="w-full py-2 overflow-hidden" dir="ltr">
            <div
                ref={wrapperRef}
                className={`flex ${animClass}`}
                style={{ willChange: animating ? 'transform' : undefined }}
            >
                <div ref={firstCopyRef} className="flex shrink-0">
                    {logos.map((logo, index) => (
                        <div
                            key={`a-${logo}-${index}`}
                            className="inline-flex items-center justify-center px-10 transition-all duration-300 hover:scale-110"
                        >
                            <img
                                src={`${basePath}/images/partners/${encodeURI(logo)}`}
                                alt={logo}
                                className="h-7 md:h-8 w-auto object-contain transition-all duration-500 mix-blend-screen [filter:invert(1)_grayscale(1)_brightness(10)_contrast(10)] hover:mix-blend-multiply hover:[filter:none] hover:scale-110"
                                style={{ maxWidth: 'none' }}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex shrink-0" aria-hidden="true">
                    {logos.map((logo, index) => (
                        <div
                            key={`b-${logo}-${index}`}
                            className="inline-flex items-center justify-center px-10 transition-all duration-300 hover:scale-110"
                        >
                            <img
                                src={`${basePath}/images/partners/${encodeURI(logo)}`}
                                alt={logo}
                                className="h-7 md:h-8 w-auto object-contain transition-all duration-500 mix-blend-screen [filter:invert(1)_grayscale(1)_brightness(10)_contrast(10)] hover:mix-blend-multiply hover:[filter:none] hover:scale-110"
                                style={{ maxWidth: 'none' }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const PartnerLogos = () => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const [rows, setRows] = useState<[string[], string[]]>(defaultRows);

    useEffect(() => {
        Promise.resolve().then(() => {
            const shuffled = [...allLogos].sort(() => Math.random() - 0.5);
            const h = Math.ceil(shuffled.length / 2);
            setRows([shuffled.slice(0, h), shuffled.slice(h)]);
        });
    }, []);

    return (
        <div className="w-full flex flex-col gap-0 py-4">
            <LogoRow logos={rows[0]} basePath={basePath} />
            <LogoRow logos={rows[1]} reverse basePath={basePath} />
        </div>
    );
};

export default PartnerLogos;
