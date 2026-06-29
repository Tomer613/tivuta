'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminListUsers, adminCreateUser, adminSetUserRole } from '@/lib/api';
import { Plus, Loader2, X, ShieldCheck } from 'lucide-react';

export default function AdminUsersPage() {
    const { token } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '' });

    const load = () => {
        if (!token) return;
        setLoading(true);
        adminListUsers(token).then(setUsers).finally(() => setLoading(false));
    };

    useEffect(load, [token]);

    const filtered = useMemo(() => {
        if (!search) return users;
        const q = search.toLowerCase();
        return users.filter((u) => `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(q));
    }, [users, search]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        await adminCreateUser(token, form);
        setForm({ first_name: '', last_name: '', email: '', phone: '', password: '' });
        setShowForm(false);
        load();
    };

    const toggleRole = async (u: any) => {
        if (!token) return;
        const nextRole = u.role === 'admin' ? 'member' : 'admin';
        await adminSetUserRole(token, u.id, nextRole);
        load();
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-black text-[#f0e6d3]">משתמשים</h1>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 !text-sm">
                    <Plus size={16} /> הוסף משתמש
                </button>
            </div>

            <input
                placeholder="חיפוש משתמש..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-2 text-sm text-[#f0e6d3] mb-6 w-full max-w-sm"
            />

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={32} />
            ) : (
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-hidden">
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
                            {filtered.map((u) => (
                                <tr key={u.id} className="border-t border-[#d4af37]/10 text-[#f0e6d3]">
                                    <td className="p-4">{u.first_name} {u.last_name}</td>
                                    <td className="p-4">{u.email}</td>
                                    <td className="p-4">{u.phone || '-'}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-[#d4af37] text-[#080d1f]' : 'bg-[#111a2f] text-[#f0e6d3]/60'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => toggleRole(u)} className="flex items-center gap-1 text-xs font-bold text-[#d4af37] hover:underline">
                                            <ShieldCheck size={14} />
                                            {u.role === 'admin' ? 'הסר הרשאת אדמין' : 'הפוך למנהל'}
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
                            <h2 className="text-xl font-black text-[#f0e6d3]">הוסף משתמש</h2>
                            <button type="button" onClick={() => setShowForm(false)}><X size={20} className="text-[#f0e6d3]/60" /></button>
                        </div>
                        <input required placeholder="שם פרטי" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                        <input required placeholder="שם משפחה" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                        <input required type="email" placeholder="אימייל" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                        <input placeholder="טלפון" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                        <input required type="password" placeholder="סיסמה" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full bg-[#111a2f] rounded-xl px-4 py-3 text-[#f0e6d3]" />
                        <button type="submit" className="btn-primary w-full">שמור</button>
                    </form>
                </div>
            )}
        </div>
    );
}
