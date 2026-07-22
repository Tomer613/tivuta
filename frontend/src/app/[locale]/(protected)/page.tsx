'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import VerticalTile from '@/components/VerticalTile';
import { useAuth } from '@/context/AuthContext';
import { getSurveys, getVerticals, Vertical } from '@/lib/api';
import { getVerticalIcon } from '@/lib/verticalIcons';
import SurveyCard, { Survey } from '@/components/SurveyCard';

interface HomeTranslation {
    greeting_male: string;
    greeting_female: string;
    greeting_neutral: string;
    subtitle: string;
}

interface SurveyTranslation {
    survey_title: string;
}

const surveyTranslations: Record<string, SurveyTranslation> = {
    he: { survey_title: 'סקר החודש' },
    en: { survey_title: 'Poll of the Month' },
    fr: { survey_title: 'Sondage du mois' },
    yi: { survey_title: 'סורוועי פון חודש' },
};

const translations: Record<string, HomeTranslation> = {
    he: {
        greeting_male: 'ברוך הבא',
        greeting_female: 'ברוכה הבאה',
        greeting_neutral: 'ברוכים הבאים',
        subtitle: 'ברוכים הבאים לטיבותא — העולמות שלנו, מובחרים בשבילך.',
    },
    en: {
        greeting_male: 'Hello',
        greeting_female: 'Hello',
        greeting_neutral: 'Hello',
        subtitle: 'Welcome to Tivuta — our worlds, curated for you.',
    },
    fr: {
        greeting_male: 'Bonjour',
        greeting_female: 'Bonjour',
        greeting_neutral: 'Bonjour',
        subtitle: 'Bienvenue chez Tivuta — nos univers, sélectionnés pour vous.',
    },
    yi: {
        greeting_male: 'ברוך הבא',
        greeting_female: 'ברוכה הבאה',
        greeting_neutral: 'ברוכים הבאים',
        subtitle: 'ברוכים הבאים לטיבותא — אונדזערע וועלטן, אויסגעקליבן פאר אייך.',
    },
};

function SurveyWidget({ locale, token }: { locale: string; token: string }) {
    const st = surveyTranslations[locale] || surveyTranslations.he;
    const [survey, setSurvey] = useState<Survey | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSurveys(token)
            .then((surveys: Survey[]) => {
                const active = surveys.find((s) => s.is_active);
                setSurvey(active || null);
            })
            .catch(() => setSurvey(null))
            .finally(() => setLoading(false));
    }, [token]);

    if (loading || !survey) return null;

    const localeKey = locale as 'he' | 'en' | 'fr' | 'yi';
    const question = survey[`question_${localeKey}`] || survey.question_he || '';

    return (
        <div className="mt-12 bg-[#0e1628] border border-[#d4af37]/20 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-[#d4af37]/15 rounded-xl flex items-center justify-center">
                    <BarChart3 size={18} className="text-[#d4af37]" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-[#d4af37]/60 uppercase tracking-widest">{st.survey_title}</p>
                    <p className="text-[#f0e6d3] font-bold text-lg leading-snug">{question}</p>
                </div>
            </div>

            <SurveyCard survey={survey} token={token} locale={locale} onVoted={setSurvey} />
        </div>
    );
}

export default function HomePage() {
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const localeKey = locale as 'he' | 'en' | 'fr' | 'yi';
    const t = translations[locale] || translations.he;
    const { user, token } = useAuth();
    const [verticals, setVerticals] = useState<Vertical[]>([]);

    useEffect(() => {
        getVerticals().then(setVerticals);
    }, []);

    const greeting = user?.gender === 'male'
        ? t.greeting_male
        : user?.gender === 'female'
            ? t.greeting_female
            : t.greeting_neutral;

    return (
        <main className="min-h-screen bg-[#111a2f] py-20 px-6">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black text-[#f0e6d3] mb-4">
                        {greeting}{user?.first_name ? `, ${user.first_name}` : ''}
                    </h1>
                    <p className="text-xl text-[#f0e6d3]/60 font-light">{t.subtitle}</p>
                </div>

                <div className="flex flex-col gap-8">
                    {verticals.map((v) => {
                        const Icon = getVerticalIcon(v.icon);
                        const title = v[`label_${localeKey}`] || v.label_he;
                        const subtitle = v[`subtitle_${localeKey}`] || v.subtitle_he || '';
                        return (
                            <VerticalTile
                                key={v.slug}
                                href={`/${locale}/${v.slug}`}
                                title={title}
                                subtitle={subtitle}
                                icon={<Icon size={40} />}
                                locale={locale}
                            />
                        );
                    })}
                </div>

                {token && <SurveyWidget locale={locale} token={token} />}
            </div>
        </main>
    );
}
