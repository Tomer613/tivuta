'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Gem, Car, ShieldCheck, BarChart3, CheckCircle2, Loader2, User } from 'lucide-react';
import Link from 'next/link';
import VerticalTile from '@/components/VerticalTile';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/context/AuthContext';
import { getSurveys, voteSurvey } from '@/lib/api';

interface HomeTranslation {
    greeting_male: string;
    greeting_female: string;
    greeting_neutral: string;
    subtitle: string;
    diamonds: string;
    diamonds_sub: string;
    cars: string;
    cars_sub: string;
    insurance: string;
    insurance_sub: string;
}

interface SurveyTranslation {
    survey_title: string;
    vote: string;
    voted: string;
    votes: string;
}

const surveyTranslations: Record<string, SurveyTranslation> = {
    he: { survey_title: 'סקר החודש', vote: 'הצבע', voted: 'הצבעת!', votes: 'קולות' },
    en: { survey_title: 'Poll of the Month', vote: 'Vote', voted: 'Voted!', votes: 'votes' },
    fr: { survey_title: 'Sondage du mois', vote: 'Voter', voted: 'Voté!', votes: 'votes' },
    yi: { survey_title: 'סורוועי פון חודש', vote: 'שטים', voted: 'גישטימט!', votes: 'קולות' },
};

const translations: Record<string, HomeTranslation> = {
    he: {
        greeting_male: 'ברוך הבא',
        greeting_female: 'ברוכה הבאה',
        greeting_neutral: 'ברוכים הבאים',
        subtitle: 'ברוכים הבאים לטיבותא — שלושת העולמות שלנו, מובחרים בשבילך.',
        diamonds: 'עולם היהלומים', diamonds_sub: 'תכשיטים ויהלומים נבחרים, עם פגישת התרשמות אישית.',
        cars: 'עולם הרכב', cars_sub: 'דילים ברכבים חדשים ומשומשים, בתנאים מיוחדים לחברים.',
        insurance: 'עולם הביטוחים', insurance_sub: 'ביטוחי רכב, בריאות ודירה במחירי מועדון.',
    },
    en: {
        greeting_male: 'Hello',
        greeting_female: 'Hello',
        greeting_neutral: 'Hello',
        subtitle: 'Welcome to Tivuta — our three worlds, curated for you.',
        diamonds: 'Diamonds World', diamonds_sub: 'Selected jewelry and diamonds, with a personal viewing appointment.',
        cars: 'Cars World', cars_sub: 'Deals on new and used cars, on special member terms.',
        insurance: 'Insurance World', insurance_sub: 'Car, health and home insurance at club prices.',
    },
    fr: {
        greeting_male: 'Bonjour',
        greeting_female: 'Bonjour',
        greeting_neutral: 'Bonjour',
        subtitle: 'Bienvenue chez Tivuta — nos trois univers, sélectionnés pour vous.',
        diamonds: 'Univers Diamants', diamonds_sub: 'Bijoux et diamants sélectionnés, avec rendez-vous personnel.',
        cars: 'Univers Automobile', cars_sub: "Offres sur voitures neuves et d'occasion, conditions spéciales membres.",
        insurance: 'Univers Assurance', insurance_sub: 'Assurance auto, santé et habitation à prix club.',
    },
    yi: {
        greeting_male: 'ברוך הבא',
        greeting_female: 'ברוכה הבאה',
        greeting_neutral: 'ברוכים הבאים',
        subtitle: 'ברוכים הבאים לטיבותא — אונדזערע דריי וועלטן, אויסגעקליבן פאר אייך.',
        diamonds: 'דימענט וועלט', diamonds_sub: 'אויסגעקליבענע שמוק און דימענטן, מיט א פערזענליכע באגעגעניש.',
        cars: 'אויטא וועלט', cars_sub: 'דילס אויף נייע און געניצטע אויטאס, מיט ספעציעלע טערמינען.',
        insurance: 'אינשורענס וועלט', insurance_sub: 'אויטא, געזונטהייט און היים אינשורענס אין קלוב פרייזן.',
    },
};

