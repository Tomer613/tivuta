'use client';

import { useState } from 'react';

interface Cat {
    id: string;
    label: string;
    pct: number;
    discount: number;
    color: string;
}

const DEFAULT_SIM1: Cat[] = [
    { id: 'c_food',  label: 'מזון וצריכה',           pct: 35, discount: 0.04, color: '#d4af37' },
    { id: 'c_house', label: 'הוצאות דירה וריהוט',    pct: 15, discount: 0.06, color: '#f0e6d3' },
    { id: 'c_edu',   label: 'חינוך',                 pct: 15, discount: 0.05, color: '#b8892a' },
    { id: 'c_cloth', label: 'ביגוד',                 pct: 10, discount: 0.10, color: '#8899bb' },
    { id: 'c_trans', label: 'תחבורה ותקשורת',        pct: 10, discount: 0.08, color: '#f59e0b' },
];

const DEFAULT_SIM2: Cat[] = [
    { id: 'c_mort',  label: 'משכנתא',               pct: 25, discount: 0.08, color: '#d4af37' },
    { id: 'c_pen',   label: 'קרן פנסיה',            pct: 20, discount: 0.05, color: '#b8892a' },
    { id: 'c_hish',  label: 'קרן השתלמות',          pct: 10, discount: 0.05, color: '#f0e6d3' },
    { id: 'c_gemel', label: 'תכנית חיסכון לכל ילד', pct:  2, discount: 0.05, color: '#8899bb' },
    { id: 'c_ins',   label: 'ביטוחים',              pct:  5, discount: 0.16, color: '#f59e0b' },
];

function fmt(n: number) {
    return Math.round(n).toLocaleString('he-IL');
}

interface SimCardProps {
    title: string;
    desc: string;
    totalLabel: string;
    currentBarLabel: string;
    tivutaBarLabel: string;
    value: number;
    min: number;
    max: number;
    cats: Cat[];
    onValueChange: (v: number) => void;
    onCatPctChange: (id: string, pct: number) => void;
}

