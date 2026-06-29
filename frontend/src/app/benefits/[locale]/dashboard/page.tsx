'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { BASE_URL } from '@/lib/api';

import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
    TrendingUp, Wallet, ShoppingBag,
    ChevronRight, ArrowUpRight, Coins,
    CreditCard, ArrowRightLeft, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import NotificationCenter from '@/components/NotificationCenter';


interface DashboardTranslation {
    welcome: string;
    subtitle: string;
    savings_title: string;
    expenses_title: string;
    distribution_title: string;
    orders_title: string;
    savings_cta: string;
    invest_cta: string;
    no_orders: string;
    currency: string;
    points_title: string;
}

const translations: Record<string, DashboardTranslation> = {
    he: {
        welcome: "שלום,",
        subtitle: "ככה נראה הכסף שלך החודש ב-TIVUTA",
        savings_title: "סה\"כ חסכון החודש",
        expenses_title: "הוצאות סה\"כ - מאי",
        distribution_title: "התפלגות הצרכנות שלי",
        orders_title: "ההזמנות שלי",
        savings_cta: "העברה לחיסכון לכל ילד",
        invest_cta: "העברה להשקעה חכמה",
        no_orders: "עדיין אין הזמנות",
        currency: "₪",
        points_title: "נקודות טיבותא"

    },
    en: {
        welcome: "Hello,",
        subtitle: "Here's how your money looks this month on TIVUTA",
        savings_title: "Total Savings This Month",
        expenses_title: "Total Expenses - May",
        distribution_title: "My Consumption Distribution",
        orders_title: "My Orders",
        savings_cta: "Transfer to Children Savings",
        invest_cta: "Transfer to Smart Investment",
        no_orders: "No orders yet",
        currency: "$",
        points_title: "Tivot Points"
    },
    fr: {
        welcome: "Bonjour,",
        subtitle: "Voici vos finances ce mois-ci sur TIVUTA",
        savings_title: "Économies totales",
        expenses_title: "Dépenses totales",
        distribution_title: "Ma distribution",
        orders_title: "Mes commandes",
        savings_cta: "Transférer vers l'épargne",
        invest_cta: "Investissement intelligent",
        no_orders: "Pas encore de commandes",
        currency: "€",
        points_title: "Points Tivot"
    },
    yi: {
        welcome: "שלום,",
        subtitle: "אזוי זעט אויס אייער געלט דעם חודש אין טיבותא",
        savings_title: "סך הכל געשפארט",
        expenses_title: "סך הכל אויסגאבן",
        distribution_title: "מיין אויסגאבן",
        orders_title: "מיינע באשטעלונגען",
        savings_cta: "שפארן פאר די קינדער",
        invest_cta: "קלוזשע אינוועסטמענט",
        no_orders: "נישטא קיין באשטעלונגען",
        currency: "₪",
        points_title: "טיבות פונקטן"
    }

};

