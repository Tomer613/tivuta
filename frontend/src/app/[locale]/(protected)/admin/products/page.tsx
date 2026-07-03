'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminListProducts, adminCreateProduct, adminDeleteProduct } from '@/lib/api';
import { Plus, Trash2, Loader2, ArrowUpDown, X } from 'lucide-react';

const VERTICALS = ['diamonds', 'cars', 'insurance'];

export default function AdminProductsPage() {
    const { token } = useAuth();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterVertical, setFilterVertical] = useState('');
    const [sortKey, setSortKey] = useState<'title_he' | 'price' | 'vertical'>('vertical');
    const [showForm, setShowForm] = useState(false);
    const [showBatchForm, setShowBatchForm] = useState(false);
    const [batchJson, setBatchJson] = useState('');
    const [batchError, setBatchError] = useState<string | null>(null);
    const [form, setForm] = useState({ vertical: 'diamonds', title_he: '', description_he: '', price: '', image_url: '' });

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

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        await adminCreateProduct(token, {
            vertical: form.vertical,
            title_he: form.title_he,
            description_he: form.description_he,
            price: form.price ? Number(form.price) : null,
            image_url: form.image_url || null,
            is_active: true,
        });
        setForm({ vertical: 'diamonds', title_he: '', description_he: '', price: '', image_url: '' });
        setShowForm(false);
        load();
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
            load();
        } catch (err: any) {
            setBatchError(err.message || 'Invalid JSON');
        }
    };

    const handleDelete = async (id: number) => {
        if (!token) return;
        await adminDeleteProduct(token, id);
        load();
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-black text-[#f0e6d3]">מוצרים</h1>
                <div className="flex gap-3">
                    <button onClick={() => setShowBatchForm(true)} className="btn-secondary flex items-center gap-2 !text-sm">
                        <Plus size={16} /> הוסף מקבץ מוצרים
                    </button>
                    <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 !text-sm">
                        <Plus size={16} /> הוסף מוצר
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6">
                <select
                    value={filterVertical}
                    onChange={(e) => setFilterVertical(e.target.value)}
                    className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]"
                >
                    <option value="">כל העולמות</option>
                    {VERTICALS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <button
                    onClick={() => setSortKey(sortKey === 'price' ? 'title_he' : 'price')}
                    className="flex items-center gap-2 bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]"
                >
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
                                <th className="p-4 text-start">עולם</th>
                                <th className="p-4 text-start">כותרת</th>
                                <th className="p-4 text-start">מחיר</th>
                                <th className="p-4 text-start">סטטוס</th>
                                <th className="p-4 text-start"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p) => (
                                <tr key={p.id} className="border-t border-[#d4af37]/10 text-[#f0e6d3]">
                                    <td className="p-4">{p.vertical}</td>
                                    <td className="p-4">{p.title_he}</td>
                                    <td className="p-4">{p.price ? `₪${p.price}` : '-'}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.is_active ? 'bg-green-500/20 text-green-400' : 'bg-[#111a2f] text-[#f0e6d3]/40'}`}>
                                            {p.is_active ? 'פעיל' : 'מוסתר'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6" onClick={() => setShowForm(false)}>
                    <form onSubmit={handleCreate} className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-[#f0e6d3]">הוסף מוצר</h2>
                            <button type="button" onClick={() => setShowForm(false)}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>
                        <select value={form.vertical} onChange={(e) => setForm({ ...form, vertical: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]">
                            {VERTICALS.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <input required placeholder="כותרת" value={form.title_he} onChange={(e) => setForm({ ...form, title_he: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                        <textarea required placeholder="תיאור" value={form.description_he} onChange={(e) => setForm({ ...form, description_he: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                        <input type="number" placeholder="מחיר" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                        <input placeholder="שם קובץ תמונה" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                        <button type="submit" className="btn-primary w-full">שמור</button>
                    </form>
                </div>
            )}

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