function SimCard({
    title, desc, totalLabel, currentBarLabel, tivutaBarLabel,
    value, min, max, cats, onValueChange, onCatPctChange,
}: SimCardProps) {
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [showSliders, setShowSliders] = useState(false);

    const yearly  = cats.reduce((sum, c) => sum + value * (c.pct / 100) * c.discount * 12, 0);
    const monthly = yearly / 12;

    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <h3 style={{ fontSize: '24px', color: '#d4af37', marginBottom: '12px', fontWeight: 700 }}>{title}</h3>
            <p style={{ color: '#8899bb', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>{desc}</p>

            {/* Number input */}
            <div style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(212,175,55,0.4)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px',
            }}>
                <span style={{ color: '#d4af37', fontSize: '24px', fontWeight: 700, marginInlineEnd: '8px' }}>₪</span>
                <input
                    type="number"
                    value={value}
                    min={min}
                    max={max}
                    step={100}
                    onChange={e => {
                        const v = Number(e.target.value);
                        if (!isNaN(v)) onValueChange(Math.max(min, Math.min(max, v)));
                    }}
                    style={{
                        background: 'transparent', border: 'none', color: '#fff',
                        fontSize: '24px', fontWeight: 700, width: '100%',
                        outline: 'none', fontFamily: 'inherit',
                        textAlign: 'left', direction: 'ltr',
                        // hide spinners
                        MozAppearance: 'textfield',
                    } as React.CSSProperties}
                />
            </div>

            {/* Range slider */}
            <input
                type="range"
                min={min}
                max={max}
                step={100}
                value={value}
                onChange={e => onValueChange(Number(e.target.value))}
                className="sim-slider"
                style={{ direction: 'rtl' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8899bb', fontSize: '13px', marginTop: '8px' }}>
                <span>{fmt(min)}</span><span>{fmt(max)}+</span>
            </div>

            {/* Yearly total */}
            <div style={{ textAlign: 'center', marginTop: '32px', marginBottom: '24px' }}>
                <div style={{ color: '#8899bb', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>{totalLabel}</div>
                <div style={{ color: '#fff', fontSize: '48px', fontWeight: 900, lineHeight: 1.1, textShadow: '0 4px 16px rgba(212,175,55,0.2)' }}>
                    ₪{fmt(yearly)}
                </div>
                <div style={{ color: '#d4af37', fontSize: '15px', fontWeight: 600, marginTop: '8px' }}>
                    ממוצע חודשי: {fmt(monthly)} ₪
                </div>
            </div>

            {/* Current bar */}
            <div style={{ fontSize: '12px', color: '#8899bb', textAlign: 'right', marginBottom: '4px' }}>{currentBarLabel}</div>
            <div style={{
                display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden',
                margin: '4px 0 16px',
                background: 'rgba(255,255,255,0.05)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
                opacity: 0.6,
            }}>
                {cats.map(cat => (
                    <div key={cat.id} style={{
                        width: `${cat.pct}%`, height: '100%',
                        backgroundColor: cat.color, transition: 'width 0.4s ease',
                    }} />
                ))}
            </div>

            {/* Tivuta bar */}
            <div style={{ fontSize: '12px', color: '#d4af37', fontWeight: 'bold', textAlign: 'right', marginBottom: '4px' }}>{tivutaBarLabel}</div>
            <div style={{
                display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden',
                margin: '4px 0 24px',
                background: 'rgba(255,255,255,0.05)',
                boxShadow: '0 0 12px rgba(212,175,55,0.2), inset 0 2px 4px rgba(0,0,0,0.5)',
            }}>
                {cats.map(cat => (
                    <div key={cat.id} style={{
                        width: `${cat.pct * (1 - cat.discount)}%`, height: '100%',
                        backgroundColor: cat.color, transition: 'width 0.4s ease',
                    }} />
                ))}
            </div>

            {/* Toggle breakdown button */}
            <button
                type="button"
                onClick={() => setShowBreakdown(v => !v)}
                style={{
                    display: 'block', width: '100%', textAlign: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid #d4af37',
                    color: '#d4af37', padding: '10px', borderRadius: '8px',
                    marginTop: '0', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s',
                    fontFamily: 'inherit',
                }}
            >
                {showBreakdown ? 'סגור פירוט ▴' : 'לצפייה בפירוט החיסכון ▾'}
            </button>

            {/* Breakdown section */}
            {showBreakdown && (
                <div style={{ marginTop: '24px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '24px' }}>
                    {showSliders && (
                        <div style={{ fontSize: '12px', color: '#8899bb', textAlign: 'left', marginBottom: '12px' }}>
                            (% מסך ההוצאה)
                        </div>
                    )}

                    {/* Category rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {cats.map(cat => {
                            const catYearly  = value * (cat.pct / 100) * cat.discount * 12;
                            const sumOthers  = cats.filter(c => c.id !== cat.id).reduce((s, c) => s + c.pct, 0);
                            const maxAllowed = Math.max(0, 100 - sumOthers);

                            return (
                                <div key={cat.id} style={{
                                    background: 'rgba(0,0,0,0.15)',
                                    border: '1px solid rgba(255,255,255,0.03)',
                                    borderRadius: '12px', padding: '16px 20px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#f0e6d3', fontWeight: 600, fontSize: '15px' }}>
                                            <div style={{
                                                width: '14px', height: '14px', borderRadius: '50%',
                                                backgroundColor: cat.color, flexShrink: 0,
                                            }} />
                                            <span>{cat.label}</span>
                                        </div>
                                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '16px', direction: 'ltr' }}>
                                            <span style={{ color: '#8899bb', fontWeight: 400, marginLeft: '4px' }}>חיסכון: </span>
                                            ₪{fmt(catYearly)}
                                        </div>
                                    </div>

                                    {showSliders && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '12px' }}>
                                            <input
                                                type="range"
                                                min={0}
                                                max={maxAllowed}
                                                step={1}
                                                value={cat.pct}
                                                onChange={e => onCatPctChange(cat.id, Math.min(maxAllowed, Number(e.target.value)))}
                                                className="sim-slider sim-slider-sm"
                                                style={{ flex: 1 }}
                                            />
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#8899bb', minWidth: '44px', textAlign: 'left', direction: 'ltr' }}>
                                                {cat.pct}%
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Toggle sliders button */}
                    <button
                        type="button"
                        onClick={() => setShowSliders(v => !v)}
                        style={{
                            display: 'block', width: '100%', textAlign: 'center',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px dashed rgba(255,255,255,0.1)',
                            color: '#8899bb', padding: '10px', borderRadius: '8px',
                            marginTop: '16px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s',
                            fontFamily: 'inherit',
                        }}
                    >
                        {showSliders ? 'סגור התאמה ▴' : '⚙️ התאמה אישית של האחוזים'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function SavingsCalculator() {
    const [sim1Value, setSim1Value] = useState(10000);
    const [sim2Value, setSim2Value] = useState(18000);
    const [sim1Cats, setSim1Cats] = useState<Cat[]>(DEFAULT_SIM1.map(c => ({ ...c })));
    const [sim2Cats, setSim2Cats] = useState<Cat[]>(DEFAULT_SIM2.map(c => ({ ...c })));

    const updateCat = (
        cats: Cat[],
        setCats: React.Dispatch<React.SetStateAction<Cat[]>>,
        id: string,
        pct: number,
    ) => {
        setCats(cats.map(c => (c.id === id ? { ...c, pct } : c)));
    };

    return (
        <div style={{ direction: 'rtl' }}>
            {/* 2-column grid, collapses to 1 on small screens */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                <SimCard
                    title="קניות והוצאות שוטפות"
                    desc="הזינו את סך ההוצאה החודשית המשוערת בכרטיס האשראי, ואנחנו נחשב את פוטנציאל החיסכון בהוצאות השוטפות שלכם, עם כרטיס האשראי שלנו."
                    totalLabel="חיסכון שנתי צפוי"
                    currentBarLabel="הוצאות שוטפות נוכחיות:"
                    tivutaBarLabel="הוצאות שוטפות עם טיבותא:"
                    value={sim1Value}
                    min={2000}
                    max={50000}
                    cats={sim1Cats}
                    onValueChange={setSim1Value}
                    onCatPctChange={(id, pct) => updateCat(sim1Cats, setSim1Cats, id, pct)}
                />
                <SimCard
                    title="פיננסים והוצאות קבועות"
                    desc="הזינו את סך ההכנסה החודשית שלכם, ואנחנו נחשב את פוטנציאל החיסכון בהוצאות הקבועות הנגזרות ממנה, כשאתם כבר חלק מאיתנו."
                    totalLabel="תוספת שנתית לחסכונות"
                    currentBarLabel="הוצאות קבועות נוכחיות:"
                    tivutaBarLabel="הוצאות קבועות עם טיבותא:"
                    value={sim2Value}
                    min={5000}
                    max={100000}
                    cats={sim2Cats}
                    onValueChange={setSim2Value}
                    onCatPctChange={(id, pct) => updateCat(sim2Cats, setSim2Cats, id, pct)}
                />
            </div>

            {/* Warning box */}
            <div style={{
                textAlign: 'center', marginTop: '30px', padding: '16px 24px',
                background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: '12px', color: '#f0e6d3', maxWidth: '800px',
                marginLeft: 'auto', marginRight: 'auto',
            }}>
                <span style={{ display: 'block', fontWeight: 700, color: '#d4af37', marginBottom: '4px', fontSize: '16px' }}>שימו לב!</span>
                <span style={{ fontSize: '14px', color: '#8899bb' }}>
                    כחברי מועדון טיבותא, אתם מרוויחים כפול - גם חוסכים בהוצאות החודשיות, וגם מגדילים את ההכנסה הפנויה.
                </span>
            </div>
        </div>
    );
}
