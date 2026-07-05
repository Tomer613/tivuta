'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { updateUserProfile, getMyActivity } from '@/lib/api';
import {
    LogOut, Settings, Mail, Phone, MapPin, Calendar, User2,
    CheckCircle2, CreditCard, Building2, Gem, Car, ShieldCheck, ClipboardList,
} from 'lucide-react';

// ─── Translations ────────────────────────────────────────────────────────────
const tr: Record<string, Record<string, string>> = {
    he: {
        title: 'האזור האישי',
        greeting_male: 'ברוך הבא', greeting_female: 'ברוכה הבאה', greeting_neutral: 'שלום',
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
        save: 'שמור', saving: 'שומר...', saved: 'נשמר!',
        backoffice: 'כניסה לבק-אופיס',
        backoffice_sub: 'ניהול מוצרים, משתמשים, מבצעים, הפצות וסקרים',
        logout: 'התנתק',
        activity_title: 'היסטוריית פעילות',
        no_activity: 'טרם בוצעו פניות.',
        vertical_diamonds: 'יהלומים', vertical_cars: 'רכב', vertical_insurance: 'ביטוח',
        lead_appointment: 'פגישה', lead_contact: 'פנייה', lead_other: 'בקשה',
        status_new: 'חדשה', status_confirmed: 'מאושרת', status_contacted: 'טופלה', status_closed: 'סגורה',
    },
    en: {
        title: 'My Profile',
        greeting_male: 'Hello', greeting_female: 'Hello', greeting_neutral: 'Hello',
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
        save: 'Save', saving: 'Saving...', saved: 'Saved!',
        backoffice: 'Enter Back-Office',
        backoffice_sub: 'Manage products, users, promotions, distributions and surveys',
        logout: 'Log out',
        activity_title: 'Activity history',
        no_activity: 'No activity yet.',
        vertical_diamonds: 'Diamonds', vertical_cars: 'Cars', vertical_insurance: 'Insurance',
        lead_appointment: 'Appointment', lead_contact: 'Contact', lead_other: 'Request',
        status_new: 'New', status_confirmed: 'Confirmed', status_contacted: 'Handled', status_closed: 'Closed',
    },
    fr: {
        title: 'Mon Espace',
        greeting_male: 'Bonjour', greeting_female: 'Bonjour', greeting_neutral: 'Bonjour',
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
        activity_title: 'Historique d\'activité',
        no_activity: 'Aucune activité.',
        vertical_diamonds: 'Diamants', vertical_cars: 'Voitures', vertical_insurance: 'Assurance',
        lead_appointment: 'Rendez-vous', lead_contact: 'Contact', lead_other: 'Demande',
        status_new: 'Nouveau', status_confirmed: 'Confirmé', status_contacted: 'Traité', status_closed: 'Fermé',
    },
    yi: {
        title: 'מיין פּרופֿיל',
        greeting_male: 'ברוך הבא', greeting_female: 'ברוכה הבאה', greeting_neutral: 'שלום',
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
    },
};

// ─── Options (to be filled in with real values once confirmed) ───────────────
const CLUB_AFFILIATIONS: string[] = [
    'אגודת ישראל',
    'דגל התורה',
    'ש"ס',
    'עצמאי',
    'אחר',
];

const MEMBERSHIP_TRACKS: string[] = [
    'חינם',
    'פרמיום',
    'משפחתי',
    'VIP',
];

const VERTICAL_ICONS: Record<string, React.ReactNode> = {
    diamonds: <Gem size={15} className="text-[#d4af37]" />,
    cars: <Car size={15} className="text-[#d4af37]" />,
    insurance: <ShieldCheck size={15} className="text-[#d4af37]" />,
};

const COMPLETION_FIELDS = ['phone', 'gender', 'city', 'birth_year', 'id_number', 'club_affiliation', 'membership_track'];

function computeCompletion(user: any) {
    const missing = COMPLETION_FIELDS.filter((f) => !user?.[f]);
    const pct = Math.round(((COMPLETION_FIELDS.length - missing.length) / COMPLETION_FIELDS.length) * 100);
    return { pct, missing };
}

export function generateStaticParams() {
    return [{ locale: 'he' }, { locale: 'en' }, { locale: 'fr' }, { locale: 'yi' }];
}

