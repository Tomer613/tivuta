'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    adminListDistributions,
    adminCreateDistribution,
    adminSendDistribution,
    adminListSurveys,
    adminListProducts,
} from '@/lib/api';
import { Plus, Loader2, X, Send, Mail, MessageCircle, Eye, RefreshCw } from 'lucide-react';

const BASE_SITE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'https://tivuta.co.il';

export default function AdminDistributionPage() {
    const { token } = useAuth();
    const [distributions, setDistributions] = useState<any[]>([]);
    const [surveys, setSurveys] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [sendingId, setSendingId] = useState<number | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [form, setForm] = useState({
        distribution_type: 'survey' as 'daily_deal' | 'survey',
        survey_id: '',
        product_id: '',
        title_he: '',
        message_he: '',
        channels: ['email'] as string[],
    });

    const load = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [d, s, p] = await Promise.all([
                adminListDistributions(token),
                adminListSurveys(token),
                adminListProducts(token),
            ]);
            setDistributions(d);
            setSurveys(s);
            setProducts(p);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [token]);

    // Poll every 3s when any distribution is 'sending'
    useEffect(() => {
        const hasSending = distributions.some((d) => d.status === 'sending');
        if (hasSending && !pollRef.current) {
            pollRef.current = setInterval(async () => {
                if (!token) return;
                const fresh = await adminListDistributions(token);
                setDistributions(fresh);
                if (!fresh.some((d: any) => d.status === 'sending')) {
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
        setForm((f) => ({
            ...f,
            channels: f.channels.includes(channel) ? f.channels.filter((c) => c !== channel) : [...f.channels, channel],
        }));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || form.channels.length === 0) return;
        await adminCreateDistribution(token, {
            distribution_type: form.distribution_type,
            survey_id: form.distribution_type === 'survey' ? Number(form.survey_id) : null,
            product_id: form.distribution_type === 'daily_deal' ? Number(form.product_id) : null,
            title_he: form.title_he,
            message_he: form.message_he || null,
            channels: form.channels,
        });
        setShowForm(false);
        setForm({ distribution_type: 'survey', survey_id: '', product_id: '', title_he: '', message_he: '', channels: ['email'] });
        load();
    };

    const handleSend = async (id: number) => {
        if (!token) return;
        setSendingId(id);
        try {
            await adminSendDistribution(token, id);
            await load();
        } finally {
            setSendingId(null);
        }
    };

    const selectedSurvey = surveys.find((s) => s.id === Number(form.survey_id));
    const surveyUrl = selectedSurvey ? `https://tivuta.co.il/he/survey/${selectedSurvey.id}` : null;

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            draft: 'bg-[#111a2f] text-[#f0e6d3]/60',
            sending: 'bg-yellow-500/20 text-yellow-400',
            sent: 'bg-green-500/20 text-green-400',
            failed: 'bg-red-500/20 text-red-400',
        };
        const labels: Record<string, string> = { draft: 'טיוטה', sending: 'שולח...', sent: 'נשלח', failed: 'שגיאה' };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${map[status] ?? 'bg-[#111a2f] text-[#f0e6d3]/60'}`}>
                {labels[status] ?? status}
            </span>
        );
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-black text-[#f0e6d3]">הפצה</h1>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 !text-sm">
                    <Plus size={16} /> הפצה חדשה
                </button>
            </div>

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={32} />
            ) : (
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-hidden">
                    <table className="w-full text-start">
                        <thead className="bg-[#111a2f] text-[#f0e6d3]/60 text-xs uppercase">
                            <tr>
                                <th className="p-4 text-start">סוג</th>
                                <th className="p-4 text-start">יעד</th>
                                <th className="p-4 text-start">ערוצים</th>
                                <th className="p-4 text-start">סטטוס</th>
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
                                        {(d.sent_count > 0 || d.failed_count > 0 || d.skipped_count > 0) ? (
                                            <div className="text-xs space-y-0.5">
                                                {d.sent_count > 0 && <div className="text-green-400">{d.sent_count} נשלחו ✓</div>}
                                                {d.failed_count > 0 && <div className="text-red-400">{d.failed_count} נכשלו</div>}
                                                {d.skipped_count > 0 && <div className="text-[#f0e6d3]/40">{d.skipped_count} דולגו</div>}
                                            </div>
                                        ) : <span className="text-[#f0e6d3]/25 text-xs">—</span>}
                                    </td>
                                    <td className="p-4">
                                        {d.status === 'draft' && (
                                            <button
                                                onClick={() => handleSend(d.id)}
                                                disabled={sendingId === d.id}
                                                className="flex items-center gap-1 text-xs font-bold text-[#d4af37] hover:underline disabled:opacity-50"
                                            >
                                                <Send size={14} /> שלח
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {distributions.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-[#f0e6d3]/60">אין הפצות עדיין.</td></tr>
                            )}
                        </tbody>
                    </table>
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
                                <label className="flex-1 flex items-center gap-2 bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3] text-sm cursor-pointer">
                                    <input type="checkbox" checked={form.channels.includes('whatsapp')} onChange={() => toggleChannel('whatsapp')} />
                                    <MessageCircle size={16} /> WhatsApp
                                </label>
                            </div>
                            {form.channels.length === 0 && (
                                <p className="text-red-400 text-xs mt-1">יש לבחור לפחות ערוץ אחד</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={form.channels.length === 0}
                            className="btn-primary w-full disabled:opacity-50"
                        >
                            צור הפצה
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
