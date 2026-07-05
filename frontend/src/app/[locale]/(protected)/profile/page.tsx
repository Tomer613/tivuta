'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { updateUserProfile } from '@/lib/api';
import { LogOut, Settings, Mail, Phone, MapPin, Calendar, User2, CheckCircle2 } from 'lucide-react';

const t: Record<string, Record<string, string>> = {
    he: {
        title: 'האזור האישי',
        greeting_male: 'ברוך הבא',
        greeting_female: 'ברוכה הבאה',
        greeting_neutral: 'שלום',
        role_member: 'חבר מועדון',
        role_admin: 'מנהל מערכת',
        profile_completion: 'השלמת פרופיל',
        complete_profile: 'השלם את הפרופיל שלך',
        complete_sub: 'פרטים נוספים עוזרים לנו להתאים לך את החוויה הטובה ביותר',
        phone: 'מספר טלפון',
        city: 'עיר מגורים',
        birth_year: 'שנת לידה',
        gender: 'מין',
        gender_male: 'זכר',
        gender_female: 'נקבה',
        save: 'שמור',
        saving: 'שומר...',
        saved: 'נשמר!',
        backoffice: 'כניסה לבק-אופיס',
        backoffice_sub: 'ניהול מוצרים, משתמשים, מבצעים, הפצות וסקרים',
        logout: 'התנתק',
        no_phone: 'לא הוזן',
        email_label: 'אימייל',
    },
    en: {
        title: 'My Profile',
        greeting_male: 'Welcome',
        greeting_female: 'Welcome',
        greeting_neutral: 'Hello',
        role_member: 'Club Member',
        role_admin: 'System Admin',
        profile_completion: 'Profile completion',
        complete_profile: 'Complete your profile',
        complete_sub: 'More details help us tailor the best experience for you',
        phone: 'Phone number',
        city: 'City',
        birth_year: 'Birth year',
        gender: 'Gender',
        gender_male: 'Male',
        gender_female: 'Female',
        save: 'Save',
        saving: 'Saving...',
        saved: 'Saved!',
        backoffice: 'Enter Back-Office',
        backoffice_sub: 'Manage products, users, promotions, distributions and surveys',
        logout: 'Log out',
        no_phone: 'Not provided',
        email_label: 'Email',
    },
    fr: {
        title: 'Mon Espace',
        greeting_male: 'Bonjour',
        greeting_female: 'Bonjour',
        greeting_neutral: 'Bonjour',
        role_member: 'Membre',
        role_admin: 'Administrateur',
        profile_completion: 'Complétion du profil',
        complete_profile: 'Complétez votre profil',
        complete_sub: 'Plus de détails nous aident à personnaliser votre expérience',
        phone: 'Téléphone',
        city: 'Ville',
        birth_year: 'Année de naissance',
        gender: 'Genre',
        gender_male: 'Homme',
        gender_female: 'Femme',
        save: 'Enregistrer',
        saving: 'Enregistrement...',
        saved: 'Enregistré !',
        backoffice: 'Accès Back-Office',
        backoffice_sub: 'Gérer les produits, utilisateurs, promotions et enquêtes',
        logout: 'Se déconnecter',
        no_phone: 'Non renseigné',
        email_label: 'E-mail',
    },
    yi: {
        title: 'מיין פּרופֿיל',
        greeting_male: 'ברוך הבא',
        greeting_female: 'ברוכה הבאה',
        greeting_neutral: 'שלום',
        role_member: 'קלוב מיטגליד',
        role_admin: 'סיסטעם פאַרוואַלטער',
        profile_completion: 'פּרופֿיל פֿאַרענדיקונג',
        complete_profile: 'פֿאַרענדיקט דעם פּרופֿיל',
        complete_sub: 'מער פּרטים העלפֿן אונדז צוצופּאַסן דיין דערפֿאַרונג',
        phone: 'טעלעפֿאָן',
        city: 'שטאָט',
        birth_year: 'געבורטסיאָר',
        gender: 'מין',
        gender_male: 'זכר',
        gender_female: 'נקבה',
        save: 'אָפּשפּאַרן',
        saving: 'שפּאַרן...',
        saved: 'אָפּגעשפּאַרט!',
        backoffice: 'אריין אין בעק-אָפיס',
        backoffice_sub: 'פאַרוואַלטן פּראָדוקטן, באניצערס, מבצעים',
        logout: 'אויסלאָגן',
        no_phone: 'ניט אריינגעגעבן',
        email_label: 'עמעיל',
    },
};

