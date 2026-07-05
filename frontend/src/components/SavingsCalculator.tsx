'use client';

import { useState } from 'react';

const FINANCE_RATE  = 0.044;   // 4.4% of monthly income
const SHOPPING_RATE = 0.0485;  // 4.85% of monthly shopping

function fmt(n: number) {
    return n.toLocaleString('he-IL');
}

interface CalcCardProps {
    title: string;
    desc: string;
    sliderLabel: string;
    savingsLabel: string;
    monthlyLabel: string;
    currentBarLabel: string;
    improvedBarLabel: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    rate: number;
    note: string;
}

function CalcCard({
    title, desc, sliderLabel, savingsLabel, monthlyLabel,
    currentBarLabel, improvedBarLabel,
    value, onChange, min, max, rate, note,
}: CalcCardProps) {
    const monthly = Math.round(value * rate);
    const annual  = monthly * 12;
    const barCurrentPct = 88;
    const barImprovedPct = Math.round(88 - rate * 100 * 1.4);

    return (
        <div className="bg-[#111a2f] border border-[#d4af37]/20 rounded-2xl p-6 flex flex-col gap-5">
            <div>
                <h3 className="text-[#d4af37] font-black text-lg mb-1">{title}</h3>
                <p className="text-[#f0e6d3]/50 text-xs leading-relaxed">{desc}</p>
            </div>

            {/* Amount display + slider */}
            <div>
                <div className="flex items-center justify-between bg-[#0e1628] border border-[#d4af37]/20 rounded-xl px-4 py-3 mb-3">
                    <span className="text-xl font-black text-[#f0e6d3]">{fmt(value)}</span>
                    <span className="text-[#d4af37] text-lg">₪</span>
                </div>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={500}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-full accent-[#d4af37] h-1 cursor-pointer"
                    style={{ direction: 'rtl' }}
                />
                <div className="flex justify-between text-[10px] text-[#f0e6d3]/30 mt-1 font-bold" dir="ltr">
                    <span>+{fmt(min)}</span>
                    <span>{fmt(max)}</span>
                </div>
            </div>

            {/* Result */}
            <div className="text-center py-2">
                <p className="text-xs font-bold text-[#f0e6d3]/50 mb-1">{savingsLabel}</p>
                <p className="text-4xl font-black text-[#f0e6d3]">
                    {fmt(annual)}<span className="text-2xl text-[#d4af37]"> ₪</span>
                </p>
                <p className="text-[#d4af37] text-sm font-bold mt-1">
                    {monthlyLabel}: {fmt(monthly)} ₪
                </p>
            </div>

            {/* Bar comparison */}
            <div className="space-y-2">
                <div>
                    <p className="text-[10px] text-[#f0e6d3]/40 mb-1">{currentBarLabel}</p>
                    <div className="h-2 rounded-full bg-[#0e1628] overflow-hidden">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${barCurrentPct}%`,
                                background: 'linear-gradient(90deg, #6b7280 0%, #9ca3af 50%, #d1d5db 100%)',
                            }}
                        />
                    </div>
                </div>
                <div>
                    <p className="text-[10px] text-[#d4af37] font-bold mb-1">{improvedBarLabel}</p>
                    <div className="h-2 rounded-full bg-[#0e1628] overflow-hidden flex">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${barImprovedPct}%`,
                                background: 'linear-gradient(90deg, #6b7280 0%, #9ca3af 40%, #d4af37 100%)',
                            }}
                        />
                        <div
                            className="h-full"
                            style={{
                                width: `${barCurrentPct - barImprovedPct}%`,
                                background: '#d4af37',
                            }}
                        />
                    </div>
                </div>
            </div>

            <p className="text-[10px] text-[#f0e6d3]/30 text-center leading-relaxed">{note}</p>
        </div>
    );
}

export default function SavingsCalculator() {
    const [income,   setIncome]   = useState(18000);
    const [shopping, setShopping] = useState(10000);

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CalcCard
                    title="פיננסים והוצאות קבועות"
                    desc="הזינו את סך ההוצאה החודשית שלכם, ואנחנו נחשב את פוטנציאל החיסכון בהוצאות הקבועות הנגזרות ממנה, כשאתם כבר חלק מאיתנו."
                    sliderLabel="הכנסה חודשית"
                    savingsLabel="תוספת שנתית לחסכונות"
                    monthlyLabel="ממוצע חודשי"
                    currentBarLabel="הוצאות קבועות נוכחיות:"
                    improvedBarLabel="הוצאות קבועות עם טיבותא:"
                    value={income}
                    onChange={setIncome}
                    min={5000}
                    max={100000}
                    rate={FINANCE_RATE}
                    note="לצפייה בפירוט החיסכון ›"
                />
                <CalcCard
                    title="קניות והוצאות שוטפות"
                    desc="הזינו את סך ההוצאה המשוערת בכרטיס האשראי, ואנחנו נחשב את פוטנציאל החיסכון בהוצאות השוטפות שלכם, עם כרטיס האשראי שלנו."
                    sliderLabel="הוצאות חודשיות"
                    savingsLabel="חיסכון שנתי צפוי"
                    monthlyLabel="ממוצע חודשי"
                    currentBarLabel="הוצאות שוטפות נוכחיות:"
                    improvedBarLabel="הוצאות שוטפות עם טיבותא:"
                    value={shopping}
                    onChange={setShopping}
                    min={2000}
                    max={50000}
                    rate={SHOPPING_RATE}
                    note="לצפייה בפירוט החיסכון ›"
                />
            </div>

            {/* Bottom note */}
            <div className="bg-[#0e1628] border border-[#d4af37]/20 rounded-2xl px-5 py-4 text-center">
                <p className="text-[#d4af37] font-black text-sm mb-1">שימו לב!</p>
                <p className="text-[#f0e6d3]/60 text-xs leading-relaxed">
                    כחברי מועדון טיבותא, אתם מרוויחים כפול — גם חוסכים בהוצאות החודשיות, וגם מגדילים את ההכנסה הפנייה.
                </p>
            </div>
        </div>
    );
}