export default function ProfilePage() {
    const params = useParams();
    const router = useRouter();
    const locale = (params?.locale as string) || 'he';
    const t = tr[locale] || tr.he;
    const { user, token, logout, login } = useAuth();

    const [form, setForm] = useState({
        phone: '', gender: '', city: '', birth_year: '',
        id_number: '', club_affiliation: '', membership_track: '',
    });
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [activity, setActivity] = useState<any[]>([]);
    const [activityLoading, setActivityLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        setForm({
            phone: user.phone || '',
            gender: user.gender || '',
            city: user.city || '',
            birth_year: user.birth_year ? String(user.birth_year) : '',
            id_number: user.id_number || '',
            club_affiliation: user.club_affiliation || '',
            membership_track: user.membership_track || '',
        });
    }, [user]);

    useEffect(() => {
        if (!token) return;
        getMyActivity(token).then(setActivity).finally(() => setActivityLoading(false));
    }, [token]);

    const { pct } = computeCompletion(user);

    const greeting = user?.gender === 'male' ? t.greeting_male
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
            if (form.phone) payload.phone = form.phone;
            if (form.gender) payload.gender = form.gender;
            if (form.city) payload.city = form.city;
            if (form.birth_year) payload.birth_year = Number(form.birth_year);
            if (form.id_number) payload.id_number = form.id_number;
            if (form.club_affiliation) payload.club_affiliation = form.club_affiliation;
            if (form.membership_track) payload.membership_track = form.membership_track;
            await updateUserProfile(token, payload);
            await login(token);
            setSaveState('saved');
            setTimeout(() => setSaveState('idle'), 2500);
        } catch {
            setSaveState('idle');
        }
    };

    const handleLogout = () => { logout(); router.push(`/${locale}/login`); };

    const barColor = pct === 100 ? 'bg-green-400' : pct >= 60 ? 'bg-[#d4af37]' : 'bg-orange-400';

    const verticalLabel = (v: string) =>
        v === 'diamonds' ? t.vertical_diamonds : v === 'cars' ? t.vertical_cars : t.vertical_insurance;
    const leadTypeLabel = (lt: string) =>
        lt === 'appointment' ? t.lead_appointment : lt === 'contact_request' ? t.lead_contact : t.lead_other;
    const statusLabel = (s: string) =>
        ({ new: t.status_new, confirmed: t.status_confirmed, contacted: t.status_contacted, closed: t.status_closed }[s] ?? s);
    const statusColor = (s: string) =>
        ({ new: 'text-[#f0e6d3]/60', confirmed: 'text-green-400', contacted: 'text-blue-400', closed: 'text-[#f0e6d3]/30' }[s] ?? 'text-[#f0e6d3]/60');

    // Group activity by vertical
    const grouped = activity.reduce((acc: Record<string, any[]>, item: any) => {
        const v = item.product_vertical || 'other';
        if (!acc[v]) acc[v] = [];
        acc[v].push(item);
        return acc;
    }, {});

    return (
        <main className="min-h-screen bg-[#111a2f] py-16 px-6">
            <div className="max-w-xl mx-auto space-y-6">

                {/* Avatar + greeting */}
                <div className="text-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-[#d4af37]/20 border-2 border-[#d4af37]/40 flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-black text-[#d4af37]">{initials}</span>
                    </div>
                    <h1 className="text-2xl font-black text-[#f0e6d3]">
                        {greeting}{user?.first_name ? `, ${user.first_name}` : ''}
                    </h1>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                        user?.role === 'admin' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'bg-[#0e1628] text-[#f0e6d3]/50'
                    }`}>
                        {user?.role === 'admin' ? t.role_admin : t.role_member}
                    </span>
                </div>

                {/* Profile completion bar */}
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
                            <CheckCircle2 size={13} /> הפרופיל שלך מלא לחלוטין
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

                {/* Editable fields */}
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-5 space-y-5">
                    <div>
                        <p className="font-black text-[#f0e6d3] text-sm mb-0.5">{t.complete_profile}</p>
                        <p className="text-xs text-[#f0e6d3]/40">{t.complete_sub}</p>
                    </div>

                    {/* Phone */}
                    <Field label={t.phone} icon={<Phone size={12} />}>
                        <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            className="input-field" placeholder="050-0000000" dir="ltr" />
                    </Field>

                    {/* ID number */}
                    <Field label={t.id_number} icon={<CreditCard size={12} />}>
                        <input type="text" value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })}
                            className="input-field" placeholder="000000000" dir="ltr" maxLength={9} />
                    </Field>

                    {/* Gender */}
                    <Field label={t.gender} icon={<User2 size={12} />}>
                        <div className="flex gap-3">
                            {(['male', 'female'] as const).map((g) => (
                                <button key={g} type="button" onClick={() => setForm({ ...form, gender: g })}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                        form.gender === g ? 'bg-[#d4af37] text-[#080d1f]' : 'bg-[#111a2f] text-[#f0e6d3]/70 hover:bg-[#1a2540]'
                                    }`}>
                                    {g === 'male' ? t.gender_male : t.gender_female}
                                </button>
                            ))}
                        </div>
                    </Field>

                    {/* City */}
                    <Field label={t.city} icon={<MapPin size={12} />}>
                        <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                            className="input-field" placeholder="ירושלים" />
                    </Field>

                    {/* Birth year */}
                    <Field label={t.birth_year} icon={<Calendar size={12} />}>
                        <input type="number" value={form.birth_year} onChange={(e) => setForm({ ...form, birth_year: e.target.value })}
                            className="input-field" placeholder="1985" min={1930} max={new Date().getFullYear() - 10} dir="ltr" />
                    </Field>

                    {/* Club affiliation */}
                    <Field label={t.club_affiliation} icon={<Building2 size={12} />}>
                        <select value={form.club_affiliation} onChange={(e) => setForm({ ...form, club_affiliation: e.target.value })}
                            className="input-field">
                            <option value="">{t.choose}</option>
                            {CLUB_AFFILIATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </Field>

                    {/* Membership track */}
                    <Field label={t.membership_track} icon={<ClipboardList size={12} />}>
                        <select value={form.membership_track} onChange={(e) => setForm({ ...form, membership_track: e.target.value })}
                            className="input-field">
                            <option value="">{t.choose}</option>
                            {MEMBERSHIP_TRACKS.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </Field>

                    <button onClick={handleSave} disabled={saveState === 'saving'}
                        className={`w-full py-3 rounded-xl font-black text-sm transition-all ${
                            saveState === 'saved'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-[#d4af37] text-[#080d1f] hover:bg-[#c9a227] disabled:opacity-60'
                        }`}>
                        {saveState === 'saving' ? t.saving : saveState === 'saved' ? `✓ ${t.saved}` : t.save}
                    </button>
                </div>

                {/* Activity history */}
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
                                        {VERTICAL_ICONS[vertical] ?? <Gem size={15} className="text-[#d4af37]" />}
                                        <span className="text-xs font-bold text-[#d4af37] uppercase tracking-wider">
                                            {verticalLabel(vertical)}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {(items as any[]).map((item) => (
                                            <div key={item.id} className="bg-[#111a2f] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[#f0e6d3] truncate">
                                                        {item.product_title_he || '—'}
                                                    </p>
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

                {/* Admin card */}
                {user?.role === 'admin' && (
                    <button onClick={() => router.push(`/${locale}/admin/products`)}
                        className="w-full bg-[#d4af37]/10 border border-[#d4af37]/40 hover:border-[#d4af37] hover:bg-[#d4af37]/20 transition-all rounded-2xl p-5 text-start group">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-[#d4af37]/20 flex items-center justify-center group-hover:bg-[#d4af37]/30 transition-colors">
                                <Settings size={20} className="text-[#d4af37]" />
                            </div>
                            <div>
                                <p className="font-black text-[#d4af37] text-sm">{t.backoffice}</p>
                                <p className="text-xs text-[#f0e6d3]/40 mt-0.5">{t.backoffice_sub}</p>
                            </div>
                        </div>
                    </button>
                )}

                {/* Logout */}
                <button onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 transition-all text-sm font-bold">
                    <LogOut size={15} /> {t.logout}
                </button>
            </div>
        </main>
    );
}

// ─── Small helper component ───────────────────────────────────────────────────
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
