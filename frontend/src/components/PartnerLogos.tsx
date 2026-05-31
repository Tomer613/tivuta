'use client';

import { useState, useEffect } from 'react';

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
// Pre-split outside the component so the initial render already has content (no blank flash)
const defaultRows: [string[], string[]] = [
    allLogos.slice(0, splitHalf),
    allLogos.slice(splitHalf),
];

interface LogoRowProps {
    logos: string[];
    reverse?: boolean;
    basePath: string;
}

// Defined outside PartnerLogos so its reference stays stable across renders.
// If it were inside, React would see a new component type on every render and
// unmount+remount the rows, resetting the CSS animations and causing the flicker.
const LogoRow = ({ logos, reverse = false, basePath }: LogoRowProps) => (
    <div
        className="w-full py-2 overflow-hidden relative flex"
        // translateZ(0) forces a GPU compositing layer on the container so that
        // overflow:hidden correctly clips the animated children on iOS Safari,
        // which otherwise lets transformed elements bleed outside the bounds.
        style={{ transform: 'translateZ(0)' }}
    >
        {[0, 1].map((copyIndex) => (
            <div
                key={copyIndex}
                className={`flex shrink-0 hover:[animation-play-state:paused] ${reverse ? 'animate-scroll-reverse' : 'animate-scroll'} [animation-duration:35s] md:[animation-duration:70s] lg:[animation-duration:120s]`}
                dir="ltr"
                aria-hidden={copyIndex === 1 ? true : undefined}
                style={{ willChange: 'transform' }}
            >
                {logos.map((logo, index) => (
                    <div
                        key={`${copyIndex}-${logo}-${index}`}
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
        ))}
    </div>
);

const PartnerLogos = () => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    // Start with real data so SSR and first paint already show logos.
    // useEffect then shuffles once for variety — but the animation is already running.
    const [rows, setRows] = useState<[string[], string[]]>(defaultRows);

    useEffect(() => {
        const shuffled = [...allLogos].sort(() => Math.random() - 0.5);
        const h = Math.ceil(shuffled.length / 2);
        setRows([shuffled.slice(0, h), shuffled.slice(h)]);
    }, []);

    return (
        <div className="w-full flex flex-col gap-0 py-4">
            <LogoRow logos={rows[0]} basePath={basePath} />
            <LogoRow logos={rows[1]} reverse basePath={basePath} />
        </div>
    );
};

export default PartnerLogos;
