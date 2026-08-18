'use client';

import { useEffect, useState } from 'react';
import { LogIn, Loader2, ShieldCheck, Eye, EyeOff, Gem, Gift, Percent } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { BASE_URL } from '@/lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import LockoutCountdown from '@/components/LockoutCountdown';

type ValuePropIcon = 'gem' | 'gift' | 'percent';

const VALUE_PROP_ICONS: Record<ValuePropIcon, typeof Gem> = {
    gem: Gem,
    gift: Gift,
    percent: Percent,
};

interface LoginTranslation {
    title: string;
    subtitle: string;
    formTitle: string;
    taglines: string[];
    valueProps: { icon: ValuePropIcon; text: string }[];
    email: string;
    password: string;
    submit: string;
    forgot: string;
    no_account: string;
    secure: string;
    error_invalid: string;
    slow_connect: string;
}

const translations: Record<string, LoginTranslation> = {
    he: {
        title: 'ברוכים הבאים ל-TIVUTA',
        subtitle: 'המחירים המיוחדים של טיבותא — לחברים בלבד',
        formTitle: 'התחברות לחשבון',
        taglines: [
            '🎉 עולם שלם של הטבות מחכה לכם!',
            '💎 יהלומים, רכב, ביטוח – והכי חשוב: אתם',
            '✨ מצטרפים? מתחילים לחסוך מהיום הראשון',
            '🛍️ המועדון הכי שווה בעיר מחכה לכם',
            '🎁 הטבות בלעדיות, רק לחברי טיבותא',
        ],
        valueProps: [
            { icon: 'gem', text: 'יהלומים, רכב, ביטוח ועוד עולמות בלעדיים' },
            { icon: 'gift', text: 'מועדון הטבות עשיר לחברים' },
            { icon: 'percent', text: 'מחירים מיוחדים שלא תמצאו בשום מקום אחר' },
        ],
        email: 'כתובת אימייל',
        password: 'סיסמה',
        submit: 'התחבר למערכת',
        forgot: 'שכחתי סיסמה',
        no_account: 'עדיין אין לך חשבון? הצטרף עכשיו',
        secure: 'התחברות מאובטחת',
        error_invalid: 'אימייל או סיסמה שגויים',
        slow_connect: 'מתחברים לשרת... בכניסה הראשונה לאחר זמן מה זה יכול לקחת עד דקה',
    },
    en: {
        title: 'Welcome to TIVUTA',
        subtitle: "Tivuta's exclusive prices — members only",
        formTitle: 'Sign in to your account',
        taglines: [
            '🎉 A whole world of perks is waiting for you!',
            '💎 Diamonds, cars, insurance – and most importantly: you',
            '✨ Joining? Start saving from day one',
            '🛍️ The best club in town is waiting for you',
            '🎁 Exclusive deals, only for Tivuta members',
        ],
        valueProps: [
            { icon: 'gem', text: 'Diamonds, cars, insurance & more exclusive worlds' },
            { icon: 'gift', text: 'A rich benefits club for members' },
            { icon: 'percent', text: "Special prices you won't find anywhere else" },
        ],
        email: 'Email Address',
        password: 'Password',
        submit: 'Login',
        forgot: 'Forgot Password?',
        no_account: "Don't have an account? Join now",
        secure: 'Secure Login',
        error_invalid: 'Invalid email or password',
        slow_connect: 'Connecting... this can take up to a minute on the first visit in a while',
    },
    fr: {
        title: 'Bienvenue chez TIVUTA',
        subtitle: 'Les prix exclusifs de Tivuta — réservés aux membres',
        formTitle: 'Connexion à votre compte',
        taglines: [
            '🎉 Tout un monde d’avantages vous attend !',
            '💎 Diamants, voitures, assurances – et surtout : vous',
            '✨ Vous nous rejoignez ? Économisez dès le premier jour',
            '🛍️ Le club le plus avantageux vous attend',
            '🎁 Offres exclusives, réservées aux membres Tivuta',
        ],
        valueProps: [
            { icon: 'gem', text: 'Diamants, voitures, assurances et autres univers exclusifs' },
            { icon: 'gift', text: 'Un club d’avantages riche pour les membres' },
            { icon: 'percent', text: 'Des prix spéciaux introuvables ailleurs' },
        ],
        email: 'E-mail',
        password: 'Mot de passe',
        submit: 'Connexion',
        forgot: 'Mot de passe oublié ?',
        no_account: "Pas de compte ? S'inscrire",
        secure: 'Connexion sécurisée',
        error_invalid: 'Identifiants invalides',
        slow_connect: 'Connexion en cours... cela peut prendre jusqu’à une minute lors de la première visite',
    },
    yi: {
        title: 'ברוכים הבאים TIVUTA',
        subtitle: 'די ספעציעלע פרייזן פון טיבותא — נאר פאר מיטגלידער',
        formTitle: 'אריינלאגן אין קאנטע',
        taglines: [
            '🎉 א גאנצע וועלט פון הנחות ווארט אויף אייך!',
            '💎 יהלומים, קארס, ביטוח – און דער עיקר: איר',
            '✨ שליסט זיך אן? הייבט אן שפארן פון טאג איינס',
            '🛍️ דער בעסטער מועדון אין שטאט ווארט אויף אייך',
            '🎁 עקסקלוזיווע הנחות, נאר פאר טיבותא מיטגלידער',
        ],
        valueProps: [
            { icon: 'gem', text: 'יהלומים, קארס, ביטוח און נאך עקסקלוזיווע וועלטן' },
            { icon: 'gift', text: 'א רייכער מועדון הטבות פאר מיטגלידער' },
            { icon: 'percent', text: 'ספעציעלע פרייזן וואס איר וועט נישט געפינען ערגעץ אנדערש' },
        ],
        email: 'ע-פאסט',
        password: 'סיסמה',
        submit: 'אריינלאגן',
        forgot: 'פארגעסן סיסמה?',
        no_account: 'נישטא קיין קאנטע? שליסן זיך אן יעצט',
        secure: 'זיכערהייט',
        error_invalid: 'טעות אין אימייל אדער סיסמה',
        slow_connect: 'מיר שאפונירן... דאס קען נעמען ביז א מינוט',
    },
};

