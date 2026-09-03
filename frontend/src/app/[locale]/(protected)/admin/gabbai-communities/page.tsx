'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth, User } from '@/context/AuthContext';
import { adminListUsers, adminListOrders, CustomerOrder } from '@/lib/api';
import { Loader2, Building2, Search } from 'lucide-react';

interface CommunityRow {
    name: string;
    activeGabbaiCount: number;
    orderCount: number;
    totalValue: number;
    lastOrderedAt: string | null;
}

// Community identity is the free-text name itself (see users.py's gabbai_community_suggestions —
// no separate Community entity exists by design, since multiple gabbaim can share one community).
// Everything here is derived client-side from two endpoints the admin panel already loads
// elsewhere (adminListUsers, adminListOrders) — no new backend endpoint, matching this codebase's
// established "load everything, aggregate in the browser" convention for admin stats pages.
function buildCommunityRows(users: User[], orders: CustomerOrder[]): CommunityRow[] {
    // A gabbai can rename their community later (POST /users/me/register-gabbai is an in-place
    // upsert — see ProfileClient.tsx's editable form). Each order's gabbai_community_name_snapshot
    // is deliberately frozen at checkout time and never updated, so joining order stats directly
    // on that snapshot would fragment a renamed community into two permanent rows: the old name
    // (holding all the real order history but 0 active gabbaim) and the new name (0 orders but 1
    // active gabbai). Every user's CURRENT gabbai_community_name — whether or not they're still
    // actively is_gabbai — is the most up-to-date identity we have for them, so every one of
    // their orders is attributed to that name instead; the frozen snapshot is only a fallback for
    // the (should-never-happen) case of an order whose user can no longer be found at all.
    const userCurrentCommunity: Record<number, string> = {};
    const activeGabbaiCounts: Record<string, number> = {};
    for (const u of users) {
        if (!u.gabbai_community_name) continue;
        userCurrentCommunity[u.id] = u.gabbai_community_name;
        if (u.is_gabbai) {
            activeGabbaiCounts[u.gabbai_community_name] = (activeGabbaiCounts[u.gabbai_community_name] || 0) + 1;
        }
    }

    const orderCounts: Record<string, number> = {};
    const totalValues: Record<string, number> = {};
    const lastOrderedAt: Record<string, string> = {};
    for (const order of orders) {
        // Only real gabbai orders count as community activity; a cancelled order isn't activity.
        if (order.orderer_role !== 'gabbai' || order.status === 'cancelled') continue;
        const name = userCurrentCommunity[order.user_id] || order.gabbai_community_name_snapshot;
        if (!name) continue;
        orderCounts[name] = (orderCounts[name] || 0) + 1;
        const value = order.items.reduce((sum, i) => sum + (i.unit_price_snapshot || 0) * (i.quantity || 1), 0);
        totalValues[name] = (totalValues[name] || 0) + value;
        if (!lastOrderedAt[name] || order.created_at > lastOrderedAt[name]) lastOrderedAt[name] = order.created_at;
    }

    // Union of both sources — a community with active gabbaim but no orders yet (or one whose
    // only gabbai has since deactivated but still has real order history) must both still show up.
    const names = new Set([...Object.keys(activeGabbaiCounts), ...Object.keys(orderCounts)]);
    return Array.from(names)
        .map((name) => ({
            name,
            activeGabbaiCount: activeGabbaiCounts[name] || 0,
            orderCount: orderCounts[name] || 0,
            totalValue: totalValues[name] || 0,
            lastOrderedAt: lastOrderedAt[name] || null,
        }))
        .sort((a, b) => (b.lastOrderedAt || '').localeCompare(a.lastOrderedAt || ''));
}

export default function AdminGabbaiCommunitiesPage() {
    const { token } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [orders, setOrders] = useState<CustomerOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const load = () => {
        if (!token) return;
        setLoading(true);
        Promise.all([adminListUsers(token), adminListOrders(token)])
            .then(([u, o]) => { setUsers(u); setOrders(o); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { Promise.resolve().then(load); }, [token]);

    const rows = useMemo(() => buildCommunityRows(users, orders), [users, orders]);
    const filtered = useMemo(() => {
        if (!search.trim()) return rows;
        const q = search.toLowerCase();
        return rows.filter((r) => r.name.toLowerCase().includes(q));
    }, [rows, search]);

    return (
        <div>
            <h1 className="text-2xl font-black text-[#f0e6d3] mb-6 flex items-center gap-2">
                <Building2 size={22} className="text-[#d4af37]" />
                קהילות ובתי כנסת
            </h1>

            <div className="relative mb-6 max-w-sm">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#f0e6d3]/30" />
                <input
                    placeholder="חיפוש קהילה..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-[#0e1628] border border-[#d4af37]/20 rounded-xl pr-9 pl-4 py-2 text-sm text-[#f0e6d3]"
                />
            </div>

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto" size={32} />
            ) : rows.length === 0 ? (
                <p className="text-[#f0e6d3]/40 text-sm">אין עדיין קהילות רשומות.</p>
            ) : (
                <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl overflow-x-auto">
                    <table className="w-full text-start">
                        <thead className="bg-[#111a2f] text-[#f0e6d3]/60 text-xs uppercase">
                            <tr>
                                <th className="p-4 text-start">קהילה</th>
                                <th className="p-4 text-start">גבאים פעילים</th>
                                <th className="p-4 text-start">הזמנות</th>
                                <th className="p-4 text-start">סה&quot;כ</th>
                                <th className="p-4 text-start">הזמנה אחרונה</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-[#f0e6d3]/40">אין קהילות התואמות את החיפוש.</td></tr>
                            )}
                            {filtered.map((row) => (
                                <tr key={row.name} className="border-t border-[#d4af37]/10 text-[#f0e6d3]">
                                    <td className="p-4 font-semibold">{row.name}</td>
                                    <td className="p-4 text-sm">
                                        {row.activeGabbaiCount > 0 ? (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#d4af37]/20 text-[#d4af37]">
                                                {row.activeGabbaiCount}
                                            </span>
                                        ) : (
                                            <span className="text-[#f0e6d3]/30 text-xs">0</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm">{row.orderCount}</td>
                                    <td className="p-4 text-sm font-bold text-[#d4af37]">₪{Math.round(row.totalValue).toLocaleString()}</td>
                                    <td className="p-4 text-sm text-[#f0e6d3]/60">
                                        {row.lastOrderedAt ? new Date(row.lastOrderedAt).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
