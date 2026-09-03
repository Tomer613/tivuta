'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { Package, Users, BarChart3, Send, Tag, Inbox, ExternalLink, LayoutDashboard, Store, ShieldAlert, Globe, ShoppingCart, LineChart, ListFilter, PercentCircle, Building2 } from 'lucide-react';
import AdminGuard from '@/components/AdminGuard';

interface T {
    dashboard: string;
    products: string;
    verticals: string;
    categories: string;
    quantityDiscounts: string;
    vendors: string;
    users: string;
    surveys: string;
    distribution: string;
    promotions: string;
    orders: string;
    leads: string;
    loyalty: string;
    analytics: string;
    communities: string;
}

const translations: Record<string, T> = {
    he: { dashboard: 'בקרה', products: 'מוצרים', verticals: 'עולמות', categories: 'קטגוריות', quantityDiscounts: 'מבצעי כמות', vendors: 'ספקים', users: 'משתמשים', surveys: 'סקרים', distribution: 'הפצה', promotions: 'מבצעים', orders: 'הזמנות', leads: 'פניות', loyalty: 'נאמנות והונאות', analytics: 'תנועה', communities: 'קהילות' },
    en: { dashboard: 'Dashboard', products: 'Products', verticals: 'Worlds', categories: 'Categories', quantityDiscounts: 'Quantity Discounts', vendors: 'Vendors', users: 'Users', surveys: 'Surveys', distribution: 'Distribution', promotions: 'Promotions', orders: 'Orders', leads: 'Leads', loyalty: 'Loyalty & Fraud', analytics: 'Traffic', communities: 'Communities' },
    fr: { dashboard: 'Tableau', products: 'Produits', verticals: 'Univers', categories: 'Catégories', quantityDiscounts: 'Remises par quantité', vendors: 'Fournisseurs', users: 'Utilisateurs', surveys: 'Sondages', distribution: 'Diffusion', promotions: 'Promotions', orders: 'Commandes', leads: 'Contacts', loyalty: 'Fidélité', analytics: 'Trafic', communities: 'Communautés' },
    yi: { dashboard: 'בקרה', products: 'פראדוקטן', verticals: 'וועלטן', categories: 'קאטעגאריעס', quantityDiscounts: 'מבצעי כמות', vendors: 'ספקים', users: 'באניצער', surveys: 'סורווייס', distribution: 'פארשפרייטונג', promotions: 'מבצעים', orders: 'הזמנות', leads: 'פנייות', loyalty: 'לויאלטי', analytics: 'פארקער', communities: 'קהילות' },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const pathname = usePathname();
    const locale = (params?.locale as string) || 'he';
    const t = translations[locale] || translations.he;

    const tabs = [
        { href: `/${locale}/admin`, label: t.dashboard, icon: <LayoutDashboard size={18} /> },
        { href: `/${locale}/admin/products`, label: t.products, icon: <Package size={18} /> },
        { href: `/${locale}/admin/verticals`, label: t.verticals, icon: <Globe size={18} /> },
        { href: `/${locale}/admin/categories`, label: t.categories, icon: <ListFilter size={18} /> },
        { href: `/${locale}/admin/quantity-discounts`, label: t.quantityDiscounts, icon: <PercentCircle size={18} /> },
        { href: `/${locale}/admin/vendors`, label: t.vendors, icon: <Store size={18} /> },
        { href: `/${locale}/admin/users`, label: t.users, icon: <Users size={18} /> },
        { href: `/${locale}/admin/surveys`, label: t.surveys, icon: <BarChart3 size={18} /> },
        { href: `/${locale}/admin/distribution`, label: t.distribution, icon: <Send size={18} /> },
        { href: `/${locale}/admin/promotions`, label: t.promotions, icon: <Tag size={18} /> },
        { href: `/${locale}/admin/orders`, label: t.orders, icon: <ShoppingCart size={18} /> },
        { href: `/${locale}/admin/gabbai-communities`, label: t.communities, icon: <Building2 size={18} /> },
        { href: `/${locale}/admin/leads`, label: t.leads, icon: <Inbox size={18} /> },
        { href: `/${locale}/admin/loyalty`, label: t.loyalty, icon: <ShieldAlert size={18} /> },
        { href: `/${locale}/admin/analytics`, label: t.analytics, icon: <LineChart size={18} /> },
    ];

    const backToSiteLink = (extraClass: string) => (
        <Link
            href={`/${locale}`}
            className={`${extraClass} items-center gap-1.5 text-xs text-[#f0e6d3]/40 hover:text-[#d4af37] transition-colors font-semibold shrink-0`}
        >
            <ExternalLink size={13} />
            חזרה לאתר
        </Link>
    );

    return (
        <AdminGuard>
            <div className="min-h-screen bg-[#111a2f]">
                <nav className="bg-[#0e1628] border-b border-[#d4af37]/20 px-6 py-4">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-[#d4af37] font-black text-lg tracking-widest">TIVUTA</span>
                                <span className="text-[#d4af37]/25 text-sm">|</span>
                                <span className="text-[#f0e6d3]/35 text-[11px] uppercase tracking-widest font-bold">בק-אופיס</span>
                            </div>
                            {backToSiteLink('flex md:hidden')}
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto flex-nowrap no-scrollbar -mx-6 px-6 md:mx-0 md:px-0 md:flex-wrap">
                            {tabs.map((tab) => {
                                const norm = (p: string) => p.replace(/\/$/, '');
                                const isDashboard = norm(tab.href) === norm(`/${locale}/admin`);
                                const isActive = isDashboard
                                    ? norm(pathname) === norm(tab.href)
                                    : norm(pathname) === norm(tab.href) || norm(pathname).startsWith(norm(tab.href) + '/');
                                return (
                                    <Link
                                        key={tab.href}
                                        href={tab.href}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all shrink-0 whitespace-nowrap ${
                                            isActive
                                                ? 'bg-[#d4af37] text-[#080d1f]'
                                                : 'text-[#f0e6d3]/70 hover:text-[#f0e6d3] hover:bg-[#111a2f]'
                                        }`}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </Link>
                                );
                            })}
                        </div>
                        {backToSiteLink('hidden md:flex')}
                    </div>
                </nav>
                <div className="max-w-7xl mx-auto px-6 py-10">{children}</div>
            </div>
        </AdminGuard>
    );
}
