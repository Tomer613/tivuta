/**
 * Benefits Page Content (Client Side)
 * Handles global search and category filtering using searchParams.
 */
"use client";

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LayoutGrid, Star, Calendar, Zap, ScrollText, Utensils, Shirt, ShoppingBasket, Palmtree, Smartphone, HeartPulse, PartyPopper, Home, Users, Landmark, Hammer, User } from 'lucide-react';
import ItemCard from '@/components/ItemCard';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/context/AuthContext';

const categoryIcons: Record<string, any> = {
    judaism: ScrollText,
    dining: Utensils,
    fashion: Shirt,
    groceries: ShoppingBasket,
    travel_attractions: Palmtree,
    electronics: Smartphone,
    health_beauty: HeartPulse,
    events: PartyPopper,
    real_estate_auto: Home,
    family: Users,
    finance: Landmark,
    home_renovation: Hammer,
    default: LayoutGrid
};

interface BenefitsContentProps {
    allItems: any[];
    categories: any[];
    locale: 'he' | 'en' | 'fr' | 'yi';
    t: any;
}

export default function BenefitsContent({ allItems, categories, locale, t }: BenefitsContentProps) {
    const searchParams = useSearchParams();
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const pool = searchParams.get('pool') || 'monthly'; // Default to monthly as requested

    const currentCategoryObj = categories.find((c: any) => c.slug === category);
    const categoryId = currentCategoryObj?.id;

    // Map sub-category IDs to their parent category IDs for correct filtering
    const subToCategoryMap = useMemo(() => {
        const map: Record<number, number> = {};
        categories.forEach(cat => {
            cat.sub_categories?.forEach((sub: any) => {
                map[sub.id] = cat.id;
            });
        });
        return map;
    }, [categories]);

    const filteredItems = allItems.filter((item: any) => {
        // Pool filtering
        if (pool === 'monthly' && !item.is_monthly) return false;
        if (pool === 'featured' && !item.is_featured) return false;
        // pool === 'all' allows everything

        // Category filtering
        const itemCategoryId = item.cat_id_new || (item.sub_category_id ? subToCategoryMap[item.sub_category_id] : null);
        const matchesCategory = !category || itemCategoryId === categoryId;
        
        // Search filtering
        const title = item[`title_${locale}`] || item.title_he;
        const desc = item[`description_${locale}`] || item.description_he;
        const matchesSearch = !search || 
            title.toLowerCase().includes(search.toLowerCase()) || 
            desc.toLowerCase().includes(search.toLowerCase());

        return matchesCategory && matchesSearch;
    });

    const poolTabs = [
        { id: 'monthly', label: t.pool_monthly, icon: <Calendar size={18} />, title: t.title_monthly, subtitle: t.subtitle_monthly },
        { id: 'featured', label: t.pool_featured, icon: <Star size={18} />, title: t.title_featured, subtitle: t.subtitle_featured },
        { id: 'all', label: t.pool_all, icon: <Zap size={18} />, title: t.title_all, subtitle: t.subtitle_all },
    ];

    const currentPool = poolTabs.find(p => p.id === pool) || poolTabs[0];

    const { user } = useAuth();
    const isPoolRestricted = pool === 'featured' && !user;

    return (
        <>
            {/* Dynamic Page Header */}
            <header className="bg-white border-b border-slate-200 py-20 px-8">
                <div className="max-w-7xl mx-auto relative">
                    <div className="lg:absolute lg:-start-24 lg:top-0 mb-10 lg:mb-0">
                        <BackButton locale={locale} />
                    </div>
                    <div className="flex flex-col items-start">
                        <h1 className="text-6xl font-black text-slate-900 mb-6 text-start w-full animate-in fade-in slide-in-from-bottom-2">
                            {currentPool.title}
                        </h1>
                        <p className="text-2xl text-slate-500 max-w-2xl font-light leading-relaxed text-start w-full animate-in fade-in slide-in-from-bottom-4">
                            {currentPool.subtitle}
                        </p>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto py-12 px-8 flex flex-col lg:flex-row gap-12">
            {/* Sidebar Filters */}
            <aside className="lg:w-64 flex-shrink-0 flex flex-col gap-8">
                {/* Pool Selector */}
                <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ps-2">{locale === 'he' ? 'סוג הטבות' : 'Benefit Type'}</h3>
                    <div className="flex flex-col gap-2">
                        {poolTabs.map((tab) => (
                            <Link
                                key={tab.id}
                                href={`/${locale}/benefits?pool=${tab.id}${search ? `&search=${search}` : ''}`}
                                className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all active:scale-95 ${pool === tab.id ? 'bg-[#1e3a8a] text-white shadow-lg shadow-blue-900/20' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Categories Sidebar */}
                <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ps-2">{locale === 'he' ? 'קטגוריות' : 'Categories'}</h3>
                    <div className="flex flex-col gap-2">
                        <Link 
                            href={`/${locale}/benefits?pool=${pool}${search ? `&search=${search}` : ''}`} 
                            className={`flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${!category ? 'bg-[#1e3a8a] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 border border-transparent'}`}
                        >
                            <LayoutGrid size={18} />
                            <span>{t.all}</span>
                        </Link>
                        {categories.map((cat: any) => {
                            const Icon = categoryIcons[cat.slug] || categoryIcons.default;
                            const isActive = category === cat.slug;
                            return (
                                <Link 
                                    key={cat.id} 
                                    href={`/${locale}/benefits?pool=${pool}&category=${cat.slug}${search ? `&search=${search}` : ''}`}
                                    className={`flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${isActive ? 'bg-[#1e3a8a] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 border border-transparent'}`}
                                >
                                    <Icon size={18} />
                                    <span>{cat[`name_${locale}`] || cat.name_he}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-grow">
                {/* Results Header */}
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black text-slate-900">
                        {poolTabs.find(p => p.id === pool)?.label}
                        {category && <span className="text-slate-400 font-light mx-2">/</span>}
                        {category && <span className="text-[#1e3a8a]">{currentCategoryObj?.[`name_${locale}`] || currentCategoryObj?.name_he}</span>}
                    </h2>
                    {!isPoolRestricted && (
                        <span className="bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                            {filteredItems.length} {t.results}
                        </span>
                    )}
                </div>

                {/* Catalog Grid or Login Prompt */}
                {isPoolRestricted ? (
                    <div className="text-center py-24 bg-white rounded-[3rem] border border-slate-200 shadow-sm animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-blue-50 text-[#1e3a8a] rounded-full flex items-center justify-center mx-auto mb-8">
                            <User size={48} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-12 px-8 leading-tight">
                            {t.login_required}
                        </h3>
                        <Link href={`/${locale}/login`} className="btn-primary !bg-[#1e3a8a] !px-12 !py-4 text-lg">
                            {t.login_btn}
                        </Link>
                    </div>
                ) : filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {filteredItems.map((item: any) => (
                            <ItemCard key={item.id} item={item} locale={locale} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                        <div className="text-slate-100 flex justify-center mb-6">
                            <LayoutGrid size={80} strokeWidth={1} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">{t.empty}</h3>
                        <p className="text-slate-400 mb-8">{locale === 'he' ? 'נסה להסיר את הסינונים כדי לראות עוד תוצאות.' : 'Try removing filters to see more results.'}</p>
                        <Link href={`/${locale}/benefits?pool=all`} className="btn-primary !bg-[#1e3a8a] !px-8">
                            {t.pool_all}
                        </Link>
                    </div>
                )}

                {/* Browse All CTA if in monthly/featured mode and not empty */}
                {pool !== 'all' && filteredItems.length > 0 && (
                    <div className="mt-16 pt-12 border-t border-slate-200 text-center">
                        <Link 
                            href={`/${locale}/benefits?pool=all`}
                            className="inline-flex items-center gap-2 text-[#1e3a8a] font-black text-lg hover:gap-4 transition-all duration-300 group"
                        >
                            <span>{t.browse_all}</span>
                            <div className="w-8 h-8 bg-[#1e3a8a] text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Zap size={14} fill="currentColor" />
                            </div>
                        </Link>
                    </div>
                )}
            </div>
        </div>
        </>
    );
}

