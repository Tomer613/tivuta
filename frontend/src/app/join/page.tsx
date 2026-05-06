/**
 * Join Now Page.
 * Landing page for new member registration.
 */

import { CheckCircle2, ShieldCheck } from 'lucide-react';

export default function JoinPage() {
    return (
        <main className="min-h-screen bg-slate-50 py-24 px-8">
            <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                
                {/* Left Side: Marketing Info */}
                <div className="flex flex-col">
                    <h1 className="text-6xl font-black text-slate-900 mb-8 leading-tight">
                        הגיע הזמן <br />
                        <span className="text-[#1e3a8a]">להתחיל להרוויח.</span>
                    </h1>
                    <p className="text-2xl text-slate-500 mb-12 font-light leading-relaxed">
                        הצטרף לקהילה שדואגת לך באמת. הטבות בבנקים, הנחות ברשתות השיווק ואירועי פנאי מותאמים.
                    </p>
                    
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                <CheckCircle2 size={24} />
                            </div>
                            <span className="text-xl font-bold text-slate-700">הצטרפות חינם וללא התחייבות</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                <CheckCircle2 size={24} />
                            </div>
                            <span className="text-xl font-bold text-slate-700">גישה מיידית לכל ההטבות</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                <CheckCircle2 size={24} />
                            </div>
                            <span className="text-xl font-bold text-slate-700">שירות לקוחות אישי בווטסאפ</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Registration Form */}
                <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100">
                    <h2 className="text-3xl font-black text-slate-900 mb-8">טופס הצטרפות מהיר</h2>
                    <form className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-slate-600 px-2">שם פרטי</label>
                                <input type="text" className="bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a]" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-slate-600 px-2">שם משפחה</label>
                                <input type="text" className="bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a]" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-slate-600 px-2">מספר טלפון</label>
                            <input type="tel" className="bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a]" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-slate-600 px-2">כתובת אימייל</label>
                            <input type="email" className="bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a]" />
                        </div>
                        
                        <button type="button" className="w-full btn-primary !py-5 !text-xl shadow-xl mt-4">
                            שגר בקשה להצטרפות
                        </button>
                    </form>
                    
                    <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-widest">
                        <ShieldCheck size={16} />
                        <span>מאובטח בסטנדרט הגבוה ביותר</span>
                    </div>
                </div>
            </div>
        </main>
    );
}