export default function LoginPage() {
    const params = useParams();
    const router = useRouter();
    const locale = (params?.locale as string) || 'he';
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [showSlowMessage, setShowSlowMessage] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lockedUntil, setLockedUntil] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const t = translations[locale] || translations.he;
    const [tagline, setTagline] = useState(t.taglines[0]);

    // Picked client-side only (after mount) so the build-time-prerendered HTML and the
    // hydrated client render always agree on the first paint — a fresh random pick on every
    // render/reload, not persisted anywhere. Deferred to a microtask (matching the
    // showSlowMessage effect below) since setting state synchronously inside an effect body
    // triggers an eslint cascading-render warning.
    useEffect(() => {
        const pick = t.taglines[Math.floor(Math.random() * t.taglines.length)];
        Promise.resolve().then(() => setTagline(pick));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locale]);

    useEffect(() => {
        if (!isLoading) {
            Promise.resolve().then(() => setShowSlowMessage(false));
            return;
        }
        const timer = setTimeout(() => setShowSlowMessage(true), 4000);
        return () => clearTimeout(timer);
    }, [isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setLockedUntil(null);
        try {
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);

            const response = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                await login(data.access_token);
                const redirectTo = new URLSearchParams(window.location.search).get('redirect');
                router.push(redirectTo && redirectTo.startsWith('/') ? redirectTo : `/${locale}`);
            } else if (response.status === 423) {
                // Account temporarily locked (too many failed attempts) — distinct from a plain
                // wrong password. locked_until drives a live countdown instead of a static message.
                const data = await response.json().catch(() => ({}));
                if (data.locked_until) {
                    setLockedUntil(data.locked_until);
                } else {
                    setError(data.detail || t.error_invalid);
                }
            } else {
                setError(t.error_invalid);
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#111a2f] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1e3a8a] blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400 blur-[120px] rounded-full" />
            </div>

            {/* Welcome panel is first in DOM order, so it naturally lands on the "start" side
                (right under dir="rtl" for he/yi, left under dir="ltr" for en/fr) with zero
                RTL-specific classes — this codebase already relies on that native mirroring
                everywhere else (BenefitsContent.tsx, join/page.tsx). */}
            <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6 lg:gap-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-md mx-auto lg:max-w-none lg:w-1/2 lg:mx-0 bg-[#0e1628]/60 backdrop-blur-xl p-8 sm:p-12 rounded-[3rem] border border-white/10 flex flex-col justify-center"
                >
                    <h1 className="text-3xl sm:text-4xl font-black text-[#f0e6d3] mb-3 leading-tight">{t.title}</h1>
                    <p className="text-[#f0e6d3]/60 font-medium leading-relaxed mb-6">{t.subtitle}</p>
                    <p key={tagline} className="text-lg font-bold text-[#d4af37] mb-8 animate-fade-in">{tagline}</p>

                    <div className="space-y-4">
                        {t.valueProps.map((vp) => {
                            const Icon = VALUE_PROP_ICONS[vp.icon];
                            return (
                                <div key={vp.text} className="flex items-center gap-3">
                                    <div className="w-9 h-9 shrink-0 bg-[#1e3a8a]/40 text-[#d4af37] rounded-xl flex items-center justify-center">
                                        <Icon size={18} />
                                    </div>
                                    <span className="text-sm text-[#f0e6d3]/80 font-medium">{vp.text}</span>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.15 }}
                    className="w-full max-w-md mx-auto lg:max-w-none lg:w-1/2 lg:mx-0 bg-[#0e1628]/80 backdrop-blur-xl p-6 sm:p-12 rounded-[3rem] shadow-2xl border border-white"
                >
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-14 h-14 bg-[#1e3a8a] text-white rounded-2xl flex items-center justify-center mb-5 shadow-lg rotate-3">
                            <LogIn size={28} />
                        </div>
                        <h2 className="text-xl font-black text-[#f0e6d3]">{t.formTitle}</h2>
                    </div>

                    {lockedUntil ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full p-4 mb-8 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 text-center"
                        >
                            <LockoutCountdown lockedUntil={lockedUntil} locale={locale} />
                        </motion.div>
                    ) : error && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full p-4 mb-8 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 text-center"
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2 flex flex-col items-start">
                            <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest px-2">{t.email}</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                                placeholder="email@example.com"
                            />
                        </div>
                        <div className="space-y-2 flex flex-col items-start">
                            <div className="w-full flex justify-between items-center px-2">
                                <label className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest">{t.password}</label>
                                <Link href={`/${locale}/forgot-password`} className="text-xs font-bold text-[#d4af37]/70 hover:text-[#d4af37] transition-colors">{t.forgot}</Link>
                            </div>
                            <div className="relative w-full">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute inset-y-0 left-1 flex items-center px-3 text-[#f0e6d3]/60 hover:text-[#d4af37] transition-colors"
                                    tabIndex={-1}
                                    aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[#080d1f] text-white py-5 rounded-2xl text-lg font-bold shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-4 group"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    <span>{t.submit}</span>
                                    <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                        {showSlowMessage && (
                            <p className="text-center text-[#f0e6d3]/50 text-xs -mt-2">{t.slow_connect}</p>
                        )}
                    </form>

                    <div className="mt-12 pt-8 border-t border-[#d4af37]/20 text-center">
                        <Link
                            href={`/${locale}/register${typeof window !== 'undefined' && window.location.search ? window.location.search : ''}`}
                            className="text-sm font-bold text-[#f0e6d3]/60 hover:text-[#1e3a8a] transition-colors"
                        >
                            {t.no_account}
                        </Link>
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-[#f0e6d3]/60 font-bold uppercase tracking-widest">
                        <ShieldCheck size={12} />
                        <span>{t.secure}</span>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
