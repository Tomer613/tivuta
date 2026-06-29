'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminListProducts, adminCreateSurvey, getSurveys } from '@/lib/api';
import { Plus, Loader2, X } from 'lucide-react';

export default function AdminSurveysPage() {
    const { token } = useAuth();
    const [surveys, setSurveys] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [question, setQuestion] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

    const load = () => {
        if (!token) return;
        setLoading(true);
        Promise.all([getSurveys(token), adminListProducts(token)])
            .then(([s, p]) => { setSurveys(s); setProducts(p); })
            .finally(() => setLoading(false));
    };

    useEffect(load, [token]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || selectedProductIds.length < 2) return;
        await adminCreateSurvey(token, {
            question_he: question,
            options: selectedProductIds.map((id) => ({ product_id: id })),
        });
        setQuestion('');
        setSelectedProductIds([]);
        setShowForm(false);
        load();
    };

    const productTitle = (id: number) => products.find((p) => p.id === id)?.title_he || `#${id}`;

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-black text-[#f0e6d3]">סקרים</h1>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 !text-sm">
                    <Plus size={16} /> הוסף סקר
                </button>
            </div>

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={32} />
            ) : (
                <div className="flex flex-col gap-6">
                    {surveys.map((s) => {
                        const total = s.options.reduce((sum: number, o: any) => sum + o.vote_count, 0) || 1;
                        return (
                            <div key={s.id} className="bg-[#0e1628] border border-[#d4af37]/20 rounded-3xl p-6">
                                <h2 className="text-xl font-bold text-[#f0e6d3] mb-5">{s.question_he}</h2>
                                <div className="flex flex-col gap-3">
                                    {s.options.map((opt: any) => {
                                        const pct = Math.round((opt.vote_count / total) * 100);
                                        return (
                                            <div key={opt.id} className="relative bg-[#111a2f] rounded-xl p-4 overflow-hidden">
                                                <div className="absolute inset-y-0 start-0 bg-[#d4af37]/20" style={{ width: `${pct}%` }} />
                                                <div className="relative flex justify-between text-sm font-bold text-[#f0e6d3]">
                                                    <span>{opt.label_override_he || productTitle(opt.product_id)}</span>
                                                    <span className="text-[#d4af37]">{pct}% ({opt.vote_count})</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                    {surveys.length === 0 && <p className="text-[#f0e6d3]/60">אין סקרים עדיין.</p>}
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6" onClick={() => setShowForm(false)}>
                    <form onSubmit={handleCreate} className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-lg space-y-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-[#f0e6d3]">הוסף סקר</h2>
                            <button type="button" onClick={() => setShowForm(false)}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>
                        <input required placeholder="שאלת הסקר" value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                        <p className="text-xs text-[#f0e6d3]/60">בחר/י לפחות 2 מוצרים כאופציות:</p>
                        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                            {products.map((p) => (
                                <label key={p.id} className="flex items-center gap-3 bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3] text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedProductIds.includes(p.id)}
                                        onChange={(e) => {
                                            setSelectedProductIds((prev) =>
                                                e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                                            );
                                        }}
                                    />
                                    {p.title_he} ({p.vertical})
                                </label>
                            ))}
                        </div>
                        <button type="submit" disabled={selectedProductIds.length < 2} className="btn-primary w-full disabled:opacity-50">שמור סקר</button>
                    </form>
                </div>
            )}
        </div>
    );
}
