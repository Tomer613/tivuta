'use client';

import { useParams } from 'next/navigation';

interface T {
    title: string;
    intro: string;
    standard: string;
    features_title: string;
    features: string[];
    contact_title: string;
    contact_desc: string;
}

const translations: Record<string, T> = {
    he: {
        title: 'הצהרת נגישות',
        intro: 'אנו ב-TIVUTA פועלים להנגיש את האתר לכלל המשתמשים, כולל אנשים עם מוגבלות, בהתאם לתקן הישראלי (ת"י) 5568 לנגישות תכנים באינטרנט, ברמת AA, ובהתאם לחוק שוויון זכויות לאנשים עם מוגבלות התשנ"ח-1998 ותקנותיו.',
        standard: 'האתר נבדק ומותאם באופן שוטף, ומכיל תפריט נגישות בעזרתו ניתן להתאים את התצוגה לצרכים שונים.',
        features_title: 'תפריט הנגישות מאפשר:',
        features: ['הגדלה/הקטנה של גודל הגופן', 'מצב ניגודיות גבוהה', 'מצב גווני אפור', 'הדגשת קישורים בקו תחתי', 'מעבר לגופן קריא יותר', 'עצירת אנימציות בתנועה'],
        contact_title: 'פנייה בנושאי נגישות',
        contact_desc: 'נתקלת בבעיית נגישות באתר? נשמח שתפנה/י אלינו לכתובת support@tivuta.co.il ונפעל לתקן את הבעיה בהקדם.',
    },
    en: {
        title: 'Accessibility Statement',
        intro: 'TIVUTA is committed to making this site accessible to all users, including people with disabilities, in accordance with Israeli Standard 5568 (WCAG 2.0 AA) and the Equal Rights for Persons with Disabilities Law.',
        standard: 'The site is regularly reviewed and adapted, and includes an accessibility menu that lets you adjust the display to your needs.',
        features_title: 'The accessibility menu allows you to:',
        features: ['Increase/decrease font size', 'High contrast mode', 'Grayscale mode', 'Underline links', 'Switch to a more readable font', 'Stop animations'],
        contact_title: 'Accessibility feedback',
        contact_desc: 'Encountered an accessibility issue? Please contact us at support@tivuta.co.il and we will address it promptly.',
    },
    fr: {
        title: "Déclaration d'accessibilité",
        intro: "TIVUTA s'engage à rendre ce site accessible à tous les utilisateurs, conformément à la norme israélienne 5568 (WCAG 2.0 AA).",
        standard: "Le site est régulièrement revu et inclut un menu d'accessibilité permettant d'adapter l'affichage à vos besoins.",
        features_title: "Le menu d'accessibilité permet de :",
        features: ['Augmenter/diminuer la taille du texte', 'Mode contraste élevé', 'Mode niveaux de gris', 'Souligner les liens', 'Police plus lisible', 'Arrêter les animations'],
        contact_title: "Retour sur l'accessibilité",
        contact_desc: 'Vous avez rencontré un problème ? Contactez-nous à support@tivuta.co.il.',
    },
    yi: {
        title: 'נגישות דערקלערונג',
        intro: 'TIVUTA איז פארפליכט צו מאכן דעם זייט אקסעסיבל פאר אלע יוזערס, לויט ישראלישע סטאנדארד 5568.',
        standard: 'דער זייט ווערט רעגולער געטשעקט און האט א נגישות מעניו.',
        features_title: 'דער מעניו לאזט אייך:',
        features: ['פארגרעסערן/פארקלענערן שריפט', 'הויכע קאנטראסט מאדע', 'גרוי טענער מאדע', 'אונדערשטרייכן לינקס', 'בעסערע לייענבארע שריפט', 'אפשטעלן אנימאציעס'],
        contact_title: 'נגישות פידבעק',
        contact_desc: 'האט איר א פראבלעם? שריבט אונז: support@tivuta.co.il.',
    },
};

export default function AccessibilityStatementPage() {
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const t = translations[locale] || translations.he;

    return (
        <main className="min-h-screen bg-[#111a2f] py-24 px-8">
            <div className="max-w-3xl mx-auto text-start">
                <h1 className="text-4xl font-black text-[#f0e6d3] mb-8">{t.title}</h1>
                <p className="text-[#f0e6d3]/80 text-lg leading-relaxed mb-6">{t.intro}</p>
                <p className="text-[#f0e6d3]/80 text-lg leading-relaxed mb-10">{t.standard}</p>

                <h2 className="text-2xl font-bold text-[#d4af37] mb-4">{t.features_title}</h2>
                <ul className="space-y-2 mb-12">
                    {t.features.map((f, i) => (
                        <li key={i} className="text-[#f0e6d3]/80 flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
                            {f}
                        </li>
                    ))}
                </ul>

                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-3xl p-8">
                    <h2 className="text-xl font-bold text-[#f0e6d3] mb-3">{t.contact_title}</h2>
                    <p className="text-[#f0e6d3]/70">{t.contact_desc}</p>
                </div>
            </div>
        </main>
    );
}
