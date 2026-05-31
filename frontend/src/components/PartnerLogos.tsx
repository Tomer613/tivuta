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
const defaultRows: [string[], string[]] = [
    allLogos.slice(0, splitHalf),
    allLogos.slice(splitHalf),
];

interface LogoRowProps {
    logos: string[];
    reverse?: boolean;
    basePath: string;
}

// LogoRow is defined at module level (not inside PartnerLogos) so React never
// unmounts/remounts it on re-renders, which would reset the CSS animations.
const LogoRow = ({ logos, reverse = false, basePath }: LogoRowProps) => (
    <div
        className="w-full py-2 overflow-hidden relative"
        // Forces a GPU compositing layer so overflow:hidden correctly clips
        // the animated children on iOS Safari.
        style={{ transform: 'translateZ(0)' }}
    >
        {/*
          Single animated wrapper containing BOTH copies side by side.
          The wrapper's total width = 2W (max-content).
          Animation: translateX(0) → translateX(-50%) = translateX(-W).
          This means the wrapper shifts exactly one copy-width, creating a
          seamless loop: when Copy A exits left, Copy B takes its place.
          With the old approach (two independently-animated siblings), Copy A
          exited quickly while Copy B only arrived near the end of the cycle —
          leaving a long blank gap in the middle.
        */}
        <div
            className={`flex w-max hover:[animation-play-state:paused] ${reverse ? 'animate-scroll-reverse' : 'animate-scroll'} [animation-duration:35s] md:[animation-duration:70s] lg:[animation-duration:120s]`}
            dir="ltr"
            style={{ willChange: 'transform' }}
        >
            {[0, 1].map((copyIndex) => (
                <div
                    key={copyIndex}
                    className="flex shrink-0"
                    aria-hidden={copyIndex === 1 ? true : undefined}
                >
                    {logos.map((logo, index) => (
                        <div
                            key={`${logo}-${index}`}
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
    </div>
);

const PartnerLogos = () => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
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
