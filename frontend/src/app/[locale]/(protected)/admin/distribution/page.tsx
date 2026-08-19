'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    adminListDistributions,
    adminCreateDistribution,
    adminSendDistribution,
    adminConfirmWhatsAppSent,
    adminDeleteDistribution,
    adminGetMemberCount,
    adminListSurveys,
    adminListProducts,
    adminPreviewDistribution,
    adminSendTestEmail,
    adminListDistributionRecipients,
    DistributionRecipient,
    productImageUrl,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { downloadImageFile } from '@/lib/shareImage';
import { Product } from '@/components/ProductTile';
import { Survey } from '@/components/SurveyCard';
import { buildSurveyShareUrl } from '@/lib/share';
import { Plus, Loader2, X, Send, Mail, MessageCircle, RefreshCw, CheckCircle2, AlertCircle, Trash2, Calendar, Eye, Users, Filter, MailCheck } from 'lucide-react';

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold whitespace-nowrap ${
            type === 'success' ? 'bg-[#0e1628] border border-green-500/50 text-green-400' : 'bg-[#0e1628] border border-red-500/50 text-red-400'
        }`}>
            {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message}
        </div>
    );
}

const BASE_SITE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'https://tivuta.co.il';

interface Distribution {
    id: number;
    distribution_type: string;
    status: string;
    title_he: string;
    message_he?: string | null;
    channels: string[];
    survey_id?: number | null;
    survey_title?: string | null;
    product_id?: number | null;
    product_title?: string | null;
    scheduled_at?: string | null;
    sent_at?: string | null;
    whatsapp_confirmed_at?: string | null;
    is_manual_share?: boolean;
    whatsapp_manual_mode?: boolean;
    sent_count: number;
    failed_count: number;
    skipped_count: number;
}

export default function AdminDistributionPage() {
    const { token } = useAuth();
    const [distributions, setDistributions] = useState<Distribution[]>([]);
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [sendingId, setSendingId] = useState<number | null>(null);
    const [sendingTestId, setSendingTestId] = useState<number | null>(null);
    const [confirmSendId, setConfirmSendId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [memberCount, setMemberCount] = useState<number | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    const [previewDistId, setPreviewDistId] = useState<number | null>(null);
    const [previewData, setPreviewData] = useState<{ html: string; subject: string; recipient_count: number } | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const [recipientsDistId, setRecipientsDistId] = useState<number | null>(null);
    const [recipients, setRecipients] = useState<DistributionRecipient[] | null>(null);
    const [recipientsLoading, setRecipientsLoading] = useState(false);

    const [form, setForm] = useState({
        distribution_type: 'survey' as 'daily_deal' | 'survey',
        survey_id: '',
        product_id: '',
        title_he: '',
        message_he: '',
        channels: [] as string[],
        whatsapp_manual_mode: false,
        scheduled_at: '',
        filter_membership_track: '',
        filter_city: '',
    });

    const load = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [d, s, p, count] = await Promise.all([
                adminListDistributions(token),
                adminListSurveys(token),
                adminListProducts(token),
                adminGetMemberCount(token),
            ]);
            setDistributions(d);
            setSurveys(s);
            setProducts(p);
            setMemberCount(count);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { Promise.resolve().then(load); }, [token]);

    // Poll every 3s when any distribution is 'sending'
    useEffect(() => {
        const hasSending = distributions.some((d) => d.status === 'sending');
        if (hasSending && !pollRef.current) {
            pollRef.current = setInterval(async () => {
                if (!token) return;
                const fresh: Distribution[] = await adminListDistributions(token);
                setDistributions(fresh);
                if (!fresh.some((d) => d.status === 'sending')) {
                    clearInterval(pollRef.current!);
                    pollRef.current = null;
                }
            }, 3000);
        }
        return () => {
            if (!hasSending && pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [distributions, token]);

    const toggleChannel = (channel: string) => {
        setForm((f) => {
            const channels = f.channels.includes(channel) ? f.channels.filter((c) => c !== channel) : [...f.channels, channel];
            return {
                ...f,
                channels,
                // Deselecting WhatsApp also hides the manual-mode checkbox — reset it too, so a
                // distribution with no WhatsApp channel can't still be flagged manual-mode.
                whatsapp_manual_mode: channel === 'whatsapp' && !channels.includes('whatsapp') ? false : f.whatsapp_manual_mode,
            };
        });
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || form.channels.length === 0) return;
        try {
            await adminCreateDistribution(token, {
                distribution_type: form.distribution_type,
                survey_id: form.distribution_type === 'survey' ? Number(form.survey_id) : null,
                product_id: form.distribution_type === 'daily_deal' ? Number(form.product_id) : null,
                title_he: form.title_he,
                message_he: form.message_he || null,
                channels: form.channels,
                whatsapp_manual_mode: form.whatsapp_manual_mode,
                scheduled_at: form.scheduled_at || null,
                filter_membership_track: form.filter_membership_track || null,
                filter_city: form.filter_city || null,
            });
            setShowForm(false);
            setForm({ distribution_type: 'survey', survey_id: '', product_id: '', title_he: '', message_he: '', channels: [], whatsapp_manual_mode: false, scheduled_at: '', filter_membership_track: '', filter_city: '' });
            showToast('ההפצה נוצרה — תוכל לשלוח אותה מהרשימה ✓');
            load();
        } catch {
            showToast('שגיאה ביצירת ההפצה', 'error');
        }
    };

    const buildWhatsAppText = (d: Distribution): string => {
        const intro = d.message_he ? `${d.message_he}\n\n` : '';
        if (d.distribution_type === 'survey' && d.survey_id) {
            const survey = surveys.find((s) => s.id === d.survey_id);
            const question = survey?.question_he || d.survey_title || d.title_he;
            const url = buildSurveyShareUrl(d.survey_id, 'he');
            return `${intro}${d.title_he}\n${question}\n\nלחץ להצביע:\n${url}`.trim();
        }
        if (d.distribution_type === 'daily_deal' && d.product_id) {
            const product = products.find((p) => p.id === d.product_id);
            const price = product?.price ? `₪${Math.round(product.price).toLocaleString('he-IL')}` : 'לפי בקשה';
            const title = product?.title_he || d.product_title || d.title_he;
            const url = `https://tivuta.co.il/he/products?id=${d.product_id}`;
            return `${intro}${title} — ${price}\n\nלפרטים:\n${url}`.trim();
        }
        return `${intro}${d.title_he}`.trim();
    };

    const handleSend = async (id: number) => {
        if (!token) return;
        const dist = distributions.find((d) => d.id === id);
        if (!dist) return;

        const hasEmail = dist.channels.includes('email');
        const hasWhatsApp = dist.channels.includes('whatsapp');
        // Collected here instead of shown immediately, then merged into one final toast below —
        // otherwise this message would be clobbered near-instantly by the post-send toast that
        // follows a moment later, since both share the same single-toast slot.
        let whatsappNote: { text: string; failed: boolean } | null = null;

        if (hasWhatsApp && !dist.whatsapp_manual_mode) {
            // Deep-link mode (default, unchanged from before manual mode existed): open WhatsApp
            // immediately (same event-loop tick as the click, before any awaits) with the caption
            // pre-filled via the URL's own text param — no clipboard copy needed for this mode,
            // and no image download either (there's nowhere to attach it to automatically anyway).
            const text = buildWhatsAppText(dist);
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
        } else if (hasWhatsApp && dist.whatsapp_manual_mode) {
            // Manual mode: no deep link — genuinely copy the caption to the clipboard and download
            // the image, so the admin can attach a real photo themselves (same mechanism already
            // proven on the Surveys page's share button).
            const survey = dist.distribution_type === 'survey' && dist.survey_id ? surveys.find((s) => s.id === dist.survey_id) : null;
            const product = dist.distribution_type === 'daily_deal' && dist.product_id ? products.find((p) => p.id === dist.product_id) : null;
            const rawImage = survey?.image_url || product?.image_url;
            let downloadFailed = false;
            if (rawImage) {
                try {
                    const url = productImageUrl(rawImage);
                    const ext = url.split('?')[0].split('.').pop();
                    await downloadImageFile(url, `distribution-${dist.id}${ext ? `.${ext}` : ''}`);
                } catch {
                    downloadFailed = true;
                }
            }
            let copyFailed = false;
            try {
                await navigator.clipboard.writeText(buildWhatsAppText(dist));
            } catch {
                copyFailed = true;
            }
            // No image on the linked survey/product at all is a normal, valid case (not every one
            // has a custom image set) — the message must not falsely claim one was downloaded.
            if (copyFailed) {
                whatsappNote = { text: downloadFailed ? 'שגיאה בהורדת התמונה ובהעתקת הטקסט' : 'העתקת הטקסט נכשלה', failed: true };
            } else if (downloadFailed) {
                whatsappNote = { text: 'הטקסט הועתק, אך הורדת התמונה נכשלה', failed: true };
            } else if (rawImage) {
                whatsappNote = { text: 'התמונה הורדה והטקסט הועתק', failed: false };
            } else {
                whatsappNote = { text: 'הטקסט הועתק', failed: false };
            }
        }

        setConfirmSendId(null);
        setSendingId(id);
        try {
            await adminSendDistribution(token, id);
            let message: string;
            if (whatsappNote) {
                message = hasEmail ? `האימיילים נשלחו ✓ — ${whatsappNote.text}` : `${whatsappNote.text} — אשר שליחה ברשימה למטה לאחר שתשלח בפועל`;
            } else if (hasEmail && hasWhatsApp) {
                message = 'האימיילים נשלחו ✓ — לאחר השליחה בוואטסאפ, אשר זאת ברשימה למטה';
            } else if (hasWhatsApp) {
                message = 'לאחר השליחה בפועל בוואטסאפ, אשר זאת ברשימה למטה ✓';
            } else {
                message = 'ההפצה נשלחה בהצלחה ✓';
            }
            showToast(message, whatsappNote?.failed ? 'error' : 'success');
            await load();
        } catch {
            showToast('שגיאה בשליחה', 'error');
        } finally {
            setSendingId(null);
        }
    };

    const handleConfirmWhatsApp = async (id: number) => {
        if (!token) return;
        try {
            const updated = await adminConfirmWhatsAppSent(token, id);
            setDistributions((prev) => prev.map((d) => (d.id === id ? updated : d)));
            showToast('השיתוף אושר ✓');
        } catch (err) {
            showToast(getErrorMessage(err, 'שגיאה באישור השיתוף'), 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!token) return;
        try {
            await adminDeleteDistribution(token, id);
            setDeletingId(null);
            showToast('הטיוטה נמחקה');
            load();
        } catch {
            showToast('שגיאה במחיקה', 'error');
        }
    };

    const handlePreview = async (id: number) => {
        if (!token) return;
        setPreviewDistId(id);
        setPreviewData(null);
        setPreviewLoading(true);
        try {
            const data = await adminPreviewDistribution(token, id);
            setPreviewData(data);
        } catch {
            showToast('שגיאה בטעינת תצוגה מקדימה', 'error');
            setPreviewDistId(null);
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleShowRecipients = async (id: number) => {
        if (!token) return;
        setRecipientsDistId(id);
        setRecipients(null);
        setRecipientsLoading(true);
        try {
            const data = await adminListDistributionRecipients(token, id);
            setRecipients(data);
        } catch {
            showToast('שגיאה בטעינת רשימת נמענים', 'error');
            setRecipientsDistId(null);
        } finally {
            setRecipientsLoading(false);
        }
    };

    // Sends a real email straight to the current admin's own address, using the exact same
    // template a real send would use — since real campaign sends only ever go to role=="member"
    // users, this is the only way an admin can actually verify their own system end-to-end.
    const handleSendTest = async (id: number) => {
        if (!token) return;
        setSendingTestId(id);
        try {
            const result = await adminSendTestEmail(token, id);
            showToast(result.success ? 'מייל בדיקה נשלח לכתובת שלך ✓' : `שגיאה בשליחת הבדיקה: ${result.error ?? ''}`, result.success ? 'success' : 'error');
        } catch (err) {
            showToast(getErrorMessage(err, 'שגיאה בשליחת מייל בדיקה'), 'error');
        } finally {
            setSendingTestId(null);
        }
    };

    const selectedSurvey = surveys.find((s) => s.id === Number(form.survey_id));
    const surveyUrl = selectedSurvey ? buildSurveyShareUrl(selectedSurvey.id, 'he') : null;

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            draft: 'bg-[#111a2f] text-[#f0e6d3]/60',
            sending: 'bg-yellow-500/20 text-yellow-400',
            awaiting_whatsapp_confirmation: 'bg-amber-500/20 text-amber-400',
            sent: 'bg-green-500/20 text-green-400',
            failed: 'bg-red-500/20 text-red-400',
        };
        const labels: Record<string, string> = { draft: 'טיוטה', sending: 'שולח...', awaiting_whatsapp_confirmation: 'ממתין לאישור שיתוף', sent: 'נשלח', failed: 'שגיאה' };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${map[status] ?? 'bg-[#111a2f] text-[#f0e6d3]/60'}`}>
                {labels[status] ?? status}
            </span>
        );
    };

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-black text-[#f0e6d3]">הפצה</h1>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 !text-sm">
                    <Plus size={16} /> הפצה חדשה
                </button>
            </div>

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={32} />
            ) : (
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-x-auto">
                    <table className="w-full text-start">
                        <thead className="bg-[#111a2f] text-[#f0e6d3]/60 text-xs uppercase">
                            <tr>
                                <th className="p-4 text-start">סוג</th>
                                <th className="p-4 text-start">יעד</th>
                                <th className="p-4 text-start">ערוצים</th>
                                <th className="p-4 text-start">סטטוס</th>
                                <th className="p-4 text-start">תזמון</th>
                                <th className="p-4 text-start">תוצאות</th>
                                <th className="p-4 text-start"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {distributions.map((d) => (
                                <tr key={d.id} className="border-t border-[#d4af37]/10 text-[#f0e6d3]">
                                    <td className="p-4 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${d.distribution_type === 'survey' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                            {d.distribution_type === 'survey' ? 'סקר' : 'דיל היומי'}
                                        </span>
                                        {d.is_manual_share && (
                                            <span className="mr-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#111a2f] text-[#f0e6d3]/50" title="שיתוף ידני חד-פעמי, לא הפצה מפולחת">
                                                ידני
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 max-w-[220px]">
                                        <p className="text-sm text-[#f0e6d3] truncate">{d.survey_title || d.product_title || d.title_he || '-'}</p>
                                        {d.title_he && (d.survey_title || d.product_title) && (
                                            <p className="text-xs text-[#f0e6d3]/40 truncate mt-0.5">{d.title_he}</p>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            {d.channels.includes('email') && <Mail size={16} className="text-[#d4af37]" />}
                                            {d.channels.includes('whatsapp') && <MessageCircle size={16} className="text-[#d4af37]" />}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {statusBadge(d.status)}
                                            {d.status === 'sending' && <RefreshCw size={12} className="animate-spin text-yellow-400" />}
                                        </div>
                                        {d.sent_at && (
                                            <p className="text-[10px] text-[#f0e6d3]/30 mt-1">
                                                {new Date(d.sent_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {d.scheduled_at ? (
                                            <div className="flex items-center gap-1.5 text-[#d4af37]/80">
                                                <Calendar size={13} />
                                                <span className="text-xs">
                                                    {new Date(d.scheduled_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[#f0e6d3]/20 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {(d.sent_count > 0 || d.failed_count > 0 || d.skipped_count > 0) ? (
                                            <button
                                                onClick={() => handleShowRecipients(d.id)}
                                                className="text-xs space-y-0.5 text-start hover:underline decoration-dotted"
                                                title="הצג רשימת נמענים"
                                            >
                                                {d.sent_count > 0 && <div className="text-green-400">{d.sent_count} נשלחו ✓</div>}
                                                {d.failed_count > 0 && <div className="text-red-400">{d.failed_count} נכשלו</div>}
                                                {d.skipped_count > 0 && <div className="text-[#f0e6d3]/40">{d.skipped_count} דולגו</div>}
                                            </button>
                                        ) : <span className="text-[#f0e6d3]/25 text-xs">—</span>}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                        <button onClick={() => handlePreview(d.id)} className="text-[#f0e6d3]/30 hover:text-[#f0e6d3]/70 transition-colors" title="תצוגה מקדימה">
                                            <Eye size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleSendTest(d.id)}
                                            disabled={sendingTestId === d.id}
                                            className="text-[#f0e6d3]/30 hover:text-[#f0e6d3]/70 transition-colors disabled:opacity-40"
                                            title="שלח מייל בדיקה לכתובת שלך"
                                        >
                                            {sendingTestId === d.id ? <Loader2 size={14} className="animate-spin" /> : <MailCheck size={14} />}
                                        </button>
                                        {(d.status === 'draft' || d.status === 'failed') && (
                                            confirmSendId === d.id ? (
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-[#f0e6d3]/60">
                                                        {d.channels.includes('whatsapp') && !d.channels.includes('email')
                                                            ? d.whatsapp_manual_mode
                                                                ? 'יועתק טקסט ותורד תמונה לשליחה ב-WhatsApp?'
                                                                : 'יפתח WhatsApp — בחר קבוצה ושלח?'
                                                            : d.channels.includes('whatsapp')
                                                                ? `${memberCount ?? '...'} מיילים + WhatsApp?`
                                                                : `שלח ל-${memberCount ?? '...'} חברים?`}
                                                    </span>
                                                    <button onClick={() => handleSend(d.id)} className="text-[#d4af37] font-bold hover:text-[#f0c94a]">כן</button>
                                                    <button onClick={() => setConfirmSendId(null)} className="text-[#f0e6d3]/40 hover:text-[#f0e6d3]">לא</button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmSendId(d.id)}
                                                    disabled={sendingId === d.id}
                                                    className="flex items-center gap-1 text-xs font-bold text-[#d4af37] hover:underline disabled:opacity-50"
                                                >
                                                    {d.channels.includes('whatsapp') && !d.channels.includes('email')
                                                        ? d.whatsapp_manual_mode
                                                            ? <><MessageCircle size={13} /> הכן לשליחה ב-WhatsApp</>
                                                            : <><MessageCircle size={13} /> פתח WhatsApp</>
                                                        : <><Send size={14} /> שלח</>}
                                                </button>
                                            )
                                        )}
                                        {d.channels.includes('whatsapp') && !d.whatsapp_confirmed_at && d.status !== 'draft' && d.status !== 'sending' && (
                                            <button
                                                onClick={() => handleConfirmWhatsApp(d.id)}
                                                className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
                                                title={d.whatsapp_manual_mode ? 'לחץ לאחר שבאמת שלחת בוואטסאפ' : 'סמן שההודעה נשלחה בוואטסאפ'}
                                            >
                                                <CheckCircle2 size={13} /> {d.whatsapp_manual_mode ? 'אישרתי ששלחתי' : 'נשלח'}
                                            </button>
                                        )}
                                        {(d.status === 'draft' || d.status === 'awaiting_whatsapp_confirmation' || d.status === 'failed' || d.status === 'sending') && (
                                            deletingId === d.id ? (
                                                <div className="flex items-center gap-1 text-xs">
                                                    <button onClick={() => handleDelete(d.id)} className="text-red-400 font-bold hover:text-red-300">כן</button>
                                                    <span className="text-[#f0e6d3]/30">/</span>
                                                    <button onClick={() => setDeletingId(null)} className="text-[#f0e6d3]/40 hover:text-[#f0e6d3]">לא</button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setDeletingId(d.id)}
                                                    className="text-red-400/40 hover:text-red-400 transition-colors"
                                                    title={d.status === 'sending' ? 'תקוע ב"שולח..."? ניתן למחוק' : 'מחק'}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )
                                        )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {distributions.length === 0 && (
                                <tr><td colSpan={7} className="p-8 text-center text-[#f0e6d3]/60">אין הפצות עדיין.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Email Preview Modal */}
            {previewDistId !== null && (
                <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-6" onClick={() => setPreviewDistId(null)}>
                    <div className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-[#d4af37]/10 flex-shrink-0">
                            <div>
                                <h2 className="text-lg font-black text-[#f0e6d3] flex items-center gap-2"><Eye size={16} className="text-[#d4af37]" /> תצוגה מקדימה</h2>
                                {previewData && (
                                    <p className="text-[#f0e6d3]/50 text-xs mt-0.5 flex items-center gap-2">
                                        <span>נושא: <span className="text-[#d4af37]">{previewData.subject}</span></span>
                                        <span className="text-[#f0e6d3]/20">|</span>
                                        <span className="flex items-center gap-1"><Users size={11} /> {previewData.recipient_count} נמענים</span>
                                    </p>
                                )}
                            </div>
                            <button onClick={() => setPreviewDistId(null)}><X size={20} className="text-[#f0e6d3]/60 hover:text-[#f0e6d3]" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {previewLoading ? (
                                <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-[#d4af37]" /></div>
                            ) : previewData ? (
                                <div className="bg-white rounded-2xl overflow-hidden">
                                    <iframe
                                        srcDoc={previewData.html}
                                        className="w-full min-h-[500px] border-0"
                                        sandbox="allow-same-origin"
                                        title="Email preview"
                                    />
                                </div>
                            ) : (
                                <div className="text-center py-16 text-[#f0e6d3]/40">לא ניתן לטעון תצוגה מקדימה</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Recipients Modal */}
            {recipientsDistId !== null && (
                <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-6" onClick={() => setRecipientsDistId(null)}>
                    <div className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-[#d4af37]/10 flex-shrink-0">
                            <h2 className="text-lg font-black text-[#f0e6d3] flex items-center gap-2"><Users size={16} className="text-[#d4af37]" /> נמענים</h2>
                            <button onClick={() => setRecipientsDistId(null)}><X size={20} className="text-[#f0e6d3]/60 hover:text-[#f0e6d3]" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {recipientsLoading ? (
                                <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-[#d4af37]" /></div>
                            ) : recipients && recipients.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    {recipients.map((r) => (
                                        <div key={r.user_id} className="bg-[#111a2f] rounded-xl px-4 py-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm text-[#f0e6d3] font-semibold">{r.first_name} {r.last_name}</p>
                                                    <p className="text-xs text-[#f0e6d3]/50" dir="ltr">{r.email}</p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${r.status === 'sent' ? 'bg-green-500/20 text-green-400' : r.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-[#111a2f] text-[#f0e6d3]/50'}`}>
                                                    {r.status === 'sent' ? 'נשלח' : r.status === 'failed' ? 'נכשל' : r.status}
                                                </span>
                                            </div>
                                            {r.error && <p className="text-xs text-red-400/80 mt-1">{r.error}</p>}
                                            {r.provider_message_id && (
                                                <p className="text-[10px] text-[#f0e6d3]/25 mt-1 font-mono" dir="ltr">ID: {r.provider_message_id}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-[#f0e6d3]/40">אין נתוני נמענים</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Distribution Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6" onClick={() => setShowForm(false)}>
                    <form
                        onSubmit={handleCreate}
                        className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-[#f0e6d3]">הפצה חדשה</h2>
                            <button type="button" onClick={() => setShowForm(false)}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>

                        {/* Type selector */}
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">סוג ההפצה</label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, distribution_type: 'survey', product_id: '' })}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm ${form.distribution_type === 'survey' ? 'bg-[#d4af37] text-[#080d1f]' : 'bg-[#111a2f] text-[#f0e6d3]'}`}
                                >סקר</button>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, distribution_type: 'daily_deal', survey_id: '' })}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm ${form.distribution_type === 'daily_deal' ? 'bg-[#d4af37] text-[#080d1f]' : 'bg-[#111a2f] text-[#f0e6d3]'}`}
                                >דיל היומי</button>
                            </div>
                        </div>

                        {/* Survey / product selector */}
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">
                                {form.distribution_type === 'survey' ? 'איזה סקר לשלוח?' : 'איזה מוצר לקדם?'}
                            </label>
                            {form.distribution_type === 'survey' ? (
                                <select
                                    required
                                    value={form.survey_id}
                                    onChange={(e) => setForm({ ...form, survey_id: e.target.value })}
                                    className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                                >
                                    <option value="">בחר סקר...</option>
                                    {surveys.map((s) => (
                                        <option key={s.id} value={s.id}>{s.question_he}</option>
                                    ))}
                                </select>
                            ) : (
                                <select
                                    required
                                    value={form.product_id}
                                    onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                                    className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                                >
                                    <option value="">בחר מוצר...</option>
                                    {products.map((p) => <option key={p.id} value={p.id}>{p.title_he}</option>)}
                                </select>
                            )}
                        </div>

                        {/* Survey URL preview */}
                        {surveyUrl && (
                            <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
                                <p className="text-green-400 text-xs font-bold mb-1">קישור שיישלח אוטומטית</p>
                                <p className="text-[#f0e6d3]/70 text-xs break-all">{surveyUrl}</p>
                            </div>
                        )}

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">כותרת ההודעה</label>
                            <input
                                required
                                placeholder="לדוגמה: הצביעו עכשיו!"
                                value={form.title_he}
                                onChange={(e) => setForm({ ...form, title_he: e.target.value })}
                                className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">מבוא (אופציונלי)</label>
                            <textarea
                                placeholder="טקסט פתיחה שיופיע לפני הקישור..."
                                value={form.message_he}
                                onChange={(e) => setForm({ ...form, message_he: e.target.value })}
                                className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]"
                                rows={3}
                            />
                            <p className="text-[#f0e6d3]/30 text-xs mt-1">
                                {form.distribution_type === 'survey'
                                    ? 'השאלה, האפשרויות ולינק ההצבעה יתווספו אוטומטית למייל.'
                                    : 'תמונת המוצר, המחיר ולינק יתווספו אוטומטית למייל.'}
                            </p>
                        </div>

                        {/* Channel selectors */}
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">ערוצי שליחה</label>
                            <div className="flex gap-3">
                                <label className="flex-1 flex items-center gap-2 bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3] text-sm cursor-pointer">
                                    <input type="checkbox" checked={form.channels.includes('email')} onChange={() => toggleChannel('email')} />
                                    <Mail size={16} /> מייל
                                </label>
                                <label className="flex-1 flex flex-col gap-1 bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3] text-sm cursor-pointer">
                                    <span className="flex items-center gap-2">
                                        <input type="checkbox" checked={form.channels.includes('whatsapp')} onChange={() => toggleChannel('whatsapp')} />
                                        <MessageCircle size={16} /> WhatsApp
                                    </span>
                                    <span className="text-[10px] text-[#f0e6d3]/30 pr-5">פתיחת WhatsApp Web לשליחה ידנית</span>
                                </label>
                            </div>
                            {form.channels.length === 0 && (
                                <p className="text-red-400 text-xs mt-1">יש לבחור לפחות ערוץ אחד</p>
                            )}
                            {form.channels.includes('whatsapp') && (
                                <label className="flex items-start gap-2 mt-3 bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3] text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.whatsapp_manual_mode}
                                        onChange={() => setForm({ ...form, whatsapp_manual_mode: !form.whatsapp_manual_mode })}
                                        className="mt-0.5"
                                    />
                                    <span>
                                        שליחה ידנית (העתק טקסט + הורדת תמונה)
                                        <span className="block text-[10px] text-[#f0e6d3]/30 mt-0.5">
                                            במקום לפתוח את WhatsApp עם טקסט מוכן, יועתק הטקסט ותורד התמונה — כדי לצרף תמונה אמיתית בעצמך.
                                        </span>
                                    </span>
                                </label>
                            )}
                        </div>

                        {/* Audience segmentation */}
                        <div className="border border-[#d4af37]/10 rounded-xl p-4 space-y-3">
                            <p className="text-xs font-bold text-[#d4af37] flex items-center gap-1.5"><Filter size={12} /> פילוח קהל (אופציונלי)</p>
                            <div>
                                <label className="text-xs text-[#f0e6d3]/50 mb-1 block">עיר</label>
                                <input
                                    placeholder="לדוגמה: בני ברק"
                                    value={form.filter_city}
                                    onChange={(e) => setForm({ ...form, filter_city: e.target.value })}
                                    className="w-full bg-[#111a2f] rounded-xl px-4 py-2.5 text-[#f0e6d3] text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-[#f0e6d3]/50 mb-1 block">מסלול חברות</label>
                                <input
                                    placeholder="לדוגמה: gold"
                                    value={form.filter_membership_track}
                                    onChange={(e) => setForm({ ...form, filter_membership_track: e.target.value })}
                                    className="w-full bg-[#111a2f] rounded-xl px-4 py-2.5 text-[#f0e6d3] text-sm"
                                />
                            </div>
                            {(form.filter_city || form.filter_membership_track) && (
                                <p className="text-[#d4af37]/60 text-xs flex items-center gap-1.5"><Users size={11} /> ההפצה תישלח רק לחברים המתאימים לסינון</p>
                            )}
                        </div>

                        {/* Scheduling */}
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block flex items-center gap-1.5">
                                <Calendar size={13} /> תזמון שליחה (אופציונלי)
                            </label>
                            <input
                                type="datetime-local"
                                value={form.scheduled_at}
                                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                                className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3] [color-scheme:dark]"
                            />
                            <p className="text-[#f0e6d3]/30 text-xs mt-1">
                                {form.scheduled_at ? 'ההפצה תישלח אוטומטית במועד שנקבע.' : 'השאר ריק לשמירה כטיוטה ידנית.'}
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={form.channels.length === 0}
                            className="btn-primary w-full disabled:opacity-50"
                        >
                            {form.scheduled_at ? 'צור ותזמן הפצה' : 'צור הפצה'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