function SurveyWidget({ locale, token }: { locale: string; token: string }) {
    const st = surveyTranslations[locale] || surveyTranslations.he;
    const [survey, setSurvey] = useState<any | null>(null);
    const [voted, setVoted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState(false);

    useEffect(() => {
        getSurveys(token)
            .then((surveys: any[]) => {
                const active = surveys.find((s: any) => s.is_active);
                setSurvey(active || null);
            })
            .catch(() => setSurvey(null))
            .finally(() => setLoading(false));
    }, [token]);

    const handleVote = async (optionId: number) => {
        if (!survey || voting) return;
        setVoting(true);
        try {
            await voteSurvey(token, survey.id, optionId);
            setVoted(true);
            const updated = await getSurveys(token);
            const fresh = updated.find((s: any) => s.id === survey.id);
            if (fresh) setSurvey(fresh);
        } catch {
            setVoted(true);
        } finally {
            setVoting(false);
        }
    };

    if (loading || !survey) return null;

    const totalVotes = survey.options?.reduce((sum: number, o: any) => sum + (o.vote_count ?? 0), 0) || 0;
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

            <div className="space-y-3">
                {survey.options?.map((option: any) => {
                    const optTitle = option[`product_title_${localeKey}`] || option.product_title_he || `אפשרות ${option.id}`;
                    const votes = option.vote_count ?? 0;
                    const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

                    return voted ? (
                        <div key={option.id} className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                                <span className="text-[#f0e6d3]/80 font-semibold">{optTitle}</span>
                                <span className="text-[#d4af37] font-bold">{pct}%</span>
                            </div>
                            <div className="h-2 bg-[#111a2f] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-l from-[#d4af37] to-[#b8860b] rounded-full transition-all duration-700"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <p className="text-xs text-[#f0e6d3]/30">{votes} {st.votes}</p>
                        </div>
                    ) : (
                        <button
                            key={option.id}
                            onClick={() => handleVote(option.id)}
                            disabled={voting}
                            className="w-full text-start px-5 py-3 rounded-xl border border-[#d4af37]/20 text-[#f0e6d3]/80 font-semibold text-sm hover:border-[#d4af37]/50 hover:bg-[#111a2f] hover:text-[#f0e6d3] transition-all disabled:opacity-50"
                        >
                            {voting ? <Loader2 size={14} className="animate-spin inline mr-2" /> : null}
                            {optTitle}
                        </button>
                    );
                })}
            </div>

            {voted && (
                <div className="flex items-center gap-2 mt-4 text-green-400 text-sm font-bold">
                    <CheckCircle2 size={15} /> {st.voted} ({totalVotes} {st.votes})
                </div>
            )}
        </div>
    );
}

export default function HomePage() {
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const t = translations[locale] || translations.he;
    const { user, token } = useAuth();

    const greeting = user?.gender === 'male'
        ? t.greeting_male
        : user?.gender === 'female'
            ? t.greeting_female
            : t.greeting_neutral;

    return (
        <main className="min-h-screen bg-[#111a2f] py-20 px-6">
            <div className="max-w-5xl mx-auto">
                {/* Top bar */}
                <div className="flex items-center justify-end gap-3 mb-12 -mt-8">
                    {token && <NotificationBell token={token} />}
                    <Link href={`/${locale}/profile`} className="w-9 h-9 rounded-full bg-[#111a2f] border border-[#d4af37]/20 flex items-center justify-center hover:border-[#d4af37]/50 transition-colors">
                        <User size={17} className="text-[#f0e6d3]/70" />
                    </Link>
                </div>
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black text-[#f0e6d3] mb-4">
                        {greeting}{user?.first_name ? `, ${user.first_name}` : ''}
                    </h1>
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

                {token && <SurveyWidget locale={locale} token={token} />}
            </div>
        </main>
    );
}
