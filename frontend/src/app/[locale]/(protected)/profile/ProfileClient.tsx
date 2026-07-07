'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { updateUserProfile, getMyActivity, changePassword, getFavorites, removeFavorite, getMyAppointments, getMyOrders, updateNotificationPrefs, productImageUrl } from '@/lib/api';
import {
    LogOut, Mail, Phone, MapPin, Calendar, User2,
    CheckCircle2, CreditCard, Building2, Gem, Car, ShieldCheck, ClipboardList, ChevronDown, KeyRound, Eye, EyeOff, Heart, X, Clock, History, Bell, ShoppingBag,
} from 'lucide-react';
import SavingsCalculator from '@/components/SavingsCalculator';

// ─── Translations ─────────────────────────────────────────────────────────────
const tr: Record<string, Record<string, string>> = {
    he: {
        title: 'האזור האישי',
        greeting_male: 'ברוך הבא', greeting_female: 'ברוכה הבאה', greeting_neutral: 'ברוכים הבאים',
        role_member: 'חבר מועדון', role_admin: 'מנהל מערכת',
        profile_completion: 'השלמת פרופיל',
        complete_profile: 'השלם את הפרופיל שלך',
        complete_sub: 'פרטים נוספים עוזרים לנו להתאים לך את החוויה הטובה ביותר',
        email_label: 'אימייל',
        phone: 'מספר טלפון', city: 'עיר מגורים', birth_year: 'שנת לידה',
        gender: 'מין', gender_male: 'זכר', gender_female: 'נקבה',
        id_number: 'מספר זהות',
        club_affiliation: 'שייכות למועדון', choose: 'בחר...',
        membership_track: 'מסלול הצטרפות',
        save: 'שמור שינויים', saving: 'שומר...', saved: 'נשמר!',
        backoffice: 'כניסה לבק-אופיס',
        backoffice_sub: 'ניהול מוצרים, משתמשים, מבצעים, הפצות וסקרים',
        logout: 'התנתק',
        activity_title: 'היסטוריית פעילות',
        no_activity: 'טרם בוצעו פניות.',
        vertical_diamonds: 'יהלומים', vertical_cars: 'רכב', vertical_insurance: 'ביטוח',
        lead_appointment: 'פגישה', lead_contact: 'פנייה', lead_other: 'בקשה',
        status_new: 'חדשה', status_confirmed: 'מאושרת', status_contacted: 'טופלה', status_closed: 'סגורה',
        completed_section: 'פרטים שמולאו', missing_section: 'פרטים חסרים',
        profile_full: 'הפרופיל שלך מלא לחלוטין',
        filled_will_appear: 'הפרטים שתמלא יופיעו כאן',
    },
    en: {
        title: 'My Profile',
        greeting_male: 'Hello', greeting_female: 'Hello', greeting_neutral: 'Welcome',
        role_member: 'Club Member', role_admin: 'System Admin',
        profile_completion: 'Profile completion',
        complete_profile: 'Complete your profile',
        complete_sub: 'More details help us tailor the best experience for you',
        email_label: 'Email',
        phone: 'Phone number', city: 'City', birth_year: 'Birth year',
        gender: 'Gender', gender_male: 'Male', gender_female: 'Female',
        id_number: 'ID number',
        club_affiliation: 'Club affiliation', choose: 'Choose...',
        membership_track: 'Membership track',
        save: 'Save changes', saving: 'Saving...', saved: 'Saved!',
        backoffice: 'Enter Back-Office',
        backoffice_sub: 'Manage products, users, promotions, distributions and surveys',
        logout: 'Log out',
        activity_title: 'Activity history',
        no_activity: 'No activity yet.',
        vertical_diamonds: 'Diamonds', vertical_cars: 'Cars', vertical_insurance: 'Insurance',
        lead_appointment: 'Appointment', lead_contact: 'Contact', lead_other: 'Request',
        status_new: 'New', status_confirmed: 'Confirmed', status_contacted: 'Handled', status_closed: 'Closed',
        completed_section: 'Completed details', missing_section: 'Missing details',
        profile_full: 'Your profile is complete!',
        filled_will_appear: 'Details you fill in will appear here',
    },
    fr: {
        title: 'Mon Espace',
        greeting_male: 'Bonjour', greeting_female: 'Bonjour', greeting_neutral: 'Bienvenue',
        role_member: 'Membre', role_admin: 'Administrateur',
        profile_completion: 'Complétion du profil',
        complete_profile: 'Complétez votre profil',
        complete_sub: 'Plus de détails nous aident à personnaliser votre expérience',
        email_label: 'E-mail',
        phone: 'Téléphone', city: 'Ville', birth_year: 'Année de naissance',
        gender: 'Genre', gender_male: 'Homme', gender_female: 'Femme',
        id_number: 'Numéro d\'identité',
        club_affiliation: 'Appartenance au club', choose: 'Choisir...',
        membership_track: 'Formule d\'adhésion',
        save: 'Enregistrer', saving: 'Enregistrement...', saved: 'Enregistré !',
        backoffice: 'Accès Back-Office',
        backoffice_sub: 'Gérer les produits, utilisateurs, promotions et enquêtes',
        logout: 'Se déconnecter',
        activity_title: "Historique d'activité",
        no_activity: 'Aucune activité.',
        vertical_diamonds: 'Diamants', vertical_cars: 'Voitures', vertical_insurance: 'Assurance',
        lead_appointment: 'Rendez-vous', lead_contact: 'Contact', lead_other: 'Demande',
        status_new: 'Nouveau', status_confirmed: 'Confirmé', status_contacted: 'Traité', status_closed: 'Fermé',
        completed_section: 'Détails complétés', missing_section: 'Détails manquants',
        profile_full: 'Votre profil est complet !',
        filled_will_appear: 'Les détails que vous remplirez apparaîtront ici',
    },
    yi: {
        title: 'מיין פּרופֿיל',
        greeting_male: 'ברוך הבא', greeting_female: 'ברוכה הבאה', greeting_neutral: 'ברוכים הבאים',
        role_member: 'קלוב מיטגליד', role_admin: 'סיסטעם פאַרוואַלטער',
        profile_completion: 'פּרופֿיל פֿאַרענדיקונג',
        complete_profile: 'פֿאַרענדיקט דעם פּרופֿיל',
        complete_sub: 'מער פּרטים העלפֿן צוצופּאַסן דיין דערפֿאַרונג',
        email_label: 'עמעיל',
        phone: 'טעלעפֿאָן', city: 'שטאָט', birth_year: 'געבורטסיאָר',
        gender: 'מין', gender_male: 'זכר', gender_female: 'נקבה',
        id_number: 'ת.ז. נומער',
        club_affiliation: 'קלוב שייכות', choose: 'אויסקלייבן...',
        membership_track: 'מיטגלידשאַפֿט מסלול',
        save: 'אָפּשפּאַרן', saving: 'שפּאַרן...', saved: 'אָפּגעשפּאַרט!',
        backoffice: 'אריין אין בעק-אָפיס',
        backoffice_sub: 'פאַרוואַלטן פּראָדוקטן, באניצערס, מבצעים',
        logout: 'אויסלאָגן',
        activity_title: 'פּעולה היסטאָריע',
        no_activity: 'קיין פּעולות נאָך ניט.',
        vertical_diamonds: 'דימענטן', vertical_cars: 'אויטאס', vertical_insurance: 'אינשורענס',
        lead_appointment: 'פּגישה', lead_contact: 'פּנייה', lead_other: 'בקשה',
        status_new: 'ניי', status_confirmed: 'באשטעטיקט', status_contacted: 'באהאנדלט', status_closed: 'פארמאכט',
        completed_section: 'פֿאַרענדיקטע פּרטים', missing_section: 'פֿעלנדע פּרטים',
        profile_full: 'דיין פּרופֿיל איז פֿולשטענדיק!',
        filled_will_appear: 'פּרטים וואָס דו פֿילסט אויס וועלן דאָ דערשייַנען',
    },
};

