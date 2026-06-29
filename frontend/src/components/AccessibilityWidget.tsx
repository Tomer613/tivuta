'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    Accessibility, X, Type, Contrast, Eye, Underline, BookOpen, PauseCircle, RotateCcw,
} from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';

interface A11yTranslation {
    title: string;
    fontSize: string;
    contrast: string;
    grayscale: string;
    underline: string;
    readableFont: string;
    stopAnimations: string;
    reset: string;
    statement: string;
    normal: string;
    large: string;
    xlarge: string;
}

const translations: Record<string, A11yTranslation> = {
    he: {
        title: 'נגישות', fontSize: 'גודל גופן', contrast: 'ניגודיות גבוהה', grayscale: 'גווני אפור',
        underline: 'הדגשת קישורים', readableFont: 'גופן קריא', stopAnimations: 'עצירת אנימציות',
        reset: 'איפוס הגדרות', statement: 'הצהרת נגישות', normal: 'רגיל', large: 'גדול', xlarge: 'גדול מאוד',
    },
    en: {
        title: 'Accessibility', fontSize: 'Font Size', contrast: 'High Contrast', grayscale: 'Grayscale',
        underline: 'Underline Links', readableFont: 'Readable Font', stopAnimations: 'Stop Animations',
        reset: 'Reset', statement: 'Accessibility Statement', normal: 'Normal', large: 'Large', xlarge: 'Extra Large',
    },
    fr: {
        title: 'Accessibilité', fontSize: 'Taille du texte', contrast: 'Contraste élevé', grayscale: 'Niveaux de gris',
        underline: 'Souligner les liens', readableFont: 'Police lisible', stopAnimations: 'Arrêter les animations',
        reset: 'Réinitialiser', statement: "Déclaration d'accessibilité", normal: 'Normal', large: 'Grand', xlarge: 'Très grand',
    },
    yi: {
        title: 'אַקסעסיביליטי', fontSize: 'שריפט גרייס', contrast: 'הויכע קאנטראסט', grayscale: 'גרוי טענער',
        underline: 'אונדערשטרייכן לינקס', readableFont: 'לייענבארער שריפט', stopAnimations: 'אפשטעלן אנימאציעס',
        reset: 'צוריקשטעלן', statement: 'נגישות דערקלערונג', normal: 'נארמאל', large: 'גרויס', xlarge: 'זייער גרויס',
    },
};

function ToggleRow({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            aria-pressed={active}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${active ? 'bg-[#d4af37] text-[#080d1f]' : 'bg-[#111a2f] text-[#f0e6d3] hover:bg-[#111a2f]/70'}`}
        >
            <span className="flex items-center gap-3">{icon}{label}</span>
            <span className={`w-5 h-5 rounded-full border-2 ${active ? 'bg-[#080d1f] border-[#080d1f]' : 'border-[#f0e6d3]/40'}`} />
        </button>
    );
}

export default function AccessibilityWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const { prefs, setFontSize, toggle, reset } = useAccessibility();
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const t = translations[locale] || translations.he;

    return (
        <div className="fixed bottom-6 start-6 z-[200]">
            {isOpen && (
                <div
                    role="dialog"
                    aria-label={t.title}
                    className="absolute bottom-16 start-0 w-80 bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl shadow-2xl p-5 flex flex-col gap-3 max-h-[70vh] overflow-y-auto"
                >
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-black text-[#f0e6d3]">{t.title}</h2>
                        <button onClick={() => setIsOpen(false)} aria-label="close" className="text-[#f0e6d3]/60 hover:text-[#f0e6d3]">
                            <X size={20} />
                        </button>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-[#f0e6d3]/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Type size={14} /> {t.fontSize}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {(['normal', 'large', 'xlarge'] as const).map((size) => (
                                <button
                                    key={size}
                                    onClick={() => setFontSize(size)}
                                    aria-pressed={prefs.fontSize === size}
                                    className={`py-2 rounded-xl text-xs font-bold ${prefs.fontSize === size ? 'bg-[#d4af37] text-[#080d1f]' : 'bg-[#111a2f] text-[#f0e6d3]'}`}
                                >
                                    {t[size]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <ToggleRow icon={<Contrast size={16} />} label={t.contrast} active={prefs.highContrast} onClick={() => toggle('highContrast')} />
                    <ToggleRow icon={<Eye size={16} />} label={t.grayscale} active={prefs.grayscale} onClick={() => toggle('grayscale')} />
                    <ToggleRow icon={<Underline size={16} />} label={t.underline} active={prefs.underlineLinks} onClick={() => toggle('underlineLinks')} />
                    <ToggleRow icon={<BookOpen size={16} />} label={t.readableFont} active={prefs.readableFont} onClick={() => toggle('readableFont')} />
                    <ToggleRow icon={<PauseCircle size={16} />} label={t.stopAnimations} active={prefs.stopAnimations} onClick={() => toggle('stopAnimations')} />

                    <button onClick={reset} className="flex items-center justify-center gap-2 mt-2 text-sm font-bold text-[#f0e6d3]/60 hover:text-[#f0e6d3] py-2">
                        <RotateCcw size={16} /> {t.reset}
                    </button>

                    <Link href={`/${locale}/accessibility-statement`} className="text-center text-xs font-bold text-[#d4af37] hover:underline pt-2 border-t border-[#d4af37]/20">
                        {t.statement}
                    </Link>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label={t.title}
                aria-expanded={isOpen}
                className="w-14 h-14 rounded-full bg-[#d4af37] text-[#080d1f] shadow-2xl flex items-center justify-center hover:bg-[#f5d061] transition-all hover:scale-105 active:scale-95"
            >
                <Accessibility size={28} />
            </button>
        </div>
    );
}
