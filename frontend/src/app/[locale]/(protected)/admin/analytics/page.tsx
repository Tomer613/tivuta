'use client';

import { useEffect, useState } from 'react';
import { LineChart, Loader2, TrendingUp, Users, Globe2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { adminGetAnalyticsSummary, adminPruneAnalytics, AnalyticsSummary } from '@/lib/api';
import { getErrorMessage } from '@/lib/getErrorMessage';

const LOCALE_LABEL: Record<string, string> = { he: 'עברית', en: 'אנגלית', fr: 'צרפתית', yi: 'יידיש' };

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold ${
            type === 'success' ? 'bg-[#0e1628] border border-green-500/50 text-green-400' : 'bg-[#0e1628] border border-red-500/50 text-red-400'
        }`}>
            {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message}
        </div>
    );
}

function TrendChart({ trend }: { trend: { date: string; count: number }[] }) {
    if (!trend.length) return null;
    const max = Math.max(...trend.map((d) => d.count), 1);
    return (
        <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-6 mt-8">
            <h3 className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest mb-6 flex items-center gap-2">
                <TrendingUp size={13} className="text-[#d4af37]" /> צפיות בדפים — {trend.length} ימים אחרונים
            </h3>
            <div className="flex items-end gap-1.5 h-28">
                {trend.map((d) => {
                    const pct = (d.count / max) * 100;
                    const dayLabel = new Date(d.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
                    return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group" title={`${dayLabel}: ${d.count} צפיות`}>
                            <div className="text-[9px] text-[#f0e6d3]/40 sm:text-[#f0e6d3]/0 sm:group-hover:text-[#d4af37] transition-colors font-bold whitespace-nowrap">
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

export default function AdminAnalyticsPage() {
    const { token } = useAuth();
    const [days, setDays] = useState(14);
    const [data, setData] = useState<AnalyticsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [pruning, setPruning] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    const loadSummary = () => {
        if (!token) return;
        setLoading(true);
        adminGetAnalyticsSummary(token, days)
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    };

    useEffect(() => { Promise.resolve().then(loadSummary); }, [token, days]);

    const handlePruneNow = async () => {
        if (!token) return;
        setPruning(true);
        try {
            const result = await adminPruneAnalytics(token);
            showToast(
                result.deleted > 0
                    ? `נמחקו ${result.deleted} רשומות (ישנות מ-${result.retention_days} יום)`
                    : `לא נמצאו רשומות למחיקה (ישנות מ-${result.retention_days} יום)`
            );
            loadSummary();
        } catch (err) {
            showToast(getErrorMessage(err, 'שגיאה בניקוי הנתונים'), 'error');
        } finally {
            setPruning(false);
        }
    };

    const statCards = data ? [
        { label: 'צפיות היום', value: data.totals.pageviews_today, sub: `${data.totals.unique_visitors_today} מבקרים ייחודיים` },
        { label: 'צפיות ב-7 ימים', value: data.totals.pageviews_7d, sub: `${data.totals.unique_visitors_7d} מבקרים ייחודיים` },
        { label: 'צפיות ב-30 ימים', value: data.totals.pageviews_30d, sub: `${data.totals.unique_visitors_30d} מבקרים ייחודיים` },
    ] : [];

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
                <div className="flex items-center gap-3">
                    <LineChart size={28} className="text-[#d4af37]" />
                    <h1 className="text-3xl font-black text-[#f0e6d3]">תנועה באתר</h1>
                </div>
                <div className="flex items-center gap-2">
                    {[14, 30, 90].map((d) => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                days === d ? 'bg-[#d4af37] text-[#080d1f]' : 'bg-[#0e1628] border border-[#d4af37]/20 text-[#f0e6d3]/60 hover:text-[#d4af37]'
                            }`}
                        >
                            {d} ימים
                        </button>
                    ))}
                </div>
            </div>
            <p className="text-[#f0e6d3]/40 text-sm mb-6">
                נתונים אנונימיים לחלוטין — נאספים ומאוחסנים ישירות במערכת, ללא צד שלישי
            </p>

            <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-6 mb-10 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-sm font-black text-[#f0e6d3] uppercase tracking-widest mb-1">ניקוי נתונים ישנים</h2>
                    <p className="text-xs text-[#f0e6d3]/40">
                        רשומות תנועה נמחקות אוטומטית מדי יום לפי תקופת השמירה המוגדרת (ניתנת לעריכה בהגדרות הנאמנות וההונאות)
                    </p>
                </div>
                <button
                    onClick={handlePruneNow}
                    disabled={pruning}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50 shrink-0"
                >
                    {pruning ? <Loader2 className="animate-spin" size={13} /> : <Trash2 size={13} />}
                    מחק נתונים ישנים כעת
                </button>
            </div>

            {loading ? (
                <Loader2 className="animate-spin text-[#d4af37] mx-auto mt-20" size={32} />
            ) : !data ? (
                <p className="text-[#f0e6d3]/40 text-center mt-20">שגיאה בטעינת הנתונים</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {statCards.map((card) => (
                            <div key={card.label} className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-6">
                                <div className="w-10 h-10 bg-[#d4af37]/10 rounded-xl flex items-center justify-center mb-4">
                                    <Users size={20} className="text-[#d4af37]" />
                                </div>
                                <div className="text-4xl font-black mb-1 text-[#d4af37]">{card.value}</div>
                                <div className="text-xs text-[#f0e6d3]/50 font-semibold leading-tight">{card.label}</div>
                                <div className="text-[10px] text-[#f0e6d3]/30 mt-1">{card.sub}</div>
                            </div>
                        ))}
                    </div>

                    <TrendChart trend={data.trend} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                        <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-6">
                            <h3 className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <TrendingUp size={13} className="text-[#d4af37]" /> דפים מובילים
                            </h3>
                            {data.top_pages.length === 0 ? (
                                <p className="text-[#f0e6d3]/30 text-sm">אין נתונים בטווח הזמן שנבחר</p>
                            ) : (
                                <div className="space-y-2">
                                    {data.top_pages.map((p) => (
                                        <div key={p.path} className="flex items-center justify-between gap-3 text-sm">
                                            <span className="text-[#f0e6d3]/70 truncate" dir="ltr">{p.path}</span>
                                            <span className="text-[#d4af37] font-bold shrink-0">{p.count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl p-6">
                            <h3 className="text-xs font-black text-[#f0e6d3]/60 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Globe2 size={13} className="text-[#d4af37]" /> לפי שפה
                            </h3>
                            {Object.keys(data.locale_breakdown).length === 0 ? (
                                <p className="text-[#f0e6d3]/30 text-sm">אין נתונים בטווח הזמן שנבחר</p>
                            ) : (
                                <div className="space-y-2">
                                    {Object.entries(data.locale_breakdown)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([locale, count]) => (
                                            <div key={locale} className="flex items-center justify-between gap-3 text-sm">
                                                <span className="text-[#f0e6d3]/70">{LOCALE_LABEL[locale] || locale}</span>
                                                <span className="text-[#d4af37] font-bold">{count}</span>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
