/**
 * Contact Us Page.
 * Professional form for service requests and inquiries.
 */

"use client";

import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulating form submission
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <main className="min-h-[70vh] flex items-center justify-center bg-slate-50 px-8">
                <div className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-2xl text-center border border-slate-100">
                    <div className="text-green-500 flex justify-center mb-6">
                        <CheckCircle2 size={80} strokeWidth={1.5} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-4">הפנייה התקבלה!</h1>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        תודה שפנית למוקד השירות של טיבותא. נציג מטעמנו יחזור אליך בהקדם האפשרי.
                    </p>
                    <button 
                        onClick={() => setSubmitted(false)}
                        className="btn-primary w-full"
                    >
                        חזרה לטופס
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 py-24 px-8">
            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20">
                
                {/* Info Side */}
                <div className="flex flex-col">
                    <h1 className="text-6xl font-black text-slate-900 mb-8 leading-tight">
                        מוקד <br />
                        <span className="text-[#1e3a8a]">שירות חברים.</span>
                    </h1>
                    <p className="text-2xl text-slate-500 mb-12 font-light leading-relaxed">
                        אנחנו כאן לכל שאלה, תקלה או בירור בנושא מימוש הטבות ושירותי הקהילה.
                    </p>

                    <div className="space-y-10 mt-4">
                        <div className="flex items-start gap-6">
                            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#1e3a8a] shrink-0 border border-slate-100">
                                <Phone size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-1">מוקד טלפוני</h3>
                                <p className="text-slate-500 text-lg">*9876</p>
                                <p className="text-slate-400 text-sm">ימים א-ה | 09:00 - 18:00</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-6">
                            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#1e3a8a] shrink-0 border border-slate-100">
                                <Mail size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-1">דואר אלקטרוני</h3>
                                <p className="text-slate-500 text-lg">support@tivuta.co.il</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-6">
                            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#1e3a8a] shrink-0 border border-slate-100">
                                <MapPin size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-1">משרדי החברה</h3>
                                <p className="text-slate-500 text-lg">ירושלים / בית שמש</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Side */}
                <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[5rem] -z-10"></div>
                    
                    <h2 className="text-3xl font-black text-slate-900 mb-8">פתיחת קריאת שירות</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-slate-600 px-2">שם מלא</label>
                            <input 
                                required
                                type="text" 
                                className="bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all" 
                                placeholder="ישראל ישראלי"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-slate-600 px-2">אימייל</label>
                                <input 
                                    required
                                    type="email" 
                                    className="bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all" 
                                    placeholder="your@email.com"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-slate-600 px-2">טלפון</label>
                                <input 
                                    required
                                    type="tel" 
                                    className="bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all" 
                                    placeholder="050-0000000"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-slate-600 px-2">נושא הפנייה</label>
                            <select className="bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all appearance-none">
                                <option>בירור על הטבה ספציפית</option>
                                <option>תקלה במימוש קופון</option>
                                <option>הצעת שיתוף פעולה</option>
                                <option>אחר</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-slate-600 px-2">תוכן ההודעה</label>
                            <textarea 
                                required
                                rows={4}
                                className="bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all resize-none" 
                                placeholder="איך נוכל לעזור?"
                            ></textarea>
                        </div>
                        
                        <button type="submit" className="w-full btn-primary !py-5 !text-xl shadow-xl flex items-center justify-center gap-3 mt-4">
                            <Send size={20} />
                            <span>שליחת הפנייה</span>
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
