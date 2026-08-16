'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminListProducts, adminCreateSurvey, adminListSurveys, adminUpdateSurvey, adminDeleteSurvey, adminUploadImage, productImageUrl } from '@/lib/api';
import { buildSurveyShareUrl } from '@/lib/share';
import { Product } from '@/components/ProductTile';
import { Survey, SurveyOption } from '@/components/SurveyCard';
import { Plus, Loader2, X, ToggleLeft, ToggleRight, Trash2, CheckCircle2, AlertCircle, Pencil, Check, ImagePlus, Link2 } from 'lucide-react';

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

const EMPTY_TEXT_OPTIONS = ['', ''];

export default function AdminSurveysPage() {
    const { token } = useAuth();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [question, setQuestion] = useState('');
    const [pollType, setPollType] = useState<'product' | 'text'>('product');
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
    const [textOptions, setTextOptions] = useState<string[]>(EMPTY_TEXT_OPTIONS);
    const [imageUrl, setImageUrl] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
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

    const resetForm = () => {
        setQuestion('');
        setPollType('product');
        setSelectedProductIds([]);
        setTextOptions(EMPTY_TEXT_OPTIONS);
        setImageUrl('');
        setMaxChoices(1);
    };

    const optionCount = pollType === 'product' ? selectedProductIds.length : textOptions.filter((t) => t.trim()).length;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || optionCount < 2) return;
        try {
            const options = pollType === 'product'
                ? selectedProductIds.map((id) => ({ product_id: id }))
                : textOptions.filter((t) => t.trim()).map((t) => ({ label_override_he: t.trim() }));
            await adminCreateSurvey(token, {
                question_he: question,
                poll_type: pollType,
                image_url: imageUrl || null,
                max_choices: Math.min(maxChoices, options.length),
                options,
            });
            resetForm();
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

    const handleCopyLink = async (surveyId: number) => {
        try {
            await navigator.clipboard.writeText(buildSurveyShareUrl(surveyId, 'he'));
            showToast('הקישור הועתק ✓');
        } catch {
            showToast('שגיאה בהעתקת קישור', 'error');
        }
    };

    const productTitle = (id: number) => products.find((p) => p.id === id)?.title_he || `#${id}`;
    const optionLabel = (opt: SurveyOption) => opt.label_override_he || (opt.product_id ? productTitle(opt.product_id) : `#${opt.id}`);

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
                                    <div className="flex items-start gap-4">
                                        {s.image_url && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={productImageUrl(s.image_url)} alt="" className="w-14 h-14 rounded-xl object-cover bg-[#111a2f] flex-shrink-0" />
                                        )}
                                        <div>
                                            <span className={`inline-block mb-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.poll_type === 'text' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                {s.poll_type === 'text' ? 'סקר תשובות' : 'סקר מוצרים'}
                                            </span>
                                            <h2 className="text-xl font-bold text-[#f0e6d3]">{s.question_he}</h2>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <button
                                            onClick={() => handleCopyLink(s.id)}
                                            className="text-[#d4af37]/60 hover:text-[#d4af37] transition-colors flex items-center gap-1 text-xs font-bold"
                                            title="העתק קישור לסקר"
                                        >
                                            <Link2 size={14} /> העתק קישור
                                        </button>
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
                                                    <span>{optionLabel(opt)}</span>
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

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setPollType('product')}
                                className={`flex-1 py-3 rounded-xl font-bold text-sm ${pollType === 'product' ? 'bg-[#d4af37] text-[#080d1f]' : 'bg-[#111a2f] text-[#f0e6d3]'}`}
                            >
                                מוצרים
                            </button>
                            <button
                                type="button"
                                onClick={() => setPollType('text')}
                                className={`flex-1 py-3 rounded-xl font-bold text-sm ${pollType === 'text' ? 'bg-[#d4af37] text-[#080d1f]' : 'bg-[#111a2f] text-[#f0e6d3]'}`}
                            >
                                תשובות טקסט
                            </button>
                        </div>

                        <label className="flex items-center gap-3 text-sm text-[#f0e6d3]/80">
                            מספר אפשרויות לבחירה:
                            <input
                                type="number"
                                min={1}
                                max={Math.max(1, optionCount)}
                                value={maxChoices}
                                onChange={(e) => setMaxChoices(Math.max(1, Number(e.target.value) || 1))}
                                className="w-20 bg-[#111a2f] rounded-xl px-3 py-2 text-[#f0e6d3]"
                            />
                        </label>

                        {/* Image */}
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">תמונת הסקר (אופציונלי)</label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file || !token) return;
                                    setUploadingImage(true);
                                    try {
                                        const { filename } = await adminUploadImage(token, file);
                                        setImageUrl(filename);
                                    } catch {
                                        showToast('שגיאה בהעלאת תמונה', 'error');
                                    } finally {
                                        setUploadingImage(false);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }
                                }}
                            />
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-start flex items-center gap-3 hover:bg-[#1a2540] disabled:opacity-60 transition-colors">
                                {uploadingImage ? <Loader2 size={18} className="text-[#d4af37]/60 shrink-0 animate-spin" /> : <ImagePlus size={18} className="text-[#d4af37]/60 shrink-0" />}
                                <span className={imageUrl ? 'text-[#f0e6d3]' : 'text-[#f0e6d3]/30'}>
                                    {uploadingImage ? 'מעלה...' : imageUrl || 'לחץ לבחירת תמונה...'}
                                </span>
                            </button>
                            {imageUrl && (
                                <button type="button" onClick={() => setImageUrl('')} className="text-red-400/60 hover:text-red-400 text-xs mt-1">
                                    הסר תמונה
                                </button>
                            )}
                        </div>

                        {pollType === 'product' ? (
                            <>
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
                            </>
                        ) : (
                            <>
                                <p className="text-xs text-[#f0e6d3]/60">הזן/י לפחות 2 תשובות אפשריות:</p>
                                <div className="flex flex-col gap-2">
                                    {textOptions.map((opt, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <input
                                                value={opt}
                                                onChange={(e) => setTextOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))}
                                                placeholder={`תשובה ${i + 1}`}
                                                className="flex-1 bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3] text-sm"
                                            />
                                            {textOptions.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setTextOptions((prev) => prev.filter((_, idx) => idx !== i))}
                                                    className="text-red-400/60 hover:text-red-400"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setTextOptions((prev) => [...prev, ''])}
                                    className="text-sm font-bold text-[#d4af37] hover:text-[#f0e6d3] flex items-center gap-1"
                                >
                                    <Plus size={14} /> הוסף תשובה
                                </button>
                            </>
                        )}

                        <button type="submit" disabled={optionCount < 2} className="btn-primary w-full disabled:opacity-50">שמור סקר</button>
                    </form>
                </div>
            )}
        </div>
    );
}
