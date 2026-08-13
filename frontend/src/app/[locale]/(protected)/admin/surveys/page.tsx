'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminListProducts, adminCreateSurvey, adminListSurveys, adminUpdateSurvey, adminDeleteSurvey } from '@/lib/api';
import { Product } from '@/components/ProductTile';
import { Survey, SurveyOption } from '@/components/SurveyCard';
import { Plus, Loader2, X, ToggleLeft, ToggleRight, Trash2, CheckCircle2, AlertCircle, Pencil, Check } from 'lucide-react';

function MaxChoicesEditor({ value, onSave }: { value: number; onSave: (n: number) => Promise<void> }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [saving, setSaving] = useState(false);

    if (!editing) {
        return (
            <button
                onClick={() => { setDraft(value); setEditing(true); }}
                className="flex items-center gap-1.5 text-xs text-[#f0e6d3]/50 hover:text-[#f0e6d3] transition-colors"
                title="ערוך מספר אפשרויות לבחירה"
            >
                <Pencil size={12} /> מקסימום בחירות: <span className="font-bold text-[#d4af37]">{value}</span>
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="text-[#f0e6d3]/50">מקסימום בחירות:</span>
            <input
                type="number"
                min={1}
                value={draft}
                onChange={(e) => setDraft(Math.max(1, Number(e.target.value) || 1))}
                className="w-16 bg-[#111a2f] rounded-lg px-2 py-1 text-[#f0e6d3]"
            />
            <button
                disabled={saving}
                onClick={async () => { setSaving(true); await onSave(draft); setSaving(false); setEditing(false); }}
                className="text-green-400 hover:text-green-300"
            >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button onClick={() => setEditing(false)} className="text-[#f0e6d3]/40 hover:text-[#f0e6d3]">
                <X size={14} />
            </button>
        </div>
    );
}

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

export default function AdminSurveysPage() {
    const { token } = useAuth();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [question, setQuestion] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
    const [maxChoices, setMaxChoices] = useState(1);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    const load = () => {
        if (!token) return;
        setLoading(true);
        Promise.all([adminListSurveys(token), adminListProducts(token)])
            .then(([s, p]) => { setSurveys(s); setProducts(p); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { Promise.resolve().then(load); }, [token]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || selectedProductIds.length < 2) return;
        try {
            await adminCreateSurvey(token, {
                question_he: question,
                max_choices: Math.min(maxChoices, selectedProductIds.length),
                options: selectedProductIds.map((id) => ({ product_id: id })),
            });
            setQuestion('');
            setSelectedProductIds([]);
            setMaxChoices(1);
            setShowForm(false);
            showToast('הסקר נוצר בהצלחה ✓');
            load();
        } catch {
            showToast('שגיאה ביצירת סקר', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!token) return;
        try {
            await adminDeleteSurvey(token, id);
            setDeletingId(null);
            showToast('הסקר נמחק');
            load();
        } catch {
            showToast('שגיאה במחיקה', 'error');
        }
    };

    const productTitle = (id: number) => products.find((p) => p.id === id)?.title_he || `#${id}`;

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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
                        const total = s.options.reduce((sum: number, o: SurveyOption) => sum + o.vote_count, 0) || 1;
                        return (
                            <div key={s.id} className={`bg-[#0e1628] border rounded-3xl p-6 ${s.is_active ? 'border-[#d4af37]/20' : 'border-red-500/20 opacity-60'}`}>
                                <div className="flex items-start justify-between mb-3 gap-4">
                                    <h2 className="text-xl font-bold text-[#f0e6d3]">{s.question_he}</h2>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <button
                                            onClick={async () => {
                                                if (!token) return;
                                                await adminUpdateSurvey(token, s.id, { is_active: !s.is_active });
                                                load();
                                            }}
                                            className={`flex items-center gap-1.5 text-sm font-bold ${s.is_active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                                        >
                                            {s.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                            {s.is_active ? 'השבת' : 'הפעל'}
                                        </button>
                                        {deletingId === s.id ? (
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-[#f0e6d3]/50">בטוח?</span>
                                                <button onClick={() => handleDelete(s.id)} className="text-red-400 font-bold hover:text-red-300">כן</button>
                                                <button onClick={() => setDeletingId(null)} className="text-[#f0e6d3]/40 hover:text-[#f0e6d3]">לא</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setDeletingId(s.id)} className="text-red-400/40 hover:text-red-400 transition-colors" title="מחק סקר">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="mb-5">
                                    <MaxChoicesEditor
                                        value={s.max_choices ?? 1}
                                        onSave={async (n) => {
                                            if (!token) return;
                                            await adminUpdateSurvey(token, s.id, { max_choices: Math.min(n, s.options.length) });
                                            load();
                                        }}
                                    />
                                </div>
                                <div className="flex flex-col gap-3">
                                    {s.options.map((opt: SurveyOption) => {
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
                        <label className="flex items-center gap-3 text-sm text-[#f0e6d3]/80">
                            מספר אפשרויות לבחירה:
                            <input
                                type="number"
                                min={1}
                                max={Math.max(1, selectedProductIds.length)}
                                value={maxChoices}
                                onChange={(e) => setMaxChoices(Math.max(1, Number(e.target.value) || 1))}
                                className="w-20 bg-[#111a2f] rounded-xl px-3 py-2 text-[#f0e6d3]"
                            />
                        </label>
                        <p className="text-xs text-[#f0e6d3]/60">בחר/י לפחות 2 מוצרים כאופציות:</p>
                        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                            {products.length === 0 ? (
                                <p className="text-[#f0e6d3]/40 text-sm text-center py-4">אין מוצרים במלאי — הוסף מוצרים לפני יצירת סקר.</p>
                            ) : (
                                products.map((p) => (
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
                                ))
                            )}
                        </div>
                        <button type="submit" disabled={selectedProductIds.length < 2} className="btn-primary w-full disabled:opacity-50">שמור סקר</button>
                    </form>
                </div>
            )}
        </div>
    );
}
