'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Inbox, Package, Users, Tag, Send, Loader2, TrendingUp, Bell, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { adminGetStats, adminGetLeadStats, adminGetConversionStats, adminSendFollowupReminders } from '@/lib/api';
import { useVerticals } from '@/lib/useVerticals';
import { getVerticalIcon } from '@/lib/verticalIcons';

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

function LeadsChart({ chartData }: { chartData: { date: string; count: number }[] }) {
    if (!chartData.length) return null;
    const max = Math.max(...chartData.map((d) => d.count), 1);
    return (
        <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-6 mt-8">
            <h3 className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest mb-6 flex items-center gap-2">
                <TrendingUp size={13} className="text-[#d4af37]" /> פניות — 14 ימים אחרונים
            </h3>
            <div className="flex items-end gap-1.5 h-28">
                {chartData.map((d) => {
                    const pct = (d.count / max) * 100;
                    const dayLabel = new Date(d.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
                    return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group" title={`${dayLabel}: ${d.count} פניות`}>
                            <div className="text-[9px] text-[#f0e6d3]/0 group-hover:text-[#d4af37] transition-colors font-bold whitespace-nowrap">
                                {d.count > 0 ? d.count : ''}
                            </div>
                            <div className="w-full flex items-end h-20">
                                <div
                                    className="w-full rounded-t-md transition-all duration-500 group-hover:opacity-80"
                                    style={{
                                        height: `${Math.max(pct, d.count > 0 ? 8 : 2)}%`,
                                        background: d.count > 0
                                            ? 'linear-gradient(to top, #b8860b, #d4af37)'
                                            : 'rgba(212,175,55,0.08)',
                                    }}
                                />
                            </div>
                            <div className="text-[9px] text-[#f0e6d3]/30 whitespace-nowrap">{dayLabel}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ConversionPanel({ data }: { data: { vertical: string; total: number; confirmed: number; contacted: number; closed: number; conversion_rate: number }[] }) {
    const verticals = useVerticals();
    if (!data.length) return null;
    return (
        <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-6 mt-8">
            <h3 className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest mb-6 flex items-center gap-2">
                <TrendingUp size={13} className="text-[#d4af37]" /> קונברסיה לפי ורטיקל
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.map((d) => {
                    const meta = verticals.find((v) => v.slug === d.vertical);
                    const Icon = getVerticalIcon(meta?.icon || 'Store');
                    return (
                        <div key={d.vertical} className="bg-[#111a2f] rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Icon size={16} className="text-[#d4af37]" />
                                <span className="text-sm font-bold text-[#f0e6d3]">{meta?.label_he || d.vertical}</span>
                            </div>
                            <div className="text-3xl font-black text-[#d4af37] mb-1">{d.conversion_rate}%</div>
                            <div className="text-[10px] text-[#f0e6d3]/40 mb-3">קונברסיה ({d.confirmed + d.contacted + d.closed}/{d.total} פניות)</div>
                            <div className="h-2 bg-[#0e1628] rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${Math.min(d.conversion_rate, 100)}%`,
                                        background: 'linear-gradient(to right, #b8860b, #d4af37)',
                                    }}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-1 mt-3 text-center">
                                <div><div className="text-xs font-black text-green-400">{d.confirmed}</div><div className="text-[9px] text-[#f0e6d3]/30">מאושר</div></div>
                                <div><div className="text-xs font-black text-[#d4af37]">{d.contacted}</div><div className="text-[9px] text-[#f0e6d3]/30">טופל</div></div>
                                <div><div className="text-xs font-black text-[#f0e6d3]/40">{d.closed}</div><div className="text-[9px] text-[#f0e6d3]/30">סגור</div></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function AdminDashboardPage() {
    const { token } = useAuth();
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const [stats, setStats] = useState<Record<string, number> | null>(null);
    const [chartData, setChartData] = useState<{ date: string; count: number }[]>([]);
    const [conversionData, setConversionData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingFollowup, setSendingFollowup] = useState(false);
    const [followupResult, setFollowupResult] = useState<{ sent: number; total_stale: number } | null>(null);

    useEffect(() => {
        if (!token) return;
        Promise.all([
            adminGetStats(token).catch(() => null),
            adminGetLeadStats(token, 14).catch(() => []),
            adminGetConversionStats(token).catch(() => []),
        ]).then(([s, c, conv]) => {
            setStats(s);
            setChartData(c);
            setConversionData(conv);
        }).finally(() => setLoading(false));
    }, [token]);

    const handleFollowup = async () => {
        if (!token) return;
        setSendingFollowup(true);
        try {
            const result = await adminSendFollowupReminders(token, 3);
            setFollowupResult(result);
        } catch {
            setFollowupResult(null);
        } finally {
            setSendingFollowup(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <TrendingUp size={28} className="text-[#d4af37]" />
                    <h1 className="text-3xl font-black text-[#f0e6d3]">לוח בקרה</h1>
                </div>
                {/* Follow-up reminder trigger */}
                <button
                    onClick={handleFollowup}
                    disabled={sendingFollowup || loading}
                    className="flex items-center gap-2 bg-[#0e1628] border border-[#d4af37]/20 text-[#f0e6d3]/60 hover:text-[#d4af37] hover:border-[#d4af37]/40 rounded-xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-40"
                    title="שלח תזכורות follow-up לפניות ממתינות 3+ ימים"
                >
                    {sendingFollowup ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                    {followupResult
                        ? <span className="flex items-center gap-1 text-green-400"><CheckCircle2 size={11} /> {followupResult.sent} תזכורות נשלחו</span>
                        : 'שלח תזכורות follow-up'}
                </button>
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

            {!loading && <LeadsChart chartData={chartData} />}
            {!loading && <ConversionPanel data={conversionData} />}

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