export default function DashboardPage() {
    const params = useParams();
    const locale = params.locale as string || 'he';
    const { user, token, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push(`/benefits/${locale}/login`);
            return;
        }

        if (token) {
            fetchDashboardData();
        }
    }, [user, authLoading, token, locale, router]);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${BASE_URL}/users/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const dashboardData = await response.json();
                setData(dashboardData);
            } else {
                setError("Failed to load dashboard data. Please try again later.");
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            setError("Connection error. Please check your backend.");
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#111a2f] gap-4">
                <Loader2 className="w-12 h-12 text-[#1e3a8a] animate-spin" />
                <p className="text-[#f0e6d3]/60 font-bold animate-pulse">טוען את הנתונים שלך...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#111a2f] p-8 text-center">
                <div className="bg-[#0e1628] p-12 rounded-[3rem] shadow-xl border border-[#d4af37]/20 max-w-md">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-8 mx-auto">
                        <ShoppingBag size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-[#f0e6d3] mb-4">אופס, משהו השתבש</h2>
                    <p className="text-[#f0e6d3]/60 mb-8 font-medium">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-[#080d1f] text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all"
                    >
                        נסה שוב
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const t = translations[locale] || translations.he;

    const barData = [
        { name: 'הוצאות', value: data.monthly_expenses, fill: '#1e3a8a' },
        { name: 'חסכון', value: data.total_savings, fill: '#10b981' }
    ];

    return (
        <main className="min-h-screen bg-[#f8fafc] py-16 px-8">
            <div className="max-w-7xl mx-auto">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1 className="text-4xl font-black text-[#f0e6d3] mb-2">
                            {t.welcome} <span className="text-[#1e3a8a]">{user?.first_name}</span>
                        </h1>
                        <p className="text-[#f0e6d3]/60 font-medium">{t.subtitle}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-wrap gap-3 md:justify-end"
                    >
                        {/* Monthly Savings */}
                        <div className="bg-[#0e1628] px-5 py-3 rounded-2xl shadow-sm border border-[#d4af37]/20 flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-[#f0e6d3]/60 uppercase tracking-widest leading-none mb-1">{t.savings_title}</p>
                                <p className="text-lg font-black text-[#f0e6d3]">{t.currency}{data.total_savings.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Monthly Expenses */}
                        <div className="bg-[#0e1628] px-5 py-3 rounded-2xl shadow-sm border border-[#d4af37]/20 flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#111a2f] text-[#1e3a8a] rounded-xl flex items-center justify-center">
                                <ShoppingBag size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-[#f0e6d3]/60 uppercase tracking-widest leading-none mb-1">{t.expenses_title}</p>
                                <p className="text-lg font-black text-[#f0e6d3]">{t.currency}{data.monthly_expenses.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Points */}
                        <div className="bg-[#0e1628] px-5 py-3 rounded-2xl shadow-sm border border-[#d4af37]/20 flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#d4af37]/10 text-[#d4af37] rounded-xl flex items-center justify-center">
                                <Coins size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-[#f0e6d3]/60 uppercase tracking-widest leading-none mb-1">{t.points_title}</p>
                                <p className="text-lg font-black text-[#d4af37]">{(data.total_savings * 1.5).toFixed(0)}</p>
                            </div>
                        </div>
                    </motion.div>


                </div>

                {/* Main Grid */}
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* Left Column: Analytics */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Charts Row */}
                        <div className="grid md:grid-cols-2 gap-8">

                            {/* Distribution Pie Chart */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-[#0e1628] p-8 rounded-[2.5rem] shadow-sm border border-[#d4af37]/20"
                            >
                                <h3 className="text-xl font-bold text-[#f0e6d3] mb-8 flex items-center gap-3">
                                    <ShoppingBag className="text-[#1e3a8a]" size={20} />
                                    {t.distribution_title}
                                </h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={data.distribution}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                                nameKey="label"
                                            >
                                                {data.distribution.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>

                            {/* Monthly Bar Chart */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-[#0e1628] p-8 rounded-[2.5rem] shadow-sm border border-[#d4af37]/20"
                            >
                                <h3 className="text-xl font-bold text-[#f0e6d3] mb-8 flex items-center gap-3">
                                    <CreditCard className="text-[#1e3a8a]" size={20} />
                                    {t.expenses_title}
                                </h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                                            <YAxis hide />
                                            <Tooltip cursor={{ fill: '#f8fafc' }} />
                                            <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={60} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-4 flex justify-between items-center text-sm font-bold">
                                    <span className="text-[#f0e6d3]/60">סה"כ הוצאות:</span>
                                    <span className="text-[#f0e6d3] text-lg">{t.currency}{data.monthly_expenses.toLocaleString()}</span>
                                </div>
                            </motion.div>
                        </div>

                        {/* Recent Orders Table */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-[#0e1628] p-8 rounded-[2.5rem] shadow-sm border border-[#d4af37]/20"
                        >
                            <h3 className="text-xl font-bold text-[#f0e6d3] mb-8 flex items-center gap-3">
                                <ArrowRightLeft className="text-[#1e3a8a]" size={20} />
                                {t.orders_title}
                            </h3>
                            <div className="space-y-4">
                                {data.recent_orders.map((order: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-4 hover:bg-[#111a2f] rounded-2xl transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-[#111a2f] rounded-xl flex items-center justify-center text-[#f0e6d3]/60 group-hover:bg-[#1e3a8a]/10 group-hover:text-[#1e3a8a] transition-colors">
                                                <ShoppingBag size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#f0e6d3]">{order.title_he}</p>
                                                <p className="text-xs font-medium text-[#f0e6d3]/60">{new Date(order.date).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US')}</p>
                                            </div>
                                        </div>
                                        <div className="text-start">
                                            <p className="font-black text-[#f0e6d3]">-{t.currency}{order.amount}</p>
                                            <p className="text-[10px] font-black uppercase tracking-tighter text-green-500 bg-green-50 px-2 py-0.5 rounded-full inline-block">
                                                {order.status}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: Sidebar Actions */}
                    <div className="space-y-8">

                        {/* Quick Actions Card */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0e1628]/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                            <div className="relative z-10">
                                <Wallet className="mb-6 opacity-80" size={32} />
                                <h3 className="text-2xl font-black mb-2">מה עושים עם החסכון?</h3>
                                <p className="text-[#f0e6d3]/80 mb-8 font-medium">חסכת החודש {t.currency}{data.total_savings.toLocaleString()} באמצעות כרטיס TIVUTA.</p>

                                <div className="space-y-4">
                                    <button className="w-full bg-[#0e1628]/20 backdrop-blur-md border border-white/30 p-4 rounded-2xl flex items-center justify-between hover:bg-[#0e1628]/30 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <Coins size={20} />
                                            <span className="font-bold text-sm">{t.savings_cta}</span>
                                        </div>
                                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                    <button className="w-full bg-[#0e1628] text-[#1e3a8a] p-4 rounded-2xl flex items-center justify-between hover:bg-[#0e1628]/90 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <TrendingUp size={20} />
                                            <span className="font-bold text-sm">{t.invest_cta}</span>
                                        </div>
                                        <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        <NotificationCenter />

                        {/* Tip of the day */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-[#d4af37]/10 border border-amber-100 p-8 rounded-[2.5rem]"
                        >
                            <div className="w-10 h-10 bg-[#d4af37]/20 text-[#d4af37] rounded-xl flex items-center justify-center mb-6">
                                <Coins size={20} />
                            </div>
                            <h4 className="font-black text-amber-900 mb-2">טיפ פיננסי חכם</h4>
                            <p className="text-amber-800/70 text-sm leading-relaxed font-medium">
                                "מי שקונה מה שהוא לא צריך, סופו שימכור את מה שהוא כן צריך."
                                <br />
                                <span className="text-xs font-bold mt-2 block">- יהודי חכם</span>
                            </p>
                        </motion.div>

                    </div>
                </div>
            </div>
        </main>
    );
}