// ─── Options ──────────────────────────────────────────────────────────────────
const CLUB_AFFILIATIONS: string[] = [
    'לומד/ת במכללה',
    'חינוך והוראה',
    'עצמאי/ת במסחר',
    'תעשייה ובנייה',
    'היטק',
    'מקצועות חופשיים (רו"ח, עו"ד וכדו\')',
];

const MEMBERSHIP_TRACKS: { value: string; label: string }[] = [
    { value: 'credit',    label: 'אשמח להצטרף ולקבל את האשראי הישראי החוץ בנקאי שלכם' },
    { value: 'insurance', label: 'אשמח להצטרף לביטוחים בהנחה אצל חברת הביטוח דרככם' },
    { value: 'mortgage',  label: 'אשמח לקבל פרטים לגבי משכנתא בהנחה מהבנק המוביל את התכנית' },
];

const ISRAELI_CITIES = [
    'אבן יהודה', 'אום אל-פחם', 'אופקים', 'אור יהודה', 'אור עקיבא', 'אילת',
    'אלעד', 'אריאל', 'אשדוד', 'אשקלון',
    'באקה-ג׳ת', 'באר שבע', 'בית דגן', 'בית שאן', 'בית שמש', 'ביתר עילית',
    'בני ברק', 'בת ים',
    'גבעת שמואל', 'גבעתיים', 'גדרה', 'גן יבנה',
    'דימונה',
    'הוד השרון', 'הרצליה',
    'זכרון יעקב',
    'חדרה', 'חולון', 'חיפה',
    'טבריה', 'טירת כרמל', 'טייבה',
    'יבנה', 'ירושלים', 'יקנעם',
    'כפר סבא', 'כפר יונה', 'כרמיאל', 'קלנסווה',
    'לוד',
    'מגדל העמק', 'מודיעין-מכבים-רעות', 'מודיעין עילית', 'מעלה אדומים', 'מצפה רמון',
    'נהריה', 'נס ציונה', 'נתיבות', 'נתניה', 'נצרת', 'נוף הגליל',
    'עכו', 'עפולה', 'ערד',
    'פרדס חנה-כרכור', 'פתח תקווה',
    'צפת',
    'קריית אונו', 'קריית אתא', 'קריית ביאליק', 'קריית גת', 'קריית ים', 'קריית מוצקין', 'קריית שמונה',
    'ראש העין', 'ראשון לציון', 'רהט', 'רחובות', 'רמה', 'רמלה', 'רמת גן', 'רעננה',
    'שדרות', 'שוהם',
    'תל אביב-יפו',
];

