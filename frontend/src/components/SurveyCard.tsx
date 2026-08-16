'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Check, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { voteSurvey } from '@/lib/api';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { requireLogin } from '@/lib/requireLogin';

export interface SurveyOption {
    id: number;
    product_id: number | null;
    label_override_he?: string | null;
    product_title_he?: string | null;
    vote_count: number;
}

export interface Survey {
    id: number;
    question_he: string;
    question_en?: string | null;
    question_fr?: string | null;
    question_yi?: string | null;
    is_active: boolean;
    max_choices: number;
    poll_type: string;
    image_url?: string | null;
    has_voted: boolean;
    my_option_ids: number[];
    options: SurveyOption[];
}

interface T {
    vote: string;
    voted: string;
    showChoice: string;
    hideChoice: string;
    votes: string;
    selectUpTo: (n: number) => string;
    error: string;
    thanks: string;
}

const translations: Record<string, T> = {
    he: {
        vote: 'הצבע',
        voted: 'הצבעת!',
        showChoice: 'הצג את הבחירה שלי',
        hideChoice: 'הסתר',
        votes: 'קולות',
        selectUpTo: (n) => `בחר עד ${n} אפשרויות`,
        error: 'שגיאה בהצבעה, נסה שוב',
        thanks: 'תודה שהצבעת!',
    },
    en: {
        vote: 'Vote',
        voted: 'Voted!',
        showChoice: 'Show my choice',
        hideChoice: 'Hide',
        votes: 'votes',
        selectUpTo: (n) => `Select up to ${n} options`,
        error: 'Something went wrong, try again',
        thanks: 'Thanks for voting!',
    },
    fr: {
        vote: 'Voter',
        voted: 'Voté!',
        showChoice: 'Afficher mon choix',
        hideChoice: 'Masquer',
        votes: 'votes',
        selectUpTo: (n) => `Choisissez jusqu'à ${n} options`,
        error: 'Une erreur est survenue, réessayez',
        thanks: 'Merci pour votre vote !',
    },
    yi: {
        vote: 'שטים',
        voted: 'גישטימט!',
        showChoice: 'ווייז מיין בחירה',
        hideChoice: 'באהאלט',
        votes: 'קולות',
        selectUpTo: (n) => `קלייב ביז ${n} אפשרויות`,
        error: 'א טעות, פרובירט נאך אמאל',
        thanks: 'א דאנק פארן שטימען!',
    },
};

