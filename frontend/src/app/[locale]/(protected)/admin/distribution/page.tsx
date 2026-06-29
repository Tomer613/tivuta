'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminListDistributions, adminCreateDistribution, adminSendDistribution, getSurveys, adminListProducts } from '@/lib/api';
import { Plus, Loader2, X, Send, Mail, MessageCircle } from 'lucide-react';

export default function AdminDistributionPage() {
    const { token } = useAuth();
    const [distributions, setDistributions] = useState<any[]>([]);
    const [surveys, setSurveys] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [sendingId, setSendingId] = useState<number | null>(null);

    const [form, setForm] = useState({
        distribution_type: 'daily_deal' as 'daily_deal' | 'survey',
        survey_id: '',
        product_id: '',
        title_he: '',
        message_he: '',
        channels: ['email'] as string[],
    });

    const load = () => {
        if (!token) return;
        setLoading(true);
        Promise.all([adminListDistributions(token), getSurveys(token), adminListProducts(token)])
            .then(([d, s, p]) => { setDistributions(d); setSurveys(s); setProducts(p); })
            .finally(() => setLoading(false));
    };

    useEffect(load, [token]);

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
            message_he: form.message_he,
            channels: form.channels,
        });
        setShowForm(false);
        load();
    };

    const handleSend = async (id: number) => {
        if (!token) return;
        setSendingId(id);
        await adminSendDistribution(token, id);
        setTimeout(load, 1500);
        setSendingId(null);
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
                                <th className="p-4 text-start">כותרת</th>
                                <th className="p-4 text-start">ערוצים</th>
                                <th className="p-4 text-start">סטטוס</th>
                                <th className="p-4 text-start"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {distributions.map((d) => (
                                <tr key={d.id} className="border-t border-[#d4af37]/10 text-[#f0e6d3]">
                                    <td className="p-4">{d.distribution_type === 'survey' ? 'סקר' : 'דיל היומי'}</td>
                                    <td className="p-4">{d.title_he || '-'}</td>
                                    <td className="p-4 flex gap-2">
                                        {d.channels.includes('email') && <Mail size={16} className="text-[#d4af37]" />}
                                        {d.channels.includes('whatsapp') && <MessageCircle size={16} className="text-[#d4af37]" />}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${d.status === 'sent' ? 'bg-green-500/20 text-green-400' : d.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-[#111a2f] text-[#f0e6d3]/60'}`}>
                                            {d.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {d.status === 'draft' && (
                                            <button onClick={() => handleSend(d.id)} disabled={sendingId === d.id} className="flex items-center gap-1 text-xs font-bold text-[#d4af37] hover:underline disabled:opacity-50">
                                                <Send size={14} /> שלח
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {distributions.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-[#f0e6d3]/60">אין הפצות עדיין.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6" onClick={() => setShowForm(false)}>
                    <form onSubmit={handleCreate} className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-[#f0e6d3]">הפצה חדשה</h2>
                            <button type="button" onClick={() => setShowForm(false)}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>

                        <div className="flex gap-3">
                            <button type="button" onClick={() => setForm({ ...form, distribution_type: 'daily_deal' })} className={`flex-1 py-3 rounded-xl font-bold text-sm ${form.distribution_type === 'daily_deal' ? 'bg-[#d4af37] text-[#080d1f]' : 'bg-[#111a2f] text-[#f0e6d3]'}`}>דיל היומי</button>
                            <button type="button" onClick={() => setForm({ ...form, distribution_type: 'survey' })} className={`flex-1 py-3 rounded-xl font-bold text-sm ${form.distribution_type === 'survey' ? 'bg-[#d4af37] text-[#080d1f]' : 'bg-[#111a2f] text-[#f0e6d3]'}`}>סקר</button>
                        </div>

                        {form.distribution_type === 'daily_deal' ? (
                            <select required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]">
                                <option value="">בחר מוצר...</option>
                                {products.map((p) => <option key={p.id} value={p.id}>{p.title_he}</option>)}
                            </select>
                        ) : (
                            <select required value={form.survey_id} onChange={(e) => setForm({ ...form, survey_id: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]">
                                <option value="">בחר סקר...</option>
                                {surveys.map((s) => <option key={s.id} value={s.id}>{s.question_he}</option>)}
                            </select>
                        )}

                        <input required placeholder="כותרת ההודעה" value={form.title_he} onChange={(e) => setForm({ ...form, title_he: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                        <textarea placeholder="תוכן ההודעה" value={form.message_he} onChange={(e) => setForm({ ...form, message_he: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />

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

                        <button type="submit" className="btn-primary w-full">צור הפצה</button>
                    </form>
                </div>
            )}
        </div>
    );
}
