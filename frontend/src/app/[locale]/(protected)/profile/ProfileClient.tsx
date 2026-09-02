'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, User } from '@/context/AuthContext';
import {
    updateUserProfile, getMyActivity, changePassword, getFavorites, removeFavorite, getMyAppointments, getMyOrders, getMyCustomerOrders, updateNotificationPrefs, updatePreferredLanguage, productImageUrl,
    getMyPointsHistory, createCardOrder, registerGabbai, getShoppingList, getProducts, PointsLedgerEntry, ShippingAddress, MyOrder, RecentlyViewedProduct, GabbaiRegistrationPayload,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/getErrorMessage';
import {
    LogOut, Mail, Phone, MapPin, Calendar, User2,
    CheckCircle2, CreditCard, Building2, ClipboardList, ChevronDown, KeyRound, Eye, EyeOff, Heart, X, Clock, History, Bell, ShoppingBag,
    Copy, Gift, Package, Send, Loader2, Languages, Users, Pencil, MessageCircleQuestion, ListChecks, RotateCcw,
} from 'lucide-react';
import SavingsCalculator from '@/components/SavingsCalculator';
import { useVerticals } from '@/lib/useVerticals';
import { getVerticalIcon } from '@/lib/verticalIcons';
import { useOutsideClick } from '@/lib/useOutsideClick';
import { swapLocaleInPath, markManualLocaleOverride } from '@/lib/localePreference';
import { useCart } from '@/context/CartContext';

// ─── Translations ─────────────────────────────────────────────────────────────
const tr: Record<string, Record<string, string>> = {
    he: {
        title: 'האזור האישי',
        greeting_male: 'ברוך הבא', greeting_female: 'ברוכה הבאה', greeting_neutral: 'ברוכים הבאים',
        role_member: 'חבר מועדון', role_admin: 'מנהל מערכת', role_gabbai: 'גבאי',
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
        orders_title: 'מעקב הזמנות',
        orders_personal_title: 'הזמנות אישיות',
        orders_gabbai_title: 'הזמנות כגבאי',
        no_orders: 'אין הזמנות עדיין.',
        order_status_new: 'בבדיקה', order_status_awaiting_customer: 'ממתינה לאישורך', order_status_customer_confirmed: 'אושרה סופית', order_status_cancelled: 'בוטלה',
        ask_about_order: 'שאל שאלה על ההזמנה',
        reorder: 'הזמן שוב', reordering: 'מוסיף לסל...', reorder_unavailable: 'הפריטים בהזמנה זו כבר לא זמינים',
        order_items_done: 'הושלמו',
        order_savings: 'חסכת',
        shopping_lists_title: 'רשימות קניות',
        shopping_list_items_label: 'פריטים',
        open_shopping_list: 'פתח',
        gabbai_section_title: 'רישום כגבאי',
        gabbai_register_cta: 'הרשמה כגבאי',
        gabbai_register_sub: 'גבאי בית כנסת יכול להזמין קידושים ודברים לבית הכנסת בשם הקהילה. מלא/י את הפרטים כדי להתחיל.',
        gabbai_community_name: 'שם הקהילה',
        gabbai_synagogue_address: 'כתובת בית הכנסת',
        gabbai_contact_name: 'איש קשר נוסף (שם, אופציונלי)',
        gabbai_contact_phone: 'איש קשר נוסף (טלפון, אופציונלי)',
        gabbai_submit: 'שמור',
        gabbai_cancel: 'ביטול',
        gabbai_registered_status: 'רשום/ה כגבאי ✓',
        gabbai_edit: 'עריכת פרטים',
        gabbai_error: 'שגיאה בשמירת הפרטים',
        activity_title: 'היסטוריית פעילות',
        no_activity: 'טרם בוצעו פניות.',
        lead_appointment: 'פגישה', lead_contact: 'פנייה', lead_other: 'בקשה', lead_card_order: 'הזמנת כרטיס',
        status_new: 'חדשה', status_confirmed: 'מאושרת', status_contacted: 'טופלה', status_closed: 'סגורה',
        completed_section: 'פרטים שמולאו', missing_section: 'פרטים חסרים',
        profile_full: 'הפרופיל שלך מלא לחלוטין',
        filled_will_appear: 'הפרטים שתמלא יופיעו כאן',
    },
    en: {
        title: 'My Profile',
        greeting_male: 'Hello', greeting_female: 'Hello', greeting_neutral: 'Welcome',
        role_member: 'Club Member', role_admin: 'System Admin', role_gabbai: 'Gabbai',
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
        orders_title: 'Order Tracking',
        orders_personal_title: 'Personal orders',
        orders_gabbai_title: 'Gabbai orders',
        no_orders: 'No orders yet.',
        order_status_new: 'In review', order_status_awaiting_customer: 'Awaiting your confirmation', order_status_customer_confirmed: 'Confirmed', order_status_cancelled: 'Cancelled',
        ask_about_order: 'Ask about this order',
        reorder: 'Order again', reordering: 'Adding to cart...', reorder_unavailable: 'The items in this order are no longer available',
        order_items_done: 'done',
        order_savings: 'You saved',
        shopping_lists_title: 'Shopping Lists',
        shopping_list_items_label: 'items',
        open_shopping_list: 'Open',
        gabbai_section_title: 'Gabbai registration',
        gabbai_register_cta: 'Register as gabbai',
        gabbai_register_sub: 'A synagogue gabbai can order kiddush items and synagogue supplies on behalf of their community. Fill in the details to get started.',
        gabbai_community_name: 'Community name',
        gabbai_synagogue_address: 'Synagogue address',
        gabbai_contact_name: 'Additional contact (name, optional)',
        gabbai_contact_phone: 'Additional contact (phone, optional)',
        gabbai_submit: 'Save',
        gabbai_cancel: 'Cancel',
        gabbai_registered_status: 'Registered as gabbai ✓',
        gabbai_edit: 'Edit details',
        gabbai_error: 'Failed to save details',
        activity_title: 'Activity history',
        no_activity: 'No activity yet.',
        lead_appointment: 'Appointment', lead_contact: 'Contact', lead_other: 'Request', lead_card_order: 'Card Order',
        status_new: 'New', status_confirmed: 'Confirmed', status_contacted: 'Handled', status_closed: 'Closed',
        completed_section: 'Completed details', missing_section: 'Missing details',
        profile_full: 'Your profile is complete!',
        filled_will_appear: 'Details you fill in will appear here',
    },
    fr: {
        title: 'Mon Espace',
        greeting_male: 'Bonjour', greeting_female: 'Bonjour', greeting_neutral: 'Bienvenue',
        role_member: 'Membre', role_admin: 'Administrateur', role_gabbai: 'Gabbaï',
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
        orders_title: 'Suivi des commandes',
        orders_personal_title: 'Commandes personnelles',
        orders_gabbai_title: 'Commandes en tant que gabbaï',
        no_orders: 'Aucune commande.',
        order_status_new: 'En cours de vérification', order_status_awaiting_customer: 'En attente de votre confirmation', order_status_customer_confirmed: 'Confirmée', order_status_cancelled: 'Annulée',
        ask_about_order: 'Poser une question sur cette commande',
        reorder: 'Commander à nouveau', reordering: 'Ajout au panier...', reorder_unavailable: "Les articles de cette commande ne sont plus disponibles",
        order_items_done: 'terminés',
        order_savings: 'Économisé',
        shopping_lists_title: 'Listes de courses',
        shopping_list_items_label: 'articles',
        open_shopping_list: 'Ouvrir',
        gabbai_section_title: 'Inscription en tant que gabbaï',
        gabbai_register_cta: "S'inscrire comme gabbaï",
        gabbai_register_sub: 'Un gabbaï de synagogue peut commander des articles de kiddouch et de synagogue au nom de sa communauté. Remplissez les détails pour commencer.',
        gabbai_community_name: 'Nom de la communauté',
        gabbai_synagogue_address: 'Adresse de la synagogue',
        gabbai_contact_name: 'Contact supplémentaire (nom, optionnel)',
        gabbai_contact_phone: 'Contact supplémentaire (téléphone, optionnel)',
        gabbai_submit: 'Enregistrer',
        gabbai_cancel: 'Annuler',
        gabbai_registered_status: 'Inscrit comme gabbaï ✓',
        gabbai_edit: 'Modifier les détails',
        gabbai_error: "Échec de l'enregistrement des détails",
        activity_title: "Historique d'activité",
        no_activity: 'Aucune activité.',
        lead_appointment: 'Rendez-vous', lead_contact: 'Contact', lead_other: 'Demande', lead_card_order: 'Commande de carte',
        status_new: 'Nouveau', status_confirmed: 'Confirmé', status_contacted: 'Traité', status_closed: 'Fermé',
        completed_section: 'Détails complétés', missing_section: 'Détails manquants',
        profile_full: 'Votre profil est complet !',
        filled_will_appear: 'Les détails que vous remplirez apparaîtront ici',
    },
    yi: {
        title: 'מיין פּרופֿיל',
        greeting_male: 'ברוך הבא', greeting_female: 'ברוכה הבאה', greeting_neutral: 'ברוכים הבאים',
        role_member: 'קלוב מיטגליד', role_admin: 'סיסטעם פאַרוואַלטער', role_gabbai: 'גבאי',
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
        orders_title: 'מעקב הזמנות',
        orders_personal_title: 'פּערזענלעכע הזמנות',
        orders_gabbai_title: 'הזמנות אלס גבאי',
        no_orders: 'קיין הזמנות נאָך ניט.',
        order_status_new: 'אין דורכזיכט', order_status_awaiting_customer: 'ווארט אויף אײַער באשטעטיקונג', order_status_customer_confirmed: 'באשטעטיגט', order_status_cancelled: 'אָפּגעזאָגט',
        ask_about_order: 'שטעלט א פראגע וועגן דער בעשטעלונג',
        reorder: 'באשטעלן נאכאמאל', reordering: 'לייגט צו קארב...', reorder_unavailable: 'די פריטים אין דער הזמנה זענען שוין נישט פאראן',
        order_items_done: 'פֿאַרטיק',
        order_savings: 'געשפּאָרט',
        shopping_lists_title: 'קוילע רשימות',
        shopping_list_items_label: 'פריטים',
        open_shopping_list: 'עפֿן',
        gabbai_section_title: 'רעגיסטראציע אלס גבאי',
        gabbai_register_cta: 'רעגיסטרירן זיך אלס גבאי',
        gabbai_register_sub: 'א שיל גבאי קען באשטעלן קידוש זאכן און שיל צרכים אין נאמען פון דער קהילה. פֿילט אויס די פרטים צו אנהייבן.',
        gabbai_community_name: 'נאמען פון דער קהילה',
        gabbai_synagogue_address: 'אדרעס פון דער שיל',
        gabbai_contact_name: 'נאך א קאנטאקט (נאמען, אויסוואל)',
        gabbai_contact_phone: 'נאך א קאנטאקט (טעלעפֿאָן, אויסוואל)',
        gabbai_submit: 'אָפּשפּאַרן',
        gabbai_cancel: 'אָפּזאָגן',
        gabbai_registered_status: 'רעגיסטרירט אלס גבאי ✓',
        gabbai_edit: 'ענדערן פרטים',
        gabbai_error: 'טעות ביי אָפּשפּאַרן',
        activity_title: 'פּעולה היסטאָריע',
        no_activity: 'קיין פּעולות נאָך ניט.',
        lead_appointment: 'פּגישה', lead_contact: 'פּנייה', lead_other: 'בקשה', lead_card_order: 'הזמנת כרטיס',
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

const COMPLETION_FIELDS: (keyof User)[] = ['phone', 'gender', 'city', 'birth_year', 'id_number', 'club_affiliation', 'membership_tracks'];

function computeCompletion(user: User | null) {
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

    useOutsideClick(ref, () => setOpen(false), { escape: false });

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

// ─── Local shapes for endpoints this file doesn't already have a typed import for ──────────────
interface ActivityLead {
    id: number;
    lead_type: string;
    product_vertical?: string | null;
    product_title_he?: string | null;
    status: string;
    created_at: string;
}

interface FavoriteEntry {
    id: number;
    product_id: number;
    product?: { image_url?: string | null; title_he: string; price?: number | null } | null;
}

interface AppointmentLead {
    id: number;
    scheduled_at: string;
    status: string;
}

interface LegacyOrder {
    id: number;
    title_he: string;
    date: string;
    amount: number;
    status: string;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProfileClient() {
    const params = useParams();
    const router = useRouter();
    const locale = (params?.locale as string) || 'he';
    const t = tr[locale] || tr.he;
    const { user, token, logout, login } = useAuth();
    const verticals = useVerticals();
    const { addToCart } = useCart();
    const [reorderingId, setReorderingId] = useState<number | null>(null);
    const [reorderError, setReorderError] = useState<{ orderId: number; message: string } | null>(null);

    const [form, setForm] = useState({
        phone: '', gender: '', city: '', birth_year: '',
        id_number: '', club_affiliation: '', membership_tracks: [] as string[],
    });
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [activity, setActivity] = useState<ActivityLead[]>([]);
    const [activityLoading, setActivityLoading] = useState(true);
    const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
    const [removingFavId, setRemovingFavId] = useState<number | null>(null);
    const [appointments, setAppointments] = useState<AppointmentLead[]>([]);
    const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>([]);
    const [orders, setOrders] = useState<LegacyOrder[]>([]);
    const [myOrders, setMyOrders] = useState<MyOrder[]>([]);
    // Arriving via the campaign email's unsubscribe link (#notification-preferences) should land
    // on an already-expanded section, not a collapsed one the recipient has to go find and click.
    const [showNotifPrefs, setShowNotifPrefs] = useState(
        () => typeof window !== 'undefined' && window.location.hash === '#notification-preferences'
    );
    const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({ lead_status: true, appointment_reminder: true, system: true, promotions: true });
    const [notifSaving, setNotifSaving] = useState(false);
    const [langSaving, setLangSaving] = useState(false);
    const [langError, setLangError] = useState('');
    const [showCalculator, setShowCalculator] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [pwState, setPwState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [pwError, setPwError] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNext, setShowNext] = useState(false);
    const [pointsHistory, setPointsHistory] = useState<PointsLedgerEntry[]>([]);
    const [showPointsHistory, setShowPointsHistory] = useState(false);
    const [copiedCustomerNumber, setCopiedCustomerNumber] = useState(false);
    const [showCardOrderForm, setShowCardOrderForm] = useState(false);
    const [cardOrderForm, setCardOrderForm] = useState<ShippingAddress>({ full_name: '', street: '', city: '', zip_code: '', phone: '' });
    const [cardOrderState, setCardOrderState] = useState<'idle' | 'submitting' | 'error'>('idle');
    const [cardOrderError, setCardOrderError] = useState('');
    const [cardOrderLeadOverride, setCardOrderLeadOverride] = useState<ActivityLead | null>(null);
    const [showGabbaiForm, setShowGabbaiForm] = useState(false);
    const [gabbaiForm, setGabbaiForm] = useState<GabbaiRegistrationPayload>({ community_name: '', synagogue_address: '', contact_name: '', contact_phone: '' });
    const [gabbaiState, setGabbaiState] = useState<'idle' | 'submitting' | 'error'>('idle');
    const [gabbaiError, setGabbaiError] = useState('');
    const [shoppingListCounts, setShoppingListCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        if (typeof window === 'undefined' || !window.location.hash) return;
        const el = document.getElementById(window.location.hash.slice(1));
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    useEffect(() => {
        if (!user) return;
        Promise.resolve().then(() => setForm({
            phone: user.phone || '',
            gender: user.gender || '',
            city: user.city || '',
            birth_year: user.birth_year ? String(user.birth_year) : '',
            id_number: user.id_number || '',
            club_affiliation: user.club_affiliation || '',
            membership_tracks: user.membership_tracks || [],
        }));
    }, [user]);

    useEffect(() => {
        if (!token) return;
        getMyActivity(token).then(setActivity).finally(() => setActivityLoading(false));
        getFavorites(token).then(setFavorites).catch(() => {});
        getMyAppointments(token).then(setAppointments).catch(() => {});
        getMyOrders(token).then(setOrders).catch(() => {});
        getMyCustomerOrders(token).then(setMyOrders).catch(() => {});
        getMyPointsHistory(token).then(setPointsHistory).catch(() => {});
        try {
            const raw = localStorage.getItem('tivuta_recent_v2');
            if (raw) Promise.resolve().then(() => setRecentlyViewed(JSON.parse(raw)));
        } catch { /* ignore */ }
    }, [token]);

    // Separate from the effect above since `verticals` (needed to know which worlds have
    // enables_shopping_list) resolves asynchronously after mount via useVerticals(), not at the
    // same time as `token`.
    useEffect(() => {
        if (!token) return;
        const shoppingListVerticals = verticals.filter((v) => v.enables_shopping_list);
        if (shoppingListVerticals.length === 0) return;
        Promise.all(shoppingListVerticals.map((v) =>
            getShoppingList(token, v.slug).then((items) => [v.slug, items.length] as const).catch(() => [v.slug, 0] as const)
        )).then((entries) => setShoppingListCounts(Object.fromEntries(entries)));
    }, [token, verticals]);

    useEffect(() => {
        if (!user) return;
        Promise.resolve().then(() => setCardOrderForm((f) => ({ ...f, full_name: f.full_name || `${user.first_name} ${user.last_name}`.trim(), phone: f.phone || user.phone || '' })));
    }, [user]);

    useEffect(() => {
        if (!user || user.role !== 'gabbai') return;
        Promise.resolve().then(() => setGabbaiForm({
            community_name: user.gabbai_community_name || '',
            synagogue_address: user.gabbai_synagogue_address || '',
            contact_name: user.gabbai_contact_name || '',
            contact_phone: user.gabbai_contact_phone || '',
        }));
    }, [user]);

    useEffect(() => {
        if (user?.notification_prefs) Promise.resolve().then(() => setNotifPrefs({ lead_status: true, appointment_reminder: true, system: true, promotions: true, ...user.notification_prefs }));
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
        const v = user?.[f as keyof User];
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
            const payload: Record<string, unknown> = {};
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

    const handleCopyCustomerNumber = () => {
        if (!user?.customer_number) return;
        navigator.clipboard?.writeText(user.customer_number).then(() => {
            setCopiedCustomerNumber(true);
            setTimeout(() => setCopiedCustomerNumber(false), 2000);
        });
    };

    const handleSubmitCardOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        setCardOrderState('submitting');
        setCardOrderError('');
        try {
            const lead = await createCardOrder(token, cardOrderForm, locale);
            setCardOrderLeadOverride(lead);
            setShowCardOrderForm(false);
            setCardOrderState('idle');
        } catch (err) {
            setCardOrderError(getErrorMessage(err, locale === 'he' ? 'שגיאה בשליחת הבקשה' : 'Failed to submit request'));
            setCardOrderState('error');
        }
    };

    const handleSubmitGabbai = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        setGabbaiState('submitting');
        setGabbaiError('');
        try {
            await registerGabbai(token, gabbaiForm);
            await login(token);
            setShowGabbaiForm(false);
            setGabbaiState('idle');
        } catch (err) {
            setGabbaiError(getErrorMessage(err, t.gabbai_error));
            setGabbaiState('error');
        }
    };

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
        } catch (e) {
            setPwError(getErrorMessage(e, 'שגיאה'));
            setPwState('error');
        }
    };

    const barColor = pct === 100 ? 'bg-green-400' : pct >= 60 ? 'bg-[#d4af37]' : 'bg-orange-400';

    const localeKey = locale as 'he' | 'en' | 'fr' | 'yi';
    const verticalLabel = (v: string) => {
        const meta = verticals.find((x) => x.slug === v);
        return (meta && (meta[`label_${localeKey}`] || meta.label_he)) || v;
    };
    const leadTypeLabel = (lt: string) =>
        lt === 'appointment' ? t.lead_appointment : lt === 'contact_request' ? t.lead_contact : lt === 'card_order' ? t.lead_card_order : t.lead_other;
    const statusLabel = (s: string) =>
        ({ new: t.status_new, confirmed: t.status_confirmed, contacted: t.status_contacted, closed: t.status_closed }[s] ?? s);
    const statusColor = (s: string) =>
        ({ new: 'text-[#f0e6d3]/60', confirmed: 'text-green-400', contacted: 'text-blue-400', closed: 'text-[#f0e6d3]/30' }[s] ?? 'text-[#f0e6d3]/60');
    const orderStatusLabel = (s?: string) =>
        ({ new: t.order_status_new, awaiting_customer: t.order_status_awaiting_customer, customer_confirmed: t.order_status_customer_confirmed, cancelled: t.order_status_cancelled }[s || 'new'] ?? s);
    const orderStatusColor = (s?: string) =>
        ({ new: 'bg-[#111a2f] text-[#f0e6d3]/50', awaiting_customer: 'bg-[#d4af37]/20 text-[#d4af37]', customer_confirmed: 'bg-green-500/20 text-green-400', cancelled: 'bg-[#111a2f] text-[#f0e6d3]/30' }[s || 'new'] ?? 'bg-[#111a2f] text-[#f0e6d3]/50');

    const marketplaceActivity = activity.filter((item) => item.lead_type !== 'card_order');
    const cardOrderLead = cardOrderLeadOverride || activity.find((item) => item.lead_type === 'card_order') || null;

    // Orders are split by the "hat" they were placed under (see Vertical.requires_gabbai) — an
    // order placed as a gabbai never shows among personal orders and vice versa. Only rendered as
    // two groups once there's at least one gabbai order to show; otherwise the flat list below is
    // unchanged from before this feature existed.
    const gabbaiOrders = myOrders.filter((o) => o.orderer_role === 'gabbai');
    const personalOrders = myOrders.filter((o) => o.orderer_role !== 'gabbai');

    // "Reorder" pulls CURRENT product data (price/sale price/etc.), not the order's old price
    // snapshot — a reorder should reflect what the item costs today, exactly like adding it fresh
    // from the world listing would. Only contact_request lines are reorderable (an order is
    // homogeneous in lead_type — see leads.py — so appointment/card_order orders never show this
    // button at all); a product that's since been deleted/deactivated is silently skipped rather
    // than blocking the rest of the order from being re-added.
    const handleReorder = async (order: MyOrder) => {
        if (!token) return;
        const reorderableItems = order.items.filter((i) => i.lead_type === 'contact_request' && i.product_id != null);
        if (reorderableItems.length === 0) return;
        setReorderingId(order.id);
        setReorderError((prev) => (prev?.orderId === order.id ? null : prev));
        try {
            const verticalSlugs = Array.from(new Set(reorderableItems.map((i) => i.product_vertical).filter(Boolean))) as string[];
            const productLists = await Promise.all(verticalSlugs.map((v) => getProducts(token, v)));
            const productsById = new Map(productLists.flat().map((p) => [p.id, p]));

            let addedCount = 0;
            for (const item of reorderableItems) {
                const product = productsById.get(item.product_id!);
                if (!product) continue;
                addToCart({
                    id: product.id,
                    vertical: product.vertical,
                    title_he: product.title_he,
                    title_en: product.title_en,
                    title_fr: product.title_fr,
                    title_yi: product.title_yi,
                    image_url: product.image_url,
                    price: product.price,
                    sale_price: product.sale_price,
                    quantity_discount_bundle_id: product.quantity_discount_bundle_id,
                    quantity_discount_tiers: product.quantity_discount?.tiers ?? null,
                }, item.quantity ?? 1);
                addedCount++;
            }

            if (addedCount === 0) {
                setReorderError({ orderId: order.id, message: t.reorder_unavailable });
                setReorderingId(null);
                return;
            }
            router.push(`/${locale}/cart`);
        } catch {
            setReorderError({ orderId: order.id, message: t.reorder_unavailable });
            setReorderingId(null);
        }
    };

    const renderOrderCard = (order: MyOrder) => {
        const doneCount = order.items.filter((i) => i.status === 'closed').length;
        const canReorder = order.items.some((i) => i.lead_type === 'contact_request' && i.product_id != null);
        return (
            <div key={order.id} className="bg-[#111a2f] rounded-xl px-4 py-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-[#d4af37]" dir="ltr">{order.order_number}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${orderStatusColor(order.status)}`}>
                            {orderStatusLabel(order.status)}
                        </span>
                    </div>
                    <span className="text-xs text-[#f0e6d3]/40">
                        {new Date(order.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </span>
                </div>
                {order.orderer_role === 'gabbai' && order.gabbai_community_name_snapshot && (
                    <p className="text-xs text-[#d4af37]/60 mb-1.5 flex items-center gap-1"><Users size={11} /> {order.gabbai_community_name_snapshot}</p>
                )}
                {order.items.length > 1 && (
                    <p className="text-xs text-[#f0e6d3]/40 mb-2">
                        {doneCount} / {order.items.length} {t.order_items_done}
                    </p>
                )}
                <div className="space-y-1.5">
                    {order.items.map((item) => {
                        const hasSavings = item.unit_price_snapshot != null && item.list_price_snapshot != null && item.unit_price_snapshot < item.list_price_snapshot;
                        return (
                        <div key={item.id} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm text-[#f0e6d3] truncate">
                                    {item.product_title_he || leadTypeLabel(item.lead_type)}
                                    {item.quantity && item.quantity > 1 ? ` ×${item.quantity}` : ''}
                                </p>
                                <p className="text-xs text-[#f0e6d3]/40">
                                    {leadTypeLabel(item.lead_type)}
                                    {item.unit_price_snapshot != null && ` · ₪${item.unit_price_snapshot.toLocaleString()}`}
                                </p>
                                {hasSavings && (
                                    <p className="text-[11px] text-green-400/80">
                                        {t.order_savings} ₪{Math.round(((item.list_price_snapshot ?? 0) - (item.unit_price_snapshot ?? 0)) * (item.quantity ?? 1)).toLocaleString()}
                                    </p>
                                )}
                            </div>
                            <span className={`text-xs font-bold shrink-0 ${statusColor(item.status)}`}>
                                {statusLabel(item.status)}
                            </span>
                        </div>
                        );
                    })}
                </div>
                {order.custom_items_note && (
                    <p className="text-xs text-[#d4af37]/70 bg-[#0e1628] rounded-lg px-3 py-2 mt-2">{order.custom_items_note}</p>
                )}
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 mt-2">
                    {canReorder && (
                        <button
                            type="button"
                            onClick={() => handleReorder(order)}
                            disabled={reorderingId === order.id}
                            className="flex items-center gap-1.5 text-xs font-bold text-[#d4af37]/80 hover:text-[#d4af37] transition-colors disabled:opacity-60"
                        >
                            {reorderingId === order.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                            {reorderingId === order.id ? t.reordering : t.reorder}
                        </button>
                    )}
                    <Link
                        href={`/${locale}/contact?order=${order.id}`}
                        className="flex items-center gap-1.5 text-xs text-[#d4af37]/60 hover:text-[#d4af37] transition-colors"
                    >
                        <MessageCircleQuestion size={12} /> {t.ask_about_order}
                    </Link>
                </div>
                {reorderError?.orderId === order.id && (
                    <p className="text-[11px] text-red-400/80 mt-1.5">{reorderError.message}</p>
                )}
            </div>
        );
    };

    const grouped = marketplaceActivity.reduce((acc: Record<string, ActivityLead[]>, item) => {
        const v = item.product_vertical || 'other';
        if (!acc[v]) acc[v] = [];
        acc[v].push(item);
        return acc;
    }, {} as Record<string, ActivityLead[]>);

    const VERTICAL_ICON = (v: string) => {
        const Icon = getVerticalIcon(verticals.find((x) => x.slug === v)?.icon || 'Store');
        return <Icon size={15} className="text-[#d4af37]" />;
    };

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
                                user?.role === 'admin' || user?.role === 'gabbai' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'bg-[#0e1628] text-[#f0e6d3]/50'
                            }`}>
                                {user?.role === 'admin' ? t.role_admin : user?.role === 'gabbai' ? t.role_gabbai : t.role_member}
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

                {/* ── Tivuta Card (loyalty points + customer number) ── */}
                <div className="bg-[#0e1628] border border-[#d4af37]/30 rounded-2xl overflow-hidden">
                    <div className="p-6" style={{ background: 'linear-gradient(135deg, #1a2540 0%, #111a2f 100%)' }}>
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div>
                                <p className="text-[10px] font-bold text-[#d4af37]/60 uppercase tracking-widest mb-1">
                                    {locale === 'he' ? 'כרטיס טיבותא' : locale === 'fr' ? 'Carte Tivuta' : 'Tivuta Card'}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Gift size={20} className="text-[#d4af37]" />
                                    <span className="text-3xl font-black text-[#f0e6d3]">{user?.points_balance ?? 0}</span>
                                    <span className="text-sm text-[#f0e6d3]/50">{locale === 'he' ? 'נקודות' : 'points'}</span>
                                </div>
                            </div>
                            {user?.customer_number && (
                                <div className="text-start">
                                    <p className="text-[10px] font-bold text-[#f0e6d3]/40 uppercase tracking-widest mb-1">
                                        {locale === 'he' ? 'מספר לקוח' : 'Customer Number'}
                                    </p>
                                    <button
                                        onClick={handleCopyCustomerNumber}
                                        className="flex items-center gap-2 font-mono text-sm font-bold text-[#f0e6d3] bg-[#0e1628] border border-[#d4af37]/20 rounded-lg px-3 py-2 hover:border-[#d4af37]/50 transition-colors"
                                        dir="ltr"
                                    >
                                        {user.customer_number}
                                        {copiedCustomerNumber ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={13} className="text-[#f0e6d3]/40" />}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Points history */}
                    <button
                        onClick={() => setShowPointsHistory((v) => !v)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#111a2f] transition-colors border-t border-[#d4af37]/10"
                    >
                        <span className="text-sm font-bold text-[#f0e6d3]">{locale === 'he' ? 'היסטוריית נקודות' : 'Points History'}</span>
                        <ChevronDown size={16} className={`text-[#f0e6d3]/40 transition-transform ${showPointsHistory ? 'rotate-180' : ''}`} />
                    </button>
                    {showPointsHistory && (
                        <div className="px-5 pb-5 space-y-2">
                            {pointsHistory.length === 0 ? (
                                <p className="text-[#f0e6d3]/40 text-sm text-center py-4">
                                    {locale === 'he' ? 'עדיין לא נצברו נקודות' : 'No points earned yet'}
                                </p>
                            ) : (
                                pointsHistory.map((entry) => (
                                    <div key={entry.id} className="flex items-center justify-between bg-[#111a2f] rounded-xl px-4 py-2.5 text-sm">
                                        <div>
                                            <p className="text-[#f0e6d3]">
                                                {entry.vendor_name_he
                                                    ? (locale === 'he' ? `רכישה ב-${entry.vendor_name_he}` : `Purchase at ${entry.vendor_name_he}`)
                                                    : (locale === 'he' ? 'עדכון נקודות' : 'Points adjustment')}
                                            </p>
                                            <p className="text-[10px] text-[#f0e6d3]/40 mt-0.5">
                                                {new Date(entry.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                            </p>
                                        </div>
                                        <span className={`font-black shrink-0 ${entry.delta_points >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {entry.delta_points >= 0 ? '+' : ''}{entry.delta_points}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Physical card request */}
                    <div className="px-5 pb-5 pt-1 border-t border-[#d4af37]/10">
                        {cardOrderLead ? (
                            <div className="flex items-center gap-3 bg-[#111a2f] rounded-xl px-4 py-3">
                                <Package size={18} className="text-[#d4af37] shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-[#f0e6d3]">
                                        {locale === 'he' ? 'בקשת כרטיס פיזי נשלחה' : 'Physical card request submitted'}
                                    </p>
                                    <p className="text-xs text-[#f0e6d3]/40 mt-0.5">
                                        {locale === 'he' ? 'הצוות שלנו יפיק וישלח את הכרטיס בהקדם' : "We'll produce and mail your card soon"}
                                    </p>
                                </div>
                                <span className={`text-xs font-bold shrink-0 px-2 py-0.5 rounded-full ${
                                    cardOrderLead.status === 'closed' ? 'bg-green-400/10 text-green-400' : 'bg-[#d4af37]/10 text-[#d4af37]'
                                }`}>
                                    {cardOrderLead.status === 'closed'
                                        ? (locale === 'he' ? 'נשלח' : 'Sent')
                                        : (locale === 'he' ? 'בטיפול' : 'In progress')}
                                </span>
                            </div>
                        ) : showCardOrderForm ? (
                            <form onSubmit={handleSubmitCardOrder} className="space-y-3">
                                {cardOrderError && <p className="text-red-400 text-xs">{cardOrderError}</p>}
                                <input
                                    required
                                    value={cardOrderForm.full_name}
                                    onChange={(e) => setCardOrderForm({ ...cardOrderForm, full_name: e.target.value })}
                                    placeholder={locale === 'he' ? 'שם מלא' : 'Full name'}
                                    className="input-field !py-2.5 !text-sm"
                                />
                                <input
                                    required
                                    value={cardOrderForm.street}
                                    onChange={(e) => setCardOrderForm({ ...cardOrderForm, street: e.target.value })}
                                    placeholder={locale === 'he' ? 'רחוב ומספר בית' : 'Street and number'}
                                    className="input-field !py-2.5 !text-sm"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        required
                                        value={cardOrderForm.city}
                                        onChange={(e) => setCardOrderForm({ ...cardOrderForm, city: e.target.value })}
                                        placeholder={locale === 'he' ? 'עיר' : 'City'}
                                        className="input-field !py-2.5 !text-sm"
                                    />
                                    <input
                                        value={cardOrderForm.zip_code || ''}
                                        onChange={(e) => setCardOrderForm({ ...cardOrderForm, zip_code: e.target.value })}
                                        placeholder={locale === 'he' ? 'מיקוד' : 'Zip code'}
                                        className="input-field !py-2.5 !text-sm"
                                        dir="ltr"
                                    />
                                </div>
                                <input
                                    required
                                    value={cardOrderForm.phone}
                                    onChange={(e) => setCardOrderForm({ ...cardOrderForm, phone: e.target.value })}
                                    placeholder={locale === 'he' ? 'טלפון' : 'Phone'}
                                    className="input-field !py-2.5 !text-sm"
                                    dir="ltr"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        disabled={cardOrderState === 'submitting'}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm bg-[#d4af37] text-[#080d1f] hover:bg-[#c9a227] disabled:opacity-60 transition-all"
                                    >
                                        {cardOrderState === 'submitting' ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}
                                        {locale === 'he' ? 'שלח בקשה' : 'Submit request'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCardOrderForm(false)}
                                        className="px-4 py-2.5 rounded-xl font-bold text-sm text-[#f0e6d3]/50 hover:text-[#f0e6d3] transition-all"
                                    >
                                        {locale === 'he' ? 'ביטול' : 'Cancel'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <button
                                onClick={() => setShowCardOrderForm(true)}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/10 transition-all"
                            >
                                <Package size={16} />
                                {locale === 'he' ? 'הזמן כרטיס פיזי בדואר' : 'Order a physical card by mail'}
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Gabbai registration ── */}
                <div id="gabbai-registration" className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-5 scroll-mt-24">
                    <h2 className="font-black text-[#f0e6d3] text-sm mb-4 flex items-center gap-2">
                        <Users size={14} className="text-[#d4af37]" />
                        {t.gabbai_section_title}
                    </h2>
                    {user?.role === 'gabbai' && !showGabbaiForm ? (
                        <div className="flex items-start gap-3 bg-[#111a2f] rounded-xl px-4 py-3">
                            <CheckCircle2 size={18} className="text-green-400 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[#f0e6d3]">{t.gabbai_registered_status}</p>
                                {user.gabbai_community_name && <p className="text-xs text-[#f0e6d3]/50 mt-0.5">{user.gabbai_community_name}</p>}
                                {user.gabbai_synagogue_address && <p className="text-xs text-[#f0e6d3]/40">{user.gabbai_synagogue_address}</p>}
                            </div>
                            <button onClick={() => setShowGabbaiForm(true)} className="flex items-center gap-1.5 text-xs font-bold text-[#d4af37]/70 hover:text-[#d4af37] transition-colors shrink-0">
                                <Pencil size={13} /> {t.gabbai_edit}
                            </button>
                        </div>
                    ) : showGabbaiForm ? (
                        <form onSubmit={handleSubmitGabbai} className="space-y-3">
                            {gabbaiError && <p className="text-red-400 text-xs">{gabbaiError}</p>}
                            <input
                                required
                                value={gabbaiForm.community_name}
                                onChange={(e) => setGabbaiForm({ ...gabbaiForm, community_name: e.target.value })}
                                placeholder={t.gabbai_community_name}
                                className="input-field !py-2.5 !text-sm"
                            />
                            <input
                                required
                                value={gabbaiForm.synagogue_address}
                                onChange={(e) => setGabbaiForm({ ...gabbaiForm, synagogue_address: e.target.value })}
                                placeholder={t.gabbai_synagogue_address}
                                className="input-field !py-2.5 !text-sm"
                            />
                            <input
                                value={gabbaiForm.contact_name || ''}
                                onChange={(e) => setGabbaiForm({ ...gabbaiForm, contact_name: e.target.value })}
                                placeholder={t.gabbai_contact_name}
                                className="input-field !py-2.5 !text-sm"
                            />
                            <input
                                value={gabbaiForm.contact_phone || ''}
                                onChange={(e) => setGabbaiForm({ ...gabbaiForm, contact_phone: e.target.value })}
                                placeholder={t.gabbai_contact_phone}
                                className="input-field !py-2.5 !text-sm"
                                dir="ltr"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={gabbaiState === 'submitting'}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm bg-[#d4af37] text-[#080d1f] hover:bg-[#c9a227] disabled:opacity-60 transition-all"
                                >
                                    {gabbaiState === 'submitting' ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}
                                    {t.gabbai_submit}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowGabbaiForm(false)}
                                    className="px-4 py-2.5 rounded-xl font-bold text-sm text-[#f0e6d3]/50 hover:text-[#f0e6d3] transition-all"
                                >
                                    {t.gabbai_cancel}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div>
                            <p className="text-xs text-[#f0e6d3]/50 mb-3">{t.gabbai_register_sub}</p>
                            <button
                                onClick={() => setShowGabbaiForm(true)}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/10 transition-all"
                            >
                                <Users size={16} />
                                {t.gabbai_register_cta}
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Order Tracking (CustomerOrder-backed) ── */}
                <div id="my-orders" className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-5 scroll-mt-24">
                    <h2 className="font-black text-[#f0e6d3] text-sm mb-4 flex items-center gap-2">
                        <ShoppingBag size={14} className="text-[#d4af37]" />
                        {t.orders_title}
                    </h2>
                    {myOrders.length === 0 ? (
                        <p className="text-[#f0e6d3]/40 text-sm">{t.no_orders}</p>
                    ) : gabbaiOrders.length > 0 ? (
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs font-bold text-[#f0e6d3]/50 uppercase tracking-wider mb-2">{t.orders_personal_title}</p>
                                {personalOrders.length === 0 ? (
                                    <p className="text-[#f0e6d3]/30 text-xs">{t.no_orders}</p>
                                ) : (
                                    <div className="space-y-4">{personalOrders.map(renderOrderCard)}</div>
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-[#d4af37]/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Users size={12} /> {t.orders_gabbai_title}
                                </p>
                                <div className="space-y-4">{gabbaiOrders.map(renderOrderCard)}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">{myOrders.map(renderOrderCard)}</div>
                    )}
                </div>

                {/* ── Shopping lists launcher — only for verticals with enables_shopping_list ── */}
                {verticals.filter((v) => v.enables_shopping_list).length > 0 && (
                    <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-5">
                        <h2 className="font-black text-[#f0e6d3] text-sm mb-4 flex items-center gap-2">
                            <ListChecks size={14} className="text-[#d4af37]" />
                            {t.shopping_lists_title}
                        </h2>
                        <div className="space-y-3">
                            {verticals.filter((v) => v.enables_shopping_list).map((v) => {
                                const localeKey = locale as 'he' | 'en' | 'fr' | 'yi';
                                const label = v[`label_${localeKey}`] || v.label_he;
                                const count = shoppingListCounts[v.slug] ?? 0;
                                return (
                                    <div key={v.slug} className="flex items-center justify-between bg-[#111a2f] rounded-xl px-4 py-3">
                                        <div>
                                            <p className="text-sm font-bold text-[#f0e6d3]">{label}</p>
                                            <p className="text-xs text-[#f0e6d3]/40">{count} {t.shopping_list_items_label}</p>
                                        </div>
                                        <Link
                                            href={`/${locale}/shopping-list?vertical=${v.slug}`}
                                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#d4af37]/10 text-[#d4af37] hover:bg-[#d4af37]/20 transition-colors"
                                        >
                                            {t.open_shopping_list}
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Activity history ── */}
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-5">
                    <h2 className="font-black text-[#f0e6d3] text-sm mb-4">{t.activity_title}</h2>
                    {activityLoading ? (
                        <div className="text-center py-4 text-[#f0e6d3]/40 text-sm">...</div>
                    ) : marketplaceActivity.length === 0 ? (
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
                                        {items.map(item => (
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
                            {favorites.map((fav) => {
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
                                            className="text-[#f0e6d3]/20 hover:text-red-400 transition-colors p-2 -m-2 shrink-0"
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
                            {appointments.map((appt) => (
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
                            {orders.map((order) => (
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
                            {recentlyViewed.slice(0, 8).map((p: RecentlyViewedProduct) => {
                                const imgSrc = productImageUrl(p.image_url);
                                const href = `/${locale}/products?id=${p.id}`;
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
                                            value={pwForm[key as keyof typeof pwForm]}
                                            onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                                            className="w-full bg-[#111a2f] rounded-xl px-4 py-2.5 text-sm text-[#f0e6d3] pe-10"
                                            dir="ltr"
                                        />
                                        {key !== 'confirm' && (
                                            <button type="button" onClick={toggle} className="absolute end-1 top-1/2 -translate-y-1/2 text-[#f0e6d3]/30 hover:text-[#f0e6d3]/60 p-2">
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
                <div id="notification-preferences" className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-hidden">
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
                                <label
                                    key={key}
                                    onClick={() => setNotifPrefs((p) => ({ ...p, [key]: !p[key] }))}
                                    className="flex items-center justify-between gap-3 cursor-pointer"
                                >
                                    <span className="text-sm text-[#f0e6d3]/80">{label}</span>
                                    <div
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

                {/* ── Preferred language ── */}
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-hidden px-5 py-4">
                    <div className="flex items-center gap-3 mb-3">
                        <Languages size={16} className="text-[#d4af37]/60" />
                        <span className="text-sm font-bold text-[#f0e6d3]">
                            {locale === 'he' ? 'שפה מועדפת' : locale === 'fr' ? 'Langue préférée' : 'Preferred language'}
                        </span>
                    </div>
                    <p className="text-xs text-[#f0e6d3]/50 mb-3">
                        {locale === 'he'
                            ? 'האתר ייטען בשפה זו בביקורים הבאים, ומיילים והתראות שנשלח אליך יהיו בשפה זו.'
                            : 'The site will load in this language on future visits, and emails/notifications sent to you will use it.'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { code: 'he', label: 'עברית' },
                            { code: 'en', label: 'English' },
                            { code: 'fr', label: 'Français' },
                            { code: 'yi', label: 'יידיש' },
                        ].map((lang) => (
                            <button
                                key={lang.code}
                                disabled={langSaving}
                                onClick={async () => {
                                    if (!token) return;
                                    setLangSaving(true);
                                    setLangError('');
                                    try {
                                        await updatePreferredLanguage(token, lang.code);
                                        if (lang.code !== locale) {
                                            // Without this, AuthContext's preferred-language redirect effect
                                            // would immediately navigate right back here on the new URL: its
                                            // in-memory `user.preferred_language` is still the old value (this
                                            // page never refetches it), so it would see a "mismatch" and
                                            // silently revert the choice just made. Marking a manual override
                                            // is exactly the same "this tab's language choice is settled" signal
                                            // the header switcher already gives it.
                                            markManualLocaleOverride();
                                            const suffix = window.location.search + window.location.hash;
                                            router.push(swapLocaleInPath(window.location.pathname, lang.code) + suffix);
                                        }
                                    } catch (err) {
                                        setLangError(getErrorMessage(err, locale === 'he' ? 'שגיאה בשמירת השפה' : 'Failed to save language'));
                                    } finally {
                                        setLangSaving(false);
                                    }
                                }}
                                className={`py-2 rounded-xl text-sm font-bold border transition-all disabled:opacity-50 ${
                                    (user?.preferred_language || locale) === lang.code
                                        ? 'bg-[#d4af37] text-[#080d1f] border-[#d4af37]'
                                        : 'bg-transparent text-[#f0e6d3]/70 border-[#d4af37]/20 hover:border-[#d4af37]/50'
                                }`}
                            >
                                {lang.label}
                            </button>
                        ))}
                    </div>
                    {langError && <p className="text-red-400 text-xs mt-2">{langError}</p>}
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
