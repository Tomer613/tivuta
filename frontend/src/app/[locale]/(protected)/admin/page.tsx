'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Inbox, Package, Users, Tag, Send, Loader2, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { adminGetStats } from '@/lib/api';

const STAT_CARDS = [
    { key: 'open_leads',         label: 'פניות פתוחות',     href: 'leads',        color: 'text-blue-400',   ring: 'ring-blue-500/20',   bg: 'bg-blue-500/10' },
    { key: 'active_products',    label: 'מוצרים פעילים',    href: 'products',     color: 'text-green-400',  ring: 'ring-green-500/20',  bg: 'bg-green-500/10' },
    { key: 'member_count',       label: 'חברים',            href: 'users',        color: 'text-[#d4af37]',  ring: 'ring-[#d4af37]/20',  bg: 'bg-[#d4af37]/10' },
    { key: 'active_promotions',  label: 'מבצעים פעילים',   href: 'promotions',   color: 'text-purple-400', ring: 'ring-purple-500/20', bg: 'bg-purple-500/10' },
    { key: 'draft_distributions',label: 'קמפיינים בטיוטה',  href: 'distribution', color: 'text-orange-400', ring: 'ring-orange-500/20', bg: 'bg-orange-500/10' },
] as const;

const ICONS: Record<string, React.FC<{ size: number; className?: string }>> = {
    open_leads:          Inbox,
    active_products:     Package,
    member_count:        Users,
    active_promotions:   Tag,
    draft_distributions: Send,
};

export default function AdminDashboardPage() {
    const { token } = useAuth();
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const [stats, setStats] = useState<Record<string, number> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        adminGetStats(token).then(setStats).catch(() => setStats(null)).finally(() => setLoading(false));
    }, [token]);

    return (
        <div>
            <div className="flex items-center gap-3 mb-2">
                <TrendingUp size={28} className="text-[#d4af37]" />
                <h1 className="text-3xl font-black text-[#f0e6d3]">לוח בקרה</h1>
            </div>
            <p className="text-[#f0e6d3]/40 text-sm mb-10">סקירת מצב כללית — לחץ על כרטיס לניהול</p>

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto mt-20" size={32} />
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                    {STAT_CARDS.map(({ key, label, href, color, ring, bg }) => {
                        const Icon = ICONS[key];
                        const value = stats?.[key] ?? '—';
                        const isAlert = key === 'open_leads' && (stats?.[key] ?? 0) > 0;
                        return (
                            <Link
                                key={key}
                                href={`/${locale}/admin/${href}`}
                                className={`bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-6 hover:border-[#d4af37]/50 hover:bg-[#111a2f] transition-all group ${isAlert ? `ring-2 ${ring}` : ''}`}
                            >
                                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <Icon size={20} className={color} />
                                </div>
                                <div className={`text-4xl font-black mb-1 ${color}`}>{value}</div>
                                <div className="text-xs text-[#f0e6d3]/50 font-semibold leading-tight">{label}</div>
                                {isAlert && (
                                    <div className="mt-2 text-[10px] text-blue-400 font-bold">דורש טיפול</div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href={`/${locale}/admin/leads`} className="bg-[#0e1628] border border-[#d4af37]/10 rounded-2xl p-5 hover:border-[#d4af37]/30 transition-colors group">
                    <p className="text-xs text-[#f0e6d3]/40 font-bold uppercase tracking-widest mb-1">פניות חדשות</p>
                    <p className="text-[#f0e6d3]/70 text-sm group-hover:text-[#f0e6d3]">
                        {stats?.open_leads ? `${stats.open_leads} פניות ממתינות לטיפול` : 'אין פניות פתוחות'}
                    </p>
                </Link>
                <Link href={`/${locale}/admin/distribution`} className="bg-[#0e1628] border border-[#d4af37]/10 rounded-2xl p-5 hover:border-[#d4af37]/30 transition-colors group">
                    <p className="text-xs text-[#f0e6d3]/40 font-bold uppercase tracking-widest mb-1">קמפיינים</p>
                    <p className="text-[#f0e6d3]/70 text-sm group-hover:text-[#f0e6d3]">
                        {stats?.draft_distributions ? `${stats.draft_distributions} קמפיינים ממתינים לשליחה` : 'אין קמפיינים בטיוטה'}
                    </p>
                </Link>
                <Link href={`/${locale}/admin/products`} className="bg-[#0e1628] border border-[#d4af37]/10 rounded-2xl p-5 hover:border-[#d4af37]/30 transition-colors group">
                    <p className="text-xs text-[#f0e6d3]/40 font-bold uppercase tracking-widest mb-1">מוצרים</p>
                    <p className="text-[#f0e6d3]/70 text-sm group-hover:text-[#f0e6d3]">
                        {stats?.active_products ? `${stats.active_products} מוצרים פעילים זמינים לחברים` : 'אין מוצרים פעילים'}
                    </p>
                </Link>
            </div>
        </div>
    );
}
