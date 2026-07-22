'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Vote } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getSurvey } from '@/lib/api';
import SurveyCard, { Survey } from '@/components/SurveyCard';

interface T {
    title: string;
}

const translations: Record<string, T> = {
    he: { title: 'סקר' },
    en: { title: 'Survey' },
    fr: { title: 'Sondage' },
    yi: { title: 'סורווי' },
};

export default function SurveyVoteClient({ surveyId }: { surveyId: number }) {
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const { token, isLoading: authLoading } = useAuth();
    const t = translations[locale] || translations.he;

    const [survey, setSurvey] = useState<Survey | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSurvey(token, surveyId).then(setSurvey).finally(() => setLoading(false));
    }, [token, surveyId]);

    if (authLoading || loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#d4af37]" size={36} />
            </div>
        );
    }

    if (!survey) return null;

    const localeKey = locale as 'he' | 'en' | 'fr' | 'yi';
    const question = survey[`question_${localeKey}`] || survey.question_he;

    return (
        <main className="min-h-screen bg-[#111a2f] py-20 px-6">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <Vote className="text-[#d4af37]" size={28} />
                    <h1 className="text-3xl font-black text-[#f0e6d3]">{t.title}</h1>
                </div>

                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-3xl p-8">
                    <h2 className="text-2xl font-bold text-[#f0e6d3] mb-8">{question}</h2>

                    {token && <SurveyCard survey={survey} token={token} locale={locale} onVoted={setSurvey} />}
                </div>
            </div>
        </main>
    );
}
