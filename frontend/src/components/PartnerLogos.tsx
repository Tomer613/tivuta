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

const PartnerLogos = () => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const [rows, setRows] = useState<[string[], string[]]>([[], []]);

    useEffect(() => {
        const shuffled = [...allLogos].sort(() => Math.random() - 0.5);
        const half = Math.ceil(shuffled.length / 2);
        setRows([shuffled.slice(0, half), shuffled.slice(half)]);
    }, []);

    const LogoRow = ({ logos, reverse = false }: { logos: string[], reverse?: boolean }) => {
        if (logos.length === 0) return null;

        return (
            <div className="w-full py-2 overflow-hidden relative flex">
                <div 
                    className={`flex shrink-0 hover:[animation-play-state:paused] ${reverse ? 'animate-scroll-reverse' : 'animate-scroll'} [animation-duration:35s] md:[animation-duration:70s] lg:[animation-duration:120s]`}
                    dir="ltr"
                >
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
                <div 
                    className={`flex shrink-0 hover:[animation-play-state:paused] ${reverse ? 'animate-scroll-reverse' : 'animate-scroll'} [animation-duration:35s] md:[animation-duration:70s] lg:[animation-duration:120s]`}
                    dir="ltr"
                    aria-hidden="true"
                >
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
        );
    };

    return (
        <div className="w-full flex flex-col gap-0 py-4">
            <LogoRow logos={rows[0]} />
            <LogoRow logos={rows[1]} reverse={true} />
        </div>
    );
};

export default PartnerLogos;
