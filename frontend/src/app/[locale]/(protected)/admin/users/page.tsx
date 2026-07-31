'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminListUsers, adminCreateUser, adminSetUserRole, adminDeleteUser } from '@/lib/api';
import { Plus, Loader2, X, ShieldCheck, ShieldOff, Trash2, CheckCircle2, AlertCircle, Search } from 'lucide-react';

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

export default function AdminUsersPage() {
    const { token } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '' });
    const [confirmRoleId, setConfirmRoleId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    const load = () => {
        if (!token) return;
        setLoading(true);
        adminListUsers(token).then(setUsers).finally(() => setLoading(false));
    };

    useEffect(load, [token]);

    const filtered = useMemo(() => {
        return users.filter((u) => {
            if (filterRole && u.role !== filterRole) return false;
            if (search) {
                const q = search.toLowerCase();
                if (!`${u.first_name} ${u.last_name} ${u.email} ${u.phone ?? ''}`.toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [users, search, filterRole]);

    const counts = useMemo(() => ({
        total: users.length,
        admin: users.filter((u) => u.role === 'admin').length,
        member: users.filter((u) => u.role === 'member').length,
    }), [users]);

    const toggleRole = async (u: any) => {
        if (!token) return;
        const nextRole = u.role === 'admin' ? 'member' : 'admin';
        try {
            await adminSetUserRole(token, u.id, nextRole);
            showToast(nextRole === 'admin' ? `${u.first_name} הפך למנהל ✓` : `הרשאת מנהל הוסרה מ-${u.first_name}`);
            load();
        } catch {
            showToast('שגיאה בשינוי הרשאה', 'error');
        }
        setConfirmRoleId(null);
    };

    const handleDelete = async (u: any) => {
        if (!token) return;
        try {
            await adminDeleteUser(token, u.id);
            setDeletingId(null);
            showToast(`${u.first_name} נמחק`);
            load();
        } catch (err: any) {
            showToast(err.message || 'שגיאה במחיקה', 'error');
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        try {
            await adminCreateUser(token, form);
            setForm({ first_name: '', last_name: '', email: '', phone: '', password: '' });
            setShowForm(false);
            showToast('המשתמש נוצר בהצלחה ✓');
            load();
        } catch (err: any) {
            showToast(err.message || 'שגיאה ביצירת המשתמש', 'error');
        }
    };

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-6">
                    <h1 className="text-3xl font-black text-[#f0e6d3]">משתמשים</h1>
                    <div className="flex gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-black text-[#f0e6d3]">{counts.total}</div>
                            <div className="text-xs text-[#f0e6d3]/40">סה"כ</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-black text-[#d4af37]">{counts.admin}</div>
                            <div className="text-xs text-[#f0e6d3]/40">מנהלים</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-black text-[#f0e6d3]">{counts.member}</div>
                            <div className="text-xs text-[#f0e6d3]/40">חברים</div>
                        </div>
                    </div>
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 !text-sm">
                    <Plus size={16} /> הוסף משתמש
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative">
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#f0e6d3]/30" />
                    <input
                        placeholder="חיפוש שם / מייל / טלפון..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl pr-9 pl-4 py-2 text-sm text-[#f0e6d3] w-60"
                    />
                </div>
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3]">
                    <option value="">כל התפקידים</option>
                    <option value="member">חברים בלבד</option>
                    <option value="admin">מנהלים בלבד</option>
                </select>
            </div>

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={32} />
            ) : (
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-x-auto">
                    <table className="w-full text-start">
                        <thead className="bg-[#111a2f] text-[#f0e6d3]/60 text-xs uppercase">
                            <tr>
                                <th className="p-4 text-start">שם</th>
                                <th className="p-4 text-start">אימייל</th>
                                <th className="p-4 text-start">טלפון</th>
                                <th className="p-4 text-start">תפקיד</th>
                                <th className="p-4 text-start"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-[#f0e6d3]/40">אין משתמשים התואמים את הסינון.</td></tr>
                            )}
                            {filtered.map((u) => (
                                <tr key={u.id} className="border-t border-[#d4af37]/10 text-[#f0e6d3] hover:bg-[#111a2f]/40 transition-colors">
                                    <td className="p-4 font-semibold">{u.first_name} {u.last_name}</td>
                                    <td className="p-4 text-sm text-[#f0e6d3]/70" dir="ltr">{u.email}</td>
                                    <td className="p-4 text-sm text-[#f0e6d3]/70" dir="ltr">{u.phone || '—'}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-[#d4af37] text-[#080d1f]' : 'bg-[#111a2f] text-[#f0e6d3]/60'}`}>
                                            {u.role === 'admin' ? 'מנהל' : 'חבר'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-4">
                                            {/* Role toggle */}
                                            {confirmRoleId === u.id ? (
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-[#f0e6d3]/60">{u.role === 'admin' ? 'להסיר הרשאה?' : 'להפוך למנהל?'}</span>
                                                    <button onClick={() => toggleRole(u)} className="text-[#d4af37] font-bold hover:text-[#f0c94a]">כן</button>
                                                    <button onClick={() => setConfirmRoleId(null)} className="text-[#f0e6d3]/40 hover:text-[#f0e6d3]">לא</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setConfirmRoleId(u.id)} className="flex items-center gap-1 text-xs font-bold text-[#d4af37]/60 hover:text-[#d4af37] transition-colors" title={u.role === 'admin' ? 'הסר הרשאת מנהל' : 'הפוך למנהל'}>
                                                    {u.role === 'admin' ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                                                    {u.role === 'admin' ? 'הסר הרשאה' : 'הפוך למנהל'}
                                                </button>
                                            )}
                                            {/* Delete — only for members */}
                                            {u.role !== 'admin' && (
                                                deletingId === u.id ? (
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <span className="text-[#f0e6d3]/50">בטוח?</span>
                                                        <button onClick={() => handleDelete(u)} className="text-red-400 font-bold hover:text-red-300">כן</button>
                                                        <button onClick={() => setDeletingId(null)} className="text-[#f0e6d3]/40 hover:text-[#f0e6d3]">לא</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setDeletingId(u.id)} className="text-red-400/30 hover:text-red-400 transition-colors" title="מחק משתמש">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-6" onClick={() => setShowForm(false)}>
                    <form onSubmit={handleCreate} className="bg-[#0e1628] border border-[#d4af37]/30 rounded-3xl p-8 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-[#f0e6d3]">הוסף משתמש</h2>
                            <button type="button" onClick={() => setShowForm(false)}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">שם פרטי</label>
                            <input required placeholder="ישראל" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                        </div>
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">שם משפחה</label>
                            <input required placeholder="ישראלי" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                        </div>
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">אימייל</label>
                            <input required type="email" placeholder="mail@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" dir="ltr" />
                        </div>
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">טלפון (אופציונלי)</label>
                            <input placeholder="050-0000000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" dir="ltr" />
                        </div>
                        <div>
                            <label className="text-xs text-[#f0e6d3]/50 mb-1 block">סיסמה</label>
                            <input required type="password" placeholder="לפחות 8 תווים" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                        </div>
                        <button type="submit" className="btn-primary w-full">שמור</button>
                    </form>
                </div>
            )}
        </div>
    );
}
