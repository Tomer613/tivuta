"use client";

import React, { useState, useEffect } from 'react';

const slogans: Record<string, string[]> = {
    he: [
        "לטובתך ולהנאתך.",
        "המעטפת שאתה צריך.",
        "הקהילה שעובדת בשבילך.",
        "כל ההטבות במקום אחד.",
        "הכוח של הקהילה."
    ],
    en: [
        "For your benefit and enjoyment.",
        "The envelope you need.",
        "The community working for you.",
        "All benefits in one place.",
        "The power of community."
    ],
    fr: [
        "Pour votre bénéfice et votre plaisir.",
        "L'enveloppe qu'il vous faut.",
        "La communauté à votre service.",
        "Tous les avantages en un lieu.",
        "La force de la communauté."
    ],
    yi: [
        "פאר אייער טובה און הנאה.",
        "די מעטפת וואס איר דארפט.",
        "די קהילה וואס ארבעט פאר אייך.",
        "אלע בענעפיטן אין איין פלאץ.",
        "די כוח פון די קהילה."
    ]
};

interface DynamicSloganProps {
    locale: string;
    initialSlogan?: string;
}

export default function DynamicSlogan({ locale, initialSlogan }: DynamicSloganProps) {
    const list = slogans[locale] || slogans.he;
    const [index, setIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsVisible(false);
            setTimeout(() => {
                setIndex((prev) => (prev + 1) % list.length);
                setIsVisible(true);
            }, 600);
        }, 8000); // 8 seconds

        return () => clearInterval(interval);
    }, [list.length]);

    return (
        <span
            className={`text-[#f59e0b] inline-block transition-all duration-700 animate-breathing-stretch font-black ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
        >
            {list[index]}
        </span>
    );
}