const COMPLETION_FIELDS = ['phone', 'gender', 'city', 'birth_year', 'id_number', 'club_affiliation', 'membership_tracks'];

function computeCompletion(user: any) {
    const missing = COMPLETION_FIELDS.filter((f) => {
        const v = user?.[f];
        return !v || (Array.isArray(v) && v.length === 0);
    });
    const pct = Math.round(((COMPLETION_FIELDS.length - missing.length) / COMPLETION_FIELDS.length) * 100);
    return { pct };
}

// ─── City autocomplete ────────────────────────────────────────────────────────
function CityInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const filtered = value.length >= 1
        ? ISRAELI_CITIES.filter(c => c.includes(value)).slice(0, 8)
        : [];

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div ref={ref} className="relative">
            <input
                type="text"
                value={value}
                onChange={e => { onChange(e.target.value); setOpen(true); }}
                onFocus={() => { if (value.length >= 1) setOpen(true); }}
                className="input-field"
                placeholder={placeholder || 'ירושלים'}
                autoComplete="off"
            />
            {open && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl overflow-hidden"
                    style={{ background: '#0e1628', border: '1px solid rgba(212,175,55,0.35)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                    {filtered.map(city => (
                        <button
                            key={city}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); onChange(city); setOpen(false); }}
                            className="w-full text-right px-4 py-2.5 text-sm text-[#f0e6d3] hover:bg-[#d4af37]/10 transition-colors block"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            {city}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProfileClient() {
    const params = useParams();
    const router = useRouter();
    const locale = (params?.locale as string) || 'he';
    const t = tr[locale] || tr.he;
    const { user, token, logout, login } = useAuth();

    const [form, setForm] = useState({
        phone: '', gender: '', city: '', birth_year: '',
        id_number: '', club_affiliation: '', membership_tracks: [] as string[],
    });
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [activity, setActivity] = useState<any[]>([]);
    const [activityLoading, setActivityLoading] = useState(true);
    const [favorites, setFavorites] = useState<any[]>([]);
    const [removingFavId, setRemovingFavId] = useState<number | null>(null);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [showNotifPrefs, setShowNotifPrefs] = useState(false);
    const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({ lead_status: true, appointment_reminder: true, system: true, promotions: true });
    const [notifSaving, setNotifSaving] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [pwState, setPwState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [pwError, setPwError] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNext, setShowNext] = useState(false);

    useEffect(() => {
        if (!user) return;
        setForm({
            phone: user.phone || '',
            gender: user.gender || '',
            city: user.city || '',
            birth_year: user.birth_year ? String(user.birth_year) : '',
            id_number: user.id_number || '',
            club_affiliation: user.club_affiliation || '',
            membership_tracks: user.membership_tracks || [],
        });
    }, [user]);

    useEffect(() => {
        if (!token) return;
        getMyActivity(token).then(setActivity).finally(() => setActivityLoading(false));
        getFavorites(token).then(setFavorites).catch(() => {});
        getMyAppointments(token).then(setAppointments).catch(() => {});
        getMyOrders(token).then(setOrders).catch(() => {});
        try {
            const raw = localStorage.getItem('tivuta_recent_v2');
            if (raw) setRecentlyViewed(JSON.parse(raw));
        } catch { /* ignore */ }
    }, [token]);

    useEffect(() => {
        if (user?.notification_prefs) setNotifPrefs({ lead_status: true, appointment_reminder: true, system: true, promotions: true, ...user.notification_prefs });
    }, [user]);

    const handleRemoveFav = async (productId: number) => {
        if (!token) return;
        setRemovingFavId(productId);
        await removeFavorite(token, productId);
        setFavorites((prev) => prev.filter((f) => f.product_id !== productId));
        setRemovingFavId(null);
    };

    const { pct } = computeCompletion(user);

    // Split based on SAVED user state (stable while user types)
    const isFieldMissing = (f: string) => {
        const v = (user as any)?.[f];
        return !v || (Array.isArray(v) && v.length === 0);
    };
    const completedFieldList = COMPLETION_FIELDS.filter(f => !isFieldMissing(f));
    const missingFieldList   = COMPLETION_FIELDS.filter(f => isFieldMissing(f));

    const greeting = user?.gender === 'male'   ? t.greeting_male
                   : user?.gender === 'female' ? t.greeting_female
                   : t.greeting_neutral;

    const initials = user
        ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
        : '?';

    const handleSave = async () => {
        if (!token) return;
        setSaveState('saving');
        try {
            const payload: any = {};
            if (form.phone)           payload.phone = form.phone;
            if (form.gender)          payload.gender = form.gender;
            if (form.city)            payload.city = form.city;
            if (form.birth_year)      payload.birth_year = Number(form.birth_year);
            if (form.id_number)       payload.id_number = form.id_number;
            if (form.club_affiliation) payload.club_affiliation = form.club_affiliation;
            if (form.membership_tracks.length > 0) payload.membership_tracks = form.membership_tracks;
            await updateUserProfile(token, payload);
            await login(token);
            setSaveState('saved');
            setTimeout(() => setSaveState('idle'), 2500);
        } catch {
            setSaveState('idle');
        }
    };

    const handleLogout = () => { logout(); router.push(`/${locale}/login`); };

    const handlePasswordChange = async () => {
        if (!token) return;
        setPwError('');
        if (pwForm.next !== pwForm.confirm) { setPwError(locale === 'he' ? 'הסיסמאות אינן תואמות' : 'Passwords do not match'); return; }
        if (pwForm.next.length < 6) { setPwError(locale === 'he' ? 'לפחות 6 תווים' : 'At least 6 characters'); return; }
        setPwState('saving');
        try {
            await changePassword(token, pwForm.current, pwForm.next);
            setPwState('saved');
            setPwForm({ current: '', next: '', confirm: '' });
            setTimeout(() => { setPwState('idle'); setShowPasswordForm(false); }, 2000);
        } catch (e: any) {
            setPwError(e.message || 'שגיאה');
            setPwState('error');
        }
    };

    const barColor = pct === 100 ? 'bg-green-400' : pct >= 60 ? 'bg-[#d4af37]' : 'bg-orange-400';

    const verticalLabel = (v: string) =>
        v === 'diamonds' ? t.vertical_diamonds : v === 'cars' ? t.vertical_cars : t.vertical_insurance;
    const leadTypeLabel = (lt: string) =>
        lt === 'appointment' ? t.lead_appointment : lt === 'contact_request' ? t.lead_contact : t.lead_other;
    const statusLabel = (s: string) =>
        ({ new: t.status_new, confirmed: t.status_confirmed, contacted: t.status_contacted, closed: t.status_closed }[s] ?? s);
    const statusColor = (s: string) =>
        ({ new: 'text-[#f0e6d3]/60', confirmed: 'text-green-400', contacted: 'text-blue-400', closed: 'text-[#f0e6d3]/30' }[s] ?? 'text-[#f0e6d3]/60');

    const grouped = activity.reduce((acc: Record<string, any[]>, item: any) => {
        const v = item.product_vertical || 'other';
        if (!acc[v]) acc[v] = [];
        acc[v].push(item);
        return acc;
    }, {});

    const VERTICAL_ICON = (v: string) =>
        v === 'diamonds' ? <Gem size={15} className="text-[#d4af37]" />
        : v === 'cars'   ? <Car size={15} className="text-[#d4af37]" />
        : <ShieldCheck size={15} className="text-[#d4af37]" />;

    // Renders a single form field by name
    const renderField = (fieldName: string) => {
        switch (fieldName) {
            case 'phone':
                return (
                    <Field label={t.phone} icon={<Phone size={12} />}>
                        <input type="tel" value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                            className="input-field" placeholder="050-0000000" dir="ltr" />
                    </Field>
                );
            case 'id_number':
                return (
                    <Field label={t.id_number} icon={<CreditCard size={12} />}>
                        <input type="text" value={form.id_number}
                            onChange={e => setForm({ ...form, id_number: e.target.value })}
                            className="input-field" placeholder="000000000" dir="ltr" maxLength={9} />
                    </Field>
                );
            case 'gender':
                return (
                    <Field label={t.gender} icon={<User2 size={12} />}>
                        <div className="flex gap-3">
                            {(['male', 'female'] as const).map(g => (
                                <button key={g} type="button"
                                    onClick={() => setForm({ ...form, gender: g })}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                        form.gender === g
                                            ? 'bg-[#d4af37] text-[#080d1f]'
                                            : 'bg-[#111a2f] text-[#f0e6d3]/70 hover:bg-[#1a2540]'
                                    }`}>
                                    {g === 'male' ? t.gender_male : t.gender_female}
                                </button>
                            ))}
                        </div>
                    </Field>
                );
            case 'city':
                return (
                    <Field label={t.city} icon={<MapPin size={12} />}>
                        <CityInput
                            value={form.city}
                            onChange={v => setForm({ ...form, city: v })}
                        />
                    </Field>
                );
            case 'birth_year':
                return (
                    <Field label={t.birth_year} icon={<Calendar size={12} />}>
                        <input type="number" value={form.birth_year}
                            onChange={e => setForm({ ...form, birth_year: e.target.value })}
                            className="input-field" placeholder="1985"
                            min={1930} max={new Date().getFullYear() - 10} dir="ltr" />
                    </Field>
                );
            case 'club_affiliation':
                return (
                    <Field label={t.club_affiliation} icon={<Building2 size={12} />}>
                        <select value={form.club_affiliation}
                            onChange={e => setForm({ ...form, club_affiliation: e.target.value })}
                            className="input-field">
                            <option value="">{t.choose}</option>
                            {CLUB_AFFILIATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </Field>
                );
            case 'membership_tracks':
                return (
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-[#f0e6d3]/50 uppercase tracking-wider mb-3">
                            <ClipboardList size={12} /> {t.membership_track}
                            <span className="normal-case text-[#f0e6d3]/30 font-normal">(ניתן לבחור יותר מאחד)</span>
                        </label>
                        <div className="space-y-2">
                            {MEMBERSHIP_TRACKS.map(track => {
                                const checked = form.membership_tracks.includes(track.value);
                                return (
                                    <button key={track.value} type="button"
                                        onClick={() => {
                                            const next = checked
                                                ? form.membership_tracks.filter(v => v !== track.value)
                                                : [...form.membership_tracks, track.value];
                                            setForm({ ...form, membership_tracks: next });
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-start transition-all ${
                                            checked
                                                ? 'bg-[#d4af37]/15 border border-[#d4af37]/50 text-[#f0e6d3]'
                                                : 'bg-[#111a2f] border border-transparent text-[#f0e6d3]/60 hover:bg-[#1a2540]'
                                        }`}>
                                        <span className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-all ${
                                            checked ? 'bg-[#d4af37] border-[#d4af37]' : 'border-[#f0e6d3]/30'
                                        }`}>
                                            {checked && <span className="text-[#080d1f] text-[10px] font-black">✓</span>}
                                        </span>
                                        {track.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <main className="min-h-screen bg-[#111a2f] py-16 px-6">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* ── Top row: avatar left, progress + email right ── */}
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                    {/* Avatar + name */}
                    <div className="flex-shrink-0 text-center sm:text-start flex flex-col items-center sm:items-start gap-3 sm:pt-1">
                        <div className="w-20 h-20 rounded-full bg-[#d4af37]/20 border-2 border-[#d4af37]/40 flex items-center justify-center">
                            <span className="text-2xl font-black text-[#d4af37]">{initials}</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-[#f0e6d3]">
                                {greeting}{user?.first_name ? `, ${user.first_name}` : ''}
                            </h1>
                            <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold ${
                                user?.role === 'admin' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'bg-[#0e1628] text-[#f0e6d3]/50'
                            }`}>
                                {user?.role === 'admin' ? t.role_admin : t.role_member}
                            </span>
                        </div>
                    </div>

                    {/* Progress + email */}
                    <div className="flex-1 space-y-4 w-full">
                        {/* Progress bar */}
                        <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-[#f0e6d3]/60 uppercase tracking-wider">{t.profile_completion}</span>
                                <span className={`text-sm font-black ${pct === 100 ? 'text-green-400' : 'text-[#d4af37]'}`}>{pct}%</span>
                            </div>
                            <div className="w-full h-2 bg-[#111a2f] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
                            </div>
                            {pct === 100 && (
                                <div className="flex items-center gap-1.5 mt-2 text-green-400 text-xs font-bold">
                                    <CheckCircle2 size={13} /> {t.profile_full}
                                </div>
                            )}
                        </div>

                        {/* Email (read-only) */}
                        <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-5">
                            <div className="flex items-center gap-3 text-[#f0e6d3]">
                                <Mail size={17} className="text-[#d4af37]/60 shrink-0" />
                                <div>
                                    <p className="text-xs text-[#f0e6d3]/40 mb-0.5">{t.email_label}</p>
                                    <p className="text-sm font-semibold">{user?.email}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Form: 2 columns (completed | missing) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* Completed column */}
                    <div className="bg-[#0e1628] border border-green-500/20 rounded-2xl p-5 space-y-5">
                        <div className="flex items-center gap-2 pb-3 border-b border-green-500/10">
                            <CheckCircle2 size={15} className="text-green-400" />
                            <span className="font-black text-sm text-green-400">{t.completed_section}</span>
                        </div>
                        {completedFieldList.length === 0 ? (
                            <p className="text-[#f0e6d3]/25 text-sm text-center py-6">{t.filled_will_appear}</p>
                        ) : (
                            <div className="space-y-4">
                                {completedFieldList.map(f => (
                                    <div key={f}>{renderField(f)}</div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Missing column */}
                    <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-5 space-y-5">
                        <div className="flex items-center gap-2 pb-3 border-b border-[#d4af37]/10">
                            <User2 size={15} className="text-[#d4af37]" />
                            <span className="font-black text-sm text-[#d4af37]">{t.missing_section}</span>
                        </div>
                        {missingFieldList.length === 0 ? (
                            <div className="text-center py-6">
                                <CheckCircle2 size={32} className="text-green-400 mx-auto mb-2" />
                                <p className="text-green-400 text-sm font-bold">{t.profile_full}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {missingFieldList.map(f => (
                                    <div key={f}>{renderField(f)}</div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Save button */}
                <button onClick={handleSave} disabled={saveState === 'saving'}
                    className={`w-full py-3 rounded-xl font-black text-sm transition-all ${
                        saveState === 'saved'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-[#d4af37] text-[#080d1f] hover:bg-[#c9a227] disabled:opacity-60'
                    }`}>
                    {saveState === 'saving' ? t.saving : saveState === 'saved' ? `✓ ${t.saved}` : t.save}
                </button>

                {/* ── Activity history ── */}
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-5">
                    <h2 className="font-black text-[#f0e6d3] text-sm mb-4">{t.activity_title}</h2>
                    {activityLoading ? (
                        <div className="text-center py-4 text-[#f0e6d3]/40 text-sm">...</div>
                    ) : activity.length === 0 ? (
                        <p className="text-[#f0e6d3]/40 text-sm">{t.no_activity}</p>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(grouped).map(([vertical, items]) => (
                                <div key={vertical}>
                                    <div className="flex items-center gap-2 mb-3">
                                        {VERTICAL_ICON(vertical)}
                                        <span className="text-xs font-bold text-[#d4af37] uppercase tracking-wider">
                                            {verticalLabel(vertical)}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {(items as any[]).map(item => (
                                            <div key={item.id} className="bg-[#111a2f] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[#f0e6d3] truncate">{item.product_title_he || '—'}</p>
                                                    <p className="text-xs text-[#f0e6d3]/40 mt-0.5">
                                                        {leadTypeLabel(item.lead_type)} ·{' '}
                                                        {new Date(item.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                    </p>
                                                </div>
                                                <span className={`text-xs font-bold shrink-0 ${statusColor(item.status)}`}>
                                                    {statusLabel(item.status)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Favorites / Wishlist ── */}
                {favorites.length > 0 && (
                    <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-5">
                        <h2 className="font-black text-[#f0e6d3] text-sm mb-4 flex items-center gap-2">
                            <Heart size={14} className="text-red-400" fill="currentColor" />
                            {locale === 'he' ? 'מוצרים שמורים' : 'Saved Products'}
                        </h2>
                        <div className="space-y-2">
                            {favorites.map((fav: any) => {
                                const p = fav.product;
                                if (!p) return null;
                                const imgSrc = productImageUrl(p.image_url);
                                return (
                                    <div key={fav.id} className="flex items-center gap-3 bg-[#111a2f] rounded-xl px-3 py-2">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={imgSrc} alt={p.title_he} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-[#f0e6d3] truncate">{p.title_he}</p>
                                            {p.price && <p className="text-xs text-[#d4af37]">₪{p.price.toLocaleString()}</p>}
                                        </div>
                                        <button
                                            onClick={() => handleRemoveFav(fav.product_id)}
                                            disabled={removingFavId === fav.product_id}
                                            className="text-[#f0e6d3]/20 hover:text-red-400 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── My Appointments ── */}
                {appointments.length > 0 && (
                    <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-5">
                        <h2 className="font-black text-[#f0e6d3] text-sm mb-4 flex items-center gap-2">
                            <Calendar size={14} className="text-[#d4af37]" />
                            {locale === 'he' ? 'פגישות קרובות' : locale === 'fr' ? 'Prochains rendez-vous' : 'Upcoming Appointments'}
                        </h2>
                        <div className="space-y-2">
                            {appointments.map((appt: any) => (
                                <div key={appt.id} className="bg-[#111a2f] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-[#f0e6d3] truncate">
                                            {locale === 'he' ? 'פגישת התרשמות' : 'Viewing Appointment'}
                                        </p>
                                        <p className="text-xs text-[#d4af37] mt-0.5 flex items-center gap-1">
                                            <Clock size={10} />
                                            {new Date(appt.scheduled_at).toLocaleDateString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <span className={`text-xs font-bold shrink-0 px-2 py-0.5 rounded-full ${
                                        appt.status === 'confirmed' ? 'bg-green-400/10 text-green-400' : 'bg-[#d4af37]/10 text-[#d4af37]'
                                    }`}>
                                        {appt.status === 'confirmed' ? (locale === 'he' ? 'מאושר' : 'Confirmed') : (locale === 'he' ? 'ממתין' : 'Pending')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── My Orders ── */}
                {orders.length > 0 && (
                    <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-5">
                        <h2 className="font-black text-[#f0e6d3] text-sm mb-4 flex items-center gap-2">
                            <ShoppingBag size={14} className="text-[#d4af37]" />
                            {locale === 'he' ? 'ההזמנות שלי' : locale === 'fr' ? 'Mes commandes' : 'My Orders'}
                        </h2>
                        <div className="space-y-2">
                            {orders.map((order: any) => (
                                <div key={order.id} className="bg-[#111a2f] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-[#f0e6d3] truncate">{order.title_he}</p>
                                        <p className="text-xs text-[#f0e6d3]/40 mt-0.5">
                                            {new Date(order.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-black text-[#d4af37]">₪{order.amount.toLocaleString()}</p>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            order.status === 'completed' ? 'bg-green-400/10 text-green-400' :
                                            order.status === 'pending' ? 'bg-yellow-400/10 text-yellow-400' :
                                            'bg-red-400/10 text-red-400'
                                        }`}>
                                            {order.status === 'completed' ? (locale === 'he' ? 'הושלם' : 'Completed') :
                                             order.status === 'pending' ? (locale === 'he' ? 'ממתין' : 'Pending') :
                                             (locale === 'he' ? 'בוטל' : 'Cancelled')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Recently Viewed ── */}
                {recentlyViewed.length > 0 && (
                    <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-5">
                        <h2 className="font-black text-[#f0e6d3] text-sm mb-4 flex items-center gap-2">
                            <History size={14} className="text-[#d4af37]" />
                            {locale === 'he' ? 'נצפו לאחרונה' : locale === 'fr' ? 'Récemment vus' : 'Recently Viewed'}
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {recentlyViewed.slice(0, 8).map((p: any) => {
                                const imgSrc = productImageUrl(p.image_url);
                                const href = `/${locale}/${p.vertical}`;
                                return (
                                    <a key={p.id} href={href} className="group bg-[#111a2f] rounded-xl overflow-hidden hover:ring-1 hover:ring-[#d4af37]/40 transition-all">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={imgSrc} alt={p.title_he} className="w-full h-20 object-cover group-hover:scale-105 transition-transform duration-300" />
                                        <div className="px-2 py-1.5">
                                            <p className="text-xs font-semibold text-[#f0e6d3] truncate">{p.title_he}</p>
                                            {p.price && <p className="text-[10px] text-[#d4af37]">₪{p.price.toLocaleString()}</p>}
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Password change ── */}
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-hidden">
                    <button
                        onClick={() => setShowPasswordForm((v) => !v)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#111a2f] transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <KeyRound size={16} className="text-[#d4af37]/60" />
                            <span className="text-sm font-bold text-[#f0e6d3]">{locale === 'he' ? 'שינוי סיסמה' : 'Change Password'}</span>
                        </div>
                        <ChevronDown size={16} className={`text-[#f0e6d3]/40 transition-transform ${showPasswordForm ? 'rotate-180' : ''}`} />
                    </button>
                    {showPasswordForm && (
                        <div className="px-5 pb-5 space-y-3 border-t border-[#d4af37]/10 pt-4">
                            {pwState === 'saved' && (
                                <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
                                    <CheckCircle2 size={15} /> {locale === 'he' ? 'הסיסמה שונתה בהצלחה!' : 'Password changed!'}
                                </div>
                            )}
                            {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
                            {[
                                { key: 'current', label: locale === 'he' ? 'סיסמה נוכחית' : 'Current password', show: showCurrent, toggle: () => setShowCurrent((v) => !v) },
                                { key: 'next', label: locale === 'he' ? 'סיסמה חדשה' : 'New password', show: showNext, toggle: () => setShowNext((v) => !v) },
                                { key: 'confirm', label: locale === 'he' ? 'אימות סיסמה חדשה' : 'Confirm new password', show: showNext, toggle: () => {} },
                            ].map(({ key, label, show, toggle }) => (
                                <div key={key} className="relative">
                                    <label className="text-[11px] text-[#f0e6d3]/40 font-bold uppercase tracking-wider mb-1 block">{label}</label>
                                    <div className="relative">
                                        <input
                                            type={show ? 'text' : 'password'}
                                            value={(pwForm as any)[key]}
                                            onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                                            className="w-full bg-[#111a2f] rounded-xl px-4 py-2.5 text-sm text-[#f0e6d3] pe-10"
                                            dir="ltr"
                                        />
                                        {key !== 'confirm' && (
                                            <button type="button" onClick={toggle} className="absolute end-3 top-1/2 -translate-y-1/2 text-[#f0e6d3]/30 hover:text-[#f0e6d3]/60">
                                                {show ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={handlePasswordChange}
                                disabled={pwState === 'saving' || !pwForm.current || !pwForm.next || !pwForm.confirm}
                                className="w-full py-2.5 rounded-xl font-bold text-sm bg-[#d4af37] text-[#080d1f] hover:bg-[#c9a227] disabled:opacity-50 transition-all"
                            >
                                {pwState === 'saving' ? '...' : locale === 'he' ? 'שמור סיסמה חדשה' : 'Save new password'}
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Notification preferences ── */}
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-hidden">
                    <button
                        onClick={() => setShowNotifPrefs((v) => !v)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#111a2f] transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Bell size={16} className="text-[#d4af37]/60" />
                            <span className="text-sm font-bold text-[#f0e6d3]">
                                {locale === 'he' ? 'העדפות התראות' : locale === 'fr' ? 'Préférences de notifications' : 'Notification Preferences'}
                            </span>
                        </div>
                        <ChevronDown size={16} className={`text-[#f0e6d3]/40 transition-transform ${showNotifPrefs ? 'rotate-180' : ''}`} />
                    </button>
                    {showNotifPrefs && (
                        <div className="px-5 pb-5 space-y-3 border-t border-[#d4af37]/10 pt-4">
                            {[
                                { key: 'lead_status', label: locale === 'he' ? 'עדכוני סטטוס פנייה' : 'Lead status updates' },
                                { key: 'appointment_reminder', label: locale === 'he' ? 'תזכורות פגישה' : 'Appointment reminders' },
                                { key: 'system', label: locale === 'he' ? 'הודעות מערכת' : 'System messages' },
                                { key: 'promotions', label: locale === 'he' ? 'מבצעים והטבות' : 'Promotions & offers' },
                            ].map(({ key, label }) => (
                                <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
                                    <span className="text-sm text-[#f0e6d3]/80">{label}</span>
                                    <div
                                        onClick={() => setNotifPrefs((p) => ({ ...p, [key]: !p[key] }))}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${notifPrefs[key] ? 'bg-[#d4af37]' : 'bg-[#111a2f]'}`}
                                    >
                                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${notifPrefs[key] ? 'right-0.5' : 'left-0.5'}`} />
                                    </div>
                                </label>
                            ))}
                            <button
                                onClick={async () => {
                                    if (!token) return;
                                    setNotifSaving(true);
                                    try { await updateNotificationPrefs(token, notifPrefs); } finally { setNotifSaving(false); }
                                }}
                                disabled={notifSaving}
                                className="w-full py-2.5 rounded-xl font-bold text-sm bg-[#d4af37] text-[#080d1f] hover:bg-[#c9a227] disabled:opacity-50 transition-all"
                            >
                                {notifSaving ? '...' : locale === 'he' ? 'שמור העדפות' : 'Save preferences'}
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Savings calculator ── */}
                <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 32px rgba(212,175,55,0.18)' }}>
                    <button
                        onClick={() => setShowCalculator(v => !v)}
                        className="w-full flex items-center justify-between gap-4 px-6 py-5 transition-all group"
                        style={{
                            background: showCalculator
                                ? 'linear-gradient(135deg, #c9a227 0%, #d4af37 100%)'
                                : 'linear-gradient(135deg, #b8922a 0%, #d4af37 50%, #e8c253 100%)',
                        }}
                    >
                        <div className="text-start">
                            <p className="font-black text-[#080d1f] text-lg leading-tight">בדקו כמה תוכלו לחסוך איתנו</p>
                            <p className="text-[#080d1f]/60 text-xs mt-0.5">הדמיית חיסכון והטבות על בסיס נתוני ההוצאה וההכנסה שלכם</p>
                        </div>
                        <ChevronDown
                            size={22}
                            className="shrink-0 transition-transform duration-300 text-[#080d1f]"
                            style={{ transform: showCalculator ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        />
                    </button>
                    {showCalculator && (
                        <div className="px-4 pb-6 pt-5" style={{ background: 'rgba(14,22,40,0.6)' }}>
                            <SavingsCalculator />
                        </div>
                    )}
                </div>

                {/* ── Logout ── */}
                <button onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 transition-all text-sm font-bold">
                    <LogOut size={15} /> {t.logout}
                </button>

            </div>
        </main>
    );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-[#f0e6d3]/50 uppercase tracking-wider mb-2">
                {icon} {label}
            </label>
            {children}
        </div>
    );
}
