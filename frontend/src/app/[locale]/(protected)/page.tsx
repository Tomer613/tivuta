'use client';

import { useParams } from 'next/navigation';
import { Gem, Car, ShieldCheck } from 'lucide-react';
import VerticalTile from '@/components/VerticalTile';

interface HomeTranslation {
    title: string;
    subtitle: string;
    diamonds: string;
    diamonds_sub: string;
    cars: string;
    cars_sub: string;
    insurance: string;
    insurance_sub: string;
}

const translations: Record<string, HomeTranslation> = {
    he: {
        title: 'ברוכים הבאים ל-TIVUTA',
        subtitle: 'שלושת העולמות שלנו, מובחרים בשבילך.',
        diamonds: 'עולם היהלומים', diamonds_sub: 'תכשיטים ויהלומים נבחרים, עם פגישת התרשמות אישית.',
        cars: 'עולם הרכב', cars_sub: 'דילים ברכבים חדשים ומשומשים, בתנאים מיוחדים לחברים.',
        insurance: 'עולם הביטוחים', insurance_sub: 'ביטוחי רכב, בריאות ודירה במחירי מועדון.',
    },
    en: {
        title: 'Welcome to TIVUTA',
        subtitle: 'Our three worlds, curated for you.',
        diamonds: 'Diamonds World', diamonds_sub: 'Selected jewelry and diamonds, with a personal viewing appointment.',
        cars: 'Cars World', cars_sub: 'Deals on new and used cars, on special member terms.',
        insurance: 'Insurance World', insurance_sub: 'Car, health and home insurance at club prices.',
    },
    fr: {
        title: 'Bienvenue chez TIVUTA',
        subtitle: 'Nos trois univers, sélectionnés pour vous.',
        diamonds: 'Univers Diamants', diamonds_sub: 'Bijoux et diamants sélectionnés, avec rendez-vous personnel.',
        cars: 'Univers Automobile', cars_sub: "Offres sur voitures neuves et d'occasion, conditions spéciales membres.",
        insurance: 'Univers Assurance', insurance_sub: 'Assurance auto, santé et habitation à prix club.',
    },
    yi: {
        title: 'ברוכים הבאים TIVUTA',
        subtitle: 'אונדזערע דריי וועלטן, אויסגעקליבן פאר אייך.',
        diamonds: 'דימענט וועלט', diamonds_sub: 'אויסגעקליבענע שמוק און דימענטן, מיט א פערזענליכע באגעגעניש.',
        cars: 'אויטא וועלט', cars_sub: 'דילס אויף נייע און געניצטע אויטאס, מיט ספעציעלע טערמינען.',
        insurance: 'אינשורענס וועלט', insurance_sub: 'אויטא, געזונטהייט און היים אינשורענס אין קלוב פרייזן.',
    },
};

export default function HomePage() {
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const t = translations[locale] || translations.he;

    return (
        <main className="min-h-screen bg-[#111a2f] py-20 px-6">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black text-[#f0e6d3] mb-4">{t.title}</h1>
                    <p className="text-xl text-[#f0e6d3]/60 font-light">{t.subtitle}</p>
                </div>

                <div className="flex flex-col gap-8">
                    <VerticalTile
                        href={`/${locale}/diamonds`}
                        title={t.diamonds}
                        subtitle={t.diamonds_sub}
                        icon={<Gem size={40} />}
                        locale={locale}
                    />
                    <VerticalTile
                        href={`/${locale}/cars`}
                        title={t.cars}
                        subtitle={t.cars_sub}
                        icon={<Car size={40} />}
                        locale={locale}
                    />
                    <VerticalTile
                        href={`/${locale}/insurance`}
                        title={t.insurance}
                        subtitle={t.insurance_sub}
                        icon={<ShieldCheck size={40} />}
                        locale={locale}
                    />
                </div>
            </div>
        </main>
    );
}
