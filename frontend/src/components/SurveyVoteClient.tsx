'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, CheckCircle2, Vote } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getSurvey, voteSurvey } from '@/lib/api';

interface T {
    title: string;
    voted: string;
    error_voted: string;
}

interface SurveyOption {
    id: number;
    product_id: number;
    label_override_he?: string | null;
    product_title_he?: string | null;
    vote_count: number;
}

interface Survey {
    id: number;
    question_he: string;
    question_en?: string | null;
    question_fr?: string | null;
    question_yi?: string | null;
    options: SurveyOption[];
}

const translations: Record<string, T> = {
    he: { title: 'סקר', voted: 'תודה על הצבעתך!', error_voted: 'כבר הצבעת בסקר זה' },
    en: { title: 'Survey', voted: 'Thanks for voting!', error_voted: 'You already voted in this survey' },
    fr: { title: 'Sondage', voted: 'Merci pour votre vote !', error_voted: 'Vous avez déjà voté' },
    yi: { title: 'סורווי', voted: 'דאנק פאר אייער שטים!', error_voted: 'איר האט שוין געשטימט' },
};

export default function SurveyVoteClient({ surveyId }: { surveyId: number }) {
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const { token, isLoading: authLoading } = useAuth();
    const t = translations[locale] || translations.he;

    const [survey, setSurvey] = useState<Survey | null>(null);
    const [loading, setLoading] = useState(true);
    const [voted, setVoted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getSurvey(token, surveyId).then(setSurvey).finally(() => setLoading(false));
    }, [token, surveyId]);

    const handleVote = async (optionId: number) => {
        if (!token) return;
        try {
            await voteSurvey(token, surveyId, optionId);
            setVoted(true);
            const fresh = await getSurvey(token, surveyId);
            setSurvey(fresh);
        } catch {
            setError(t.error_voted);
        }
    };

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
    const totalVotes = survey.options.reduce((sum, o) => sum + o.vote_count, 0) || 1;

    return (
        <main className="min-h-screen bg-[#111a2f] py-20 px-6">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <Vote className="text-[#d4af37]" size={28} />
                    <h1 className="text-3xl font-black text-[#f0e6d3]">{t.title}</h1>
                </div>

                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-3xl p-8">
                    <h2 className="text-2xl font-bold text-[#f0e6d3] mb-8">{question}</h2>

                    {error && <p className="text-red-400 font-bold mb-4">{error}</p>}
                    {voted && <p className="text-green-400 font-bold mb-4 flex items-center gap-2"><CheckCircle2 size={18} />{t.voted}</p>}

                    <div className="flex flex-col gap-4">
                        {survey.options.map((opt) => {
                            const pct = Math.round((opt.vote_count / totalVotes) * 100);
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => handleVote(opt.id)}
                                    disabled={voted}
                                    className="relative text-start bg-[#111a2f] border border-[#d4af37]/20 rounded-2xl p-5 overflow-hidden hover:border-[#d4af37] transition-all disabled:cursor-default"
                                >
                                    <div
                                        className="absolute inset-y-0 start-0 bg-[#d4af37]/15 transition-all"
                                        style={{ width: `${pct}%` }}
                                    />
                                    <div className="relative flex justify-between items-center">
                                        <span className="font-bold text-[#f0e6d3]">{opt.label_override_he || opt.product_title_he || `מוצר ${opt.product_id}`}</span>
                                        <span className="font-black text-[#d4af37]">{pct}%</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </main>
    );
}