export default function SurveyCard({
    survey,
    token,
    locale,
    onVoted,
}: {
    survey: Survey;
    token: string | null;
    locale: string;
    onVoted: (updated: Survey) => void;
}) {
    const st = translations[locale] || translations.he;
    const localeKey = locale as 'he' | 'en' | 'fr' | 'yi';
    const router = useRouter();
    const [expanded, setExpanded] = useState(false);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [justVoted, setJustVoted] = useState(false);
    const autoSubmitRef = useRef(false);

    const pendingKey = `tivuta_pending_vote_${survey.id}`;
    const RESUME_PARAM = 'resume_vote';

    // A visitor can pick an option while logged out (see submitVote); once they log in and land
    // back here, auto-submit whatever they'd already chosen instead of making them pick again.
    //
    // Critically, this ONLY fires when the URL carries the one-time `resume_vote=1` marker that
    // submitVote() itself appends to the login redirect target below - never merely because a
    // token happens to be present. A token-only check is not enough to prove "the person who just
    // logged in in this tab is the same person who picked this option": sessionStorage is scoped
    // to the tab, not to a login session, so on a shared/family computer someone else logging into
    // their own unrelated account in that same still-open tab (no logout by the original visitor
    // required at all) would otherwise silently inherit and auto-cast the earlier pick as their
    // own vote. The marker is stripped from the URL right after this effect resolves so a reload
    // or a copied/shared link can never be mistaken for a fresh resume.
    useEffect(() => {
        if (!token || survey.has_voted || autoSubmitRef.current) return;
        if (new URLSearchParams(window.location.search).get(RESUME_PARAM) !== '1') return;

        let pending: unknown;
        try {
            const raw = sessionStorage.getItem(pendingKey);
            if (!raw) return;
            pending = JSON.parse(raw);
        } catch {
            return;
        }
        if (!Array.isArray(pending) || pending.length === 0) return;
        autoSubmitRef.current = true;
        const optionIds = pending as number[];

        const stripResumeMarker = () => {
            const params = new URLSearchParams(window.location.search);
            params.delete(RESUME_PARAM);
            const qs = params.toString();
            router.replace(`${window.location.pathname}${qs ? `?${qs}` : ''}`);
        };

        (async () => {
            try {
                const updated = await voteSurvey(token, survey.id, optionIds);
                onVoted(updated);
                setJustVoted(true);
            } catch {
                // The pending vote couldn't be applied (e.g. the poll changed in the meantime) -
                // drop it silently; the visitor can just vote again normally.
            } finally {
                try { sessionStorage.removeItem(pendingKey); } catch { /* ignore */ }
                stripResumeMarker();
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, survey.has_voted, survey.id]);

    const totalVotes = survey.options.reduce((sum, o) => sum + (o.vote_count ?? 0), 0);

    const optionTitle = (option: SurveyOption) =>
        (option as unknown as Record<string, unknown>)[`product_title_${localeKey}`] as string
        || option.product_title_he
        || option.label_override_he
        || `#${option.id}`;

    const toggleOption = (id: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else if (next.size < survey.max_choices) {
                next.add(id);
            }
            return next;
        });
    };

    const openVoting = () => {
        setError(null);
        setSelected(new Set());
        setExpanded(true);
    };

    const submitVote = async () => {
        if (selected.size === 0 || submitting) return;

        if (!token) {
            try {
                sessionStorage.setItem(pendingKey, JSON.stringify(Array.from(selected)));
            } catch { /* ignore - worst case the visitor just has to pick again after login */ }
            const params = new URLSearchParams(window.location.search);
            params.set(RESUME_PARAM, '1');
            requireLogin(token, router, locale, `${window.location.pathname}?${params.toString()}`);
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const updated = await voteSurvey(token, survey.id, Array.from(selected));
            onVoted(updated);
            setExpanded(false);
            setJustVoted(true);
        } catch (e) {
            setError(getErrorMessage(e, st.error));
        } finally {
            setSubmitting(false);
        }
    };

    if (survey.has_voted) {
        return (
            <div>
                {justVoted && (
                    <p className="mb-3 text-[#d4af37] text-sm font-bold animate-fade-in">🎉 {st.thanks}</p>
                )}
                <div className="flex items-center gap-2 mt-1 text-green-400 text-sm font-bold">
                    <CheckCircle2 size={15} /> {st.voted} ({totalVotes} {st.votes})
                </div>
                <button
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-3 text-sm font-bold text-[#d4af37] hover:text-[#f0e6d3] transition-colors flex items-center gap-1"
                >
                    {expanded ? st.hideChoice : st.showChoice}
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {expanded && (
                    <div className="space-y-3 mt-4">
                        {survey.options.map((option) => {
                            const votes = option.vote_count ?? 0;
                            const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                            const isMine = survey.my_option_ids.includes(option.id);
                            return (
                                <div key={option.id} className="space-y-1.5">
                                    <div className="flex justify-between text-sm">
                                        <span className={`font-semibold flex items-center gap-1.5 ${isMine ? 'text-[#d4af37]' : 'text-[#f0e6d3]/80'}`}>
                                            {isMine && <Check size={14} />}
                                            {optionTitle(option)}
                                        </span>
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
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    if (!expanded) {
        return (
            <div className="mt-1">
                <button onClick={openVoting} className="btn-primary !text-sm px-6 py-2.5">
                    {st.vote}
                </button>
            </div>
        );
    }

    return (
        <div className="mt-1">
            <p className="text-xs text-[#f0e6d3]/50 mb-3">{st.selectUpTo(survey.max_choices)} · {selected.size}/{survey.max_choices}</p>
            <div className="space-y-3">
                {survey.options.map((option) => {
                    const isSelected = selected.has(option.id);
                    const isDisabled = !isSelected && selected.size >= survey.max_choices;
                    return (
                        <button
                            key={option.id}
                            onClick={() => toggleOption(option.id)}
                            disabled={isDisabled}
                            className={`w-full text-start px-5 py-3 rounded-xl border font-semibold text-sm transition-all flex items-center justify-between gap-3 disabled:opacity-40 ${
                                isSelected
                                    ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#f0e6d3]'
                                    : 'border-[#d4af37]/20 text-[#f0e6d3]/80 hover:border-[#d4af37]/50 hover:bg-[#111a2f] hover:text-[#f0e6d3]'
                            }`}
                        >
                            {optionTitle(option)}
                            {isSelected && <Check size={16} className="text-[#d4af37] flex-shrink-0" />}
                        </button>
                    );
                })}
            </div>

            {error && <p className="text-red-400 text-sm font-bold mt-3">{error}</p>}

            <button
                onClick={submitVote}
                disabled={selected.size === 0 || submitting}
                className="btn-primary !text-sm px-6 py-2.5 mt-4 disabled:opacity-50 flex items-center gap-2"
            >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {st.vote}
            </button>
        </div>
    );
}