export function generateStaticParams() {
    return [{ locale: 'he' }, { locale: 'en' }, { locale: 'fr' }, { locale: 'yi' }];
}

function computeCompletion(user: any): { pct: number; missing: string[] } {
    const fields = ['phone', 'gender', 'city', 'birth_year'];
    const missing = fields.filter((f) => !user?.[f]);
    const filled = fields.length - missing.length;
    return { pct: Math.round((filled / fields.length) * 100), missing };
}

export default function ProfilePage() {
    const params = useParams();
    const router = useRouter();
    const locale = (params?.locale as string) || 'he';
    const tr = t[locale] || t.he;
    const { user, token, logout, login } = useAuth();

    const [form, setForm] = useState({
        phone: user?.phone || '',
        gender: user?.gender || '',
        city: user?.city || '',
        birth_year: user?.birth_year ? String(user.birth_year) : '',
    });
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

    useEffect(() => {
        setForm({
            phone: user?.phone || '',
            gender: user?.gender || '',
            city: user?.city || '',
            birth_year: user?.birth_year ? String(user.birth_year) : '',
        });
    }, [user]);

    const { pct, missing } = computeCompletion(user);

    const greeting = user?.gender === 'male'
        ? tr.greeting_male
        : user?.gender === 'female'
            ? tr.greeting_female
            : tr.greeting_neutral;

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
            await updateUserProfile(token, payload);
            // Re-fetch user via login re-validation trick: call /users/me
            await login(token);
            setSaveState('saved');
            setTimeout(() => setSaveState('idle'), 2000);
        } catch {
            setSaveState('idle');
        }
    };

    const handleLogout = () => {
        logout();
        router.push(`/${locale}/login`);
    };

    const barColor = pct === 100 ? 'bg-green-400' : pct >= 50 ? 'bg-[#d4af37]' : 'bg-orange-400';

    return (
        <main className="min-h-screen bg-[#111a2f] py-16 px-6">
            <div className="max-w-xl mx-auto space-y-6">

                {/* Avatar + greeting */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-[#d4af37]/20 border-2 border-[#d4af37]/40 flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-black text-[#d4af37]">{initials}</span>
                    </div>
                    <h1 className="text-2xl font-black text-[#f0e6d3]">
                        {greeting}{user?.first_name ? `, ${user.first_name}` : ''}
                    </h1>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                        user?.role === 'admin' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'bg-[#0e1628] text-[#f0e6d3]/50'
                    }`}>
                        {user?.role === 'admin' ? tr.role_admin : tr.role_member}
                    </span>
                </div>

                {/* Profile completion bar */}
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#f0e6d3]/60 uppercase tracking-wider">{tr.profile_completion}</span>
                        <span className={`text-sm font-black ${pct === 100 ? 'text-green-400' : 'text-[#d4af37]'}`}>{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#111a2f] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    {pct === 100 && (
                        <div className="flex items-center gap-1.5 mt-2 text-green-400 text-xs font-bold">
                            <CheckCircle2 size={13} /> הפרופיל שלך מלא לחלוטין
                        </div>
                    )}
                </div>

                {/* Static info — email */}
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-5">
                    <div className="flex items-center gap-3 text-[#f0e6d3]">
                        <Mail size={17} className="text-[#d4af37]/60 shrink-0" />
                        <div>
                            <p className="text-xs text-[#f0e6d3]/40 mb-0.5">{tr.email_label}</p>
                            <p className="text-sm font-semibold">{user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Editable profile fields */}
                <div className="bg-[#0e1628] border border-[missing.length > 0 ? '#d4af37' : '#d4af37']/20 rounded-2xl p-5 space-y-5">
                    {missing.length > 0 && (
                        <div className="mb-1">
                            <p className="font-black text-[#f0e6d3] text-sm">{tr.complete_profile}</p>
                            <p className="text-xs text-[#f0e6d3]/40 mt-0.5">{tr.complete_sub}</p>
                        </div>
                    )}

                    {/* Phone */}
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-[#f0e6d3]/50 uppercase tracking-wider mb-2">
                            <Phone size={12} /> {tr.phone}
                        </label>
                        <input
                            type="tel"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-sm text-[#f0e6d3] outline-none focus:ring-1 focus:ring-[#d4af37]/40"
                            placeholder="050-0000000"
                            dir="ltr"
                        />
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-[#f0e6d3]/50 uppercase tracking-wider mb-2">
                            <User2 size={12} /> {tr.gender}
                        </label>
                        <div className="flex gap-3">
                            {(['male', 'female'] as const).map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => setForm({ ...form, gender: g })}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                        form.gender === g
                                            ? 'bg-[#d4af37] text-[#080d1f]'
                                            : 'bg-[#111a2f] text-[#f0e6d3]/70 hover:bg-[#111a2f]/80'
                                    }`}
                                >
                                    {g === 'male' ? tr.gender_male : tr.gender_female}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* City */}
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-[#f0e6d3]/50 uppercase tracking-wider mb-2">
                            <MapPin size={12} /> {tr.city}
                        </label>
                        <input
                            type="text"
                            value={form.city}
                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                            className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-sm text-[#f0e6d3] outline-none focus:ring-1 focus:ring-[#d4af37]/40"
                            placeholder="ירושלים"
                        />
                    </div>

                    {/* Birth year */}
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-[#f0e6d3]/50 uppercase tracking-wider mb-2">
                            <Calendar size={12} /> {tr.birth_year}
                        </label>
                        <input
                            type="number"
                            value={form.birth_year}
                            onChange={(e) => setForm({ ...form, birth_year: e.target.value })}
                            className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-sm text-[#f0e6d3] outline-none focus:ring-1 focus:ring-[#d4af37]/40"
                            placeholder="1985"
                            min={1930}
                            max={new Date().getFullYear() - 10}
                            dir="ltr"
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saveState === 'saving'}
                        className={`w-full py-3 rounded-xl font-black text-sm transition-all ${
                            saveState === 'saved'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-[#d4af37] text-[#080d1f] hover:bg-[#c9a227]'
                        }`}
                    >
                        {saveState === 'saving' ? tr.saving : saveState === 'saved' ? `✓ ${tr.saved}` : tr.save}
                    </button>
                </div>

                {/* Admin back-office card */}
                {user?.role === 'admin' && (
                    <button
                        onClick={() => router.push(`/${locale}/admin/products`)}
                        className="w-full bg-[#d4af37]/10 border border-[#d4af37]/40 hover:border-[#d4af37] hover:bg-[#d4af37]/20 transition-all rounded-2xl p-5 text-start group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-[#d4af37]/20 flex items-center justify-center group-hover:bg-[#d4af37]/30 transition-colors">
                                <Settings size={20} className="text-[#d4af37]" />
                            </div>
                            <div>
                                <p className="font-black text-[#d4af37] text-sm">{tr.backoffice}</p>
                                <p className="text-xs text-[#f0e6d3]/40 mt-0.5">{tr.backoffice_sub}</p>
                            </div>
                        </div>
                    </button>
                )}

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 transition-all text-sm font-bold"
                >
                    <LogOut size={15} />
                    {tr.logout}
                </button>
            </div>
        </main>
    );
}
