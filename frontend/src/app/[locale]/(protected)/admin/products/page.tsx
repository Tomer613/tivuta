'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminListProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct } from '@/lib/api';
import { Plus, Trash2, Loader2, ArrowUpDown, X, ImagePlus, Pencil, CheckCircle2, AlertCircle } from 'lucide-react';

const VERTICALS = [
    { value: 'diamonds', label: 'יהלומים' },
    { value: 'cars',     label: 'רכב' },
    { value: 'insurance', label: 'ביטוח' },
];

const VERTICAL_LABEL: Record<string, string> = { diamonds: 'יהלומים', cars: 'רכב', insurance: 'ביטוח' };

const EMPTY_FORM = { vertical: 'diamonds', title_he: '', description_he: '', price: '', image_url: '' };

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

export default function AdminProductsPage() {
    const { token } = useAuth();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterVertical, setFilterVertical] = useState('');
    const [sortKey, setSortKey] = useState<'title_he' | 'price' | 'vertical'>('vertical');
    const [showForm, setShowForm] = useState(false);
    const [editProduct, setEditProduct] = useState<any | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [showBatchForm, setShowBatchForm] = useState(false);
    const [batchJson, setBatchJson] = useState('');
    const [batchError, setBatchError] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    const load = () => {
        if (!token) return;
        setLoading(true);
        adminListProducts(token).then(setProducts).finally(() => setLoading(false));
    };

    useEffect(load, [token]);

    const filtered = useMemo(() => {
        let list = filterVertical ? products.filter((p) => p.vertical === filterVertical) : products;
        list = [...list].sort((a, b) => {
            if (sortKey === 'price') return (a.price || 0) - (b.price || 0);
            return String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''));
        });
        return list;
    }, [products, filterVertical, sortKey]);

    const openEditForm = (p: any) => {
        setEditProduct(p);
        setForm({ vertical: p.vertical, title_he: p.title_he, description_he: p.description_he, price: p.price ? String(p.price) : '', image_url: p.image_url || '' });
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditProduct(null);
        setForm(EMPTY_FORM);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        const payload = { vertical: form.vertical, title_he: form.title_he, description_he: form.description_he, price: form.price ? Number(form.price) : null, image_url: form.image_url || null, is_active: true };
        try {
            if (editProduct) {
                await adminUpdateProduct(token, editProduct.id, payload);
                showToast('המוצר עודכן בהצלחה ✓');
            } else {
                await adminCreateProduct(token, payload);
                showToast('המוצר נוצר בהצלחה ✓');
            }
            closeForm();
            load();
        } catch {
            showToast('שגיאה בשמירה', 'error');
        }
    };

    const handleBatchCreate = async () => {
        if (!token) return;
        setBatchError(null);
        try {
            const parsed = JSON.parse(batchJson);
            if (!Array.isArray(parsed)) throw new Error('Must be a JSON array');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/admin/products/batch`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(parsed),
            });
            if (!res.ok) throw new Error('Failed to create batch');
            setBatchJson('');
            setShowBatchForm(false);
            showToast(`${parsed.length} מוצרים הועלו בהצלחה ✓`);
            load();
        } catch (err: any) {
            setBatchError(err.message || 'Invalid JSON');
        }
    };

    const handleDelete = async (id: number) => {
        if (!token) return;
        try {
            await adminDeleteProduct(token, id);
            setDeletingId(null);
            showToast('המוצר נמחק');
            load();
        } catch {
            showToast('שגיאה במחיקה', 'error');
        }
    };

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-black text-[#f0e6d3]">מוצרים</h1>
                <div className="flex gap-3">
                    <button onClick={() => setShowBatchForm(true)} className="btn-secondary flex items-center gap-2 !text-sm">
                        <Plus size={16} /> הוסף מקבץ מוצרים
                    </button>
                    <button onClick={() => { setEditProduct(null); setForm(EMPTY_FORM); setShowForm(true); }} className="btn-primary flex items-center gap-2 !text-sm">
                        <Plus size={16} /> הוסף מוצר
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6">
                <select value={filterVertical} onChange={(e) => setFilterVertical(e.target.value)} className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]">
                    <option value="">כל העולמות</option>
                    {VERTICALS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
                <button onClick={() => setSortKey(sortKey === 'price' ? 'title_he' : 'price')} className="flex items-center gap-2 bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]">
                    <ArrowUpDown size={14} /> מיין לפי {sortKey === 'price' ? 'מחיר' : 'שם'}
                </button>
            </div>

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={32} />
            ) : (
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-hidden">
                    <table className="w-full text-start">
                        <thead className="bg-[#111a2f] text-[#f0e6d3]/60 text-xs uppercase">
                            <tr>
                                <th className="p-3 w-14"></th>
                                <th className="p-4 text-start">עולם</th>
                                <th className="p-4 text-start">כותרת</th>
                                <th className="p-4 text-start">מחיר</th>
                                <th className="p-4 text-start">סטטוס</th>
                                <th className="p-4 text-start"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-[#f0e6d3]/40">אין מוצרים עדיין</td></tr>
                            )}
                            {filtered.map((p) => (
                                <tr key={p.id} className="border-t border-[#d4af37]/10 text-[#f0e6d3]">
                                    <td className="p-3">
                                        {p.image_url ? (
                                            <img src={`/images/products/${p.image_url}`} alt="" className="w-10 h-10 rounded-lg object-cover bg-[#111a2f]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-[#111a2f] flex items-center justify-center">
                                                <ImagePlus size={13} className="text-[#f0e6d3]/20" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm">{VERTICAL_LABEL[p.vertical] ?? p.vertical}</td>
                                    <td className="p-4 font-semibold">{p.title_he}</td>
                                    <td className="p-4 text-sm">{p.price ? `₪${Number(p.price).toLocaleString()}` : '-'}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.is_active ? 'bg-green-500/20 text-green-400' : 'bg-[#111a2f] text-[#f0e6d3]/40'}`}>
                                            {p.is_active ? 'פעיל' : 'מוסתר'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => openEditForm(p)} className="text-[#d4af37]/50 hover:text-[#d4af37] transition-colors" title="עריכה">
                                                <Pencil size={15} />
                                            </button>
                                            {deletingId === p.id ? (
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-[#f0e6d3]/50">בטוח?</span>
                                                    <button onClick={() => handleDelete(p.id)} className="text-red-400 font-bold hover:text-red-300">כן</button>
                                                    <button onClick={() => setDeletingId(null)} className="text-[#f0e6d3]/40 hover:text-[#f0e6d3]">לא</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setDeletingId(p.id)} className="text-red-400/40 hover:text-red-400 transition-colors" title="מחיקה">
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add / Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6" onClick={closeForm}>
                    <form onSubmit={handleSubmit} className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-[#f0e6d3]">{editProduct ? 'עריכת מוצר' : 'הוסף מוצר'}</h2>
                            <button type="button" onClick={closeForm}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">עולם המוצר</label>
                            <select value={form.vertical} onChange={(e) => setForm({ ...form, vertical: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]">
                                {VERTICALS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">כותרת המוצר (עברית)</label>
                            <input required placeholder="לדוגמה: יהלום 1 קרט" value={form.title_he} onChange={(e) => setForm({ ...form, title_he: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                        </div>

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">תיאור (עברית)</label>
                            <textarea required placeholder="תיאור קצר של המוצר..." value={form.description_he} onChange={(e) => setForm({ ...form, description_he: e.target.value })} rows={3} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3] resize-none" />
                        </div>

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">מחיר (₪)</label>
                            <input type="number" min={0} placeholder="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                        </div>

                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">תמונת מוצר</label>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setForm({ ...form, image_url: file.name }); }} />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-start flex items-center gap-3 hover:bg-[#1a2540] transition-colors">
                                <ImagePlus size={18} className="text-[#d4af37]/60 shrink-0" />
                                <span className={form.image_url ? 'text-[#f0e6d3]' : 'text-[#f0e6d3]/30'}>{form.image_url || 'לחץ לבחירת תמונה...'}</span>
                            </button>
                            <p className="text-[#f0e6d3]/25 text-xs mt-1">יש להעתיק את הקובץ לתיקייה: frontend/public/images/products/</p>
                        </div>

                        <button type="submit" className="btn-primary w-full">{editProduct ? 'שמור שינויים' : 'שמור'}</button>
                    </form>
                </div>
            )}

            {/* Batch Modal */}
            {showBatchForm && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6" onClick={() => setShowBatchForm(false)}>
                    <div className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-[#f0e6d3]">הוסף מקבץ מוצרים (JSON)</h2>
                            <button onClick={() => setShowBatchForm(false)}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>
                        <p className="text-xs text-[#f0e6d3]/60">לדוגמה: [{"{"}"vertical":"cars","title_he":"...","description_he":"..."{"}"}]</p>
                        {batchError && <p className="text-red-400 text-sm">{batchError}</p>}
                        <textarea rows={8} value={batchJson} onChange={(e) => setBatchJson(e.target.value)} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3] font-mono text-xs" />
                        <button onClick={handleBatchCreate} className="btn-primary w-full">העלה מקבץ</button>
                    </div>
                </div>
            )}
        </div>
    );
}
