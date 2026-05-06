/**
 * Why Tivuta Page.
 * Detailed value proposition for the community.
 */

import { Sparkles, BarChart3, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';

export default function WhyTivutaPage() {
    return (
        <main className="min-h-screen bg-white">
            {/* Header */}
            <header className="bg-[#1e3a8a] py-32 px-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 to-transparent"></div>
                </div>
                <div className="max-w-4xl mx-auto relative z-10">
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-8">למה כדאי לך להיות חלק מטיבותא?</h1>
                    <p className="text-2xl text-blue-100 font-light leading-relaxed">
                        כי אנחנו לא רק פורטל הטבות – אנחנו הכוח של הקהילה שלך בשוק הישראלי.
                    </p>
                </div>
            </header>

            {/* Content Sections */}
            <section className="max-w-7xl mx-auto py-24 px-8 space-y-32">
                
                {/* Point 1 */}
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <div className="w-12 h-12 bg-blue-100 text-[#1e3a8a] rounded-xl flex items-center justify-center mb-6">
                            <BarChart3 size={24} />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 mb-6">כוח קנייה אדיר</h2>
                        <p className="text-xl text-slate-500 leading-relaxed">
                            כקהילה של עשרות אלפי עובדים, אנחנו מגיעים לספקים מעמדת כוח. זה מאפשר לנו להשיג הנחות ותנאים שפשוט אי אפשר לקבל בצורה פרטית.
                        </p>
                    </div>
                    <div className="bg-slate-50 h-80 rounded-[3rem] border border-slate-100 flex items-center justify-center">
                        <div className="text-slate-200">
                            <Zap size={120} strokeWidth={1} />
                        </div>
                    </div>
                </div>

                {/* Point 2 */}
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <div className="order-2 md:order-1 bg-slate-50 h-80 rounded-[3rem] border border-slate-100 flex items-center justify-center">
                        <div className="text-slate-200">
                            <ShieldCheck size={120} strokeWidth={1} />
                        </div>
                    </div>
                    <div className="order-1 md:order-2">
                        <div className="w-12 h-12 bg-amber-100 text-[#d97706] rounded-xl flex items-center justify-center mb-6">
                            <Sparkles size={24} />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 mb-6">סינון והתאמה לקהילה</h2>
                        <p className="text-xl text-slate-500 leading-relaxed">
                            אנחנו מבינים את הניואנסים. כל הטבה עוברת סינון של ערכים, כשרות והתאמה לאורח החיים התורני, כדי שתוכל ליהנות בראש שקט.
                        </p>
                    </div>
                </div>

            </section>

            {/* Closing CTA */}
            <section className="bg-slate-50 py-24 px-8 text-center border-t border-slate-200">
                <h2 className="text-3xl font-black text-slate-900 mb-8">מוכן להתחיל לחסוך?</h2>
                <div className="flex justify-center gap-6">
                    <Link href="/join" className="btn-primary">הצטרפות עכשיו</Link>
                    <Link href="/benefits" className="btn-secondary">לרשימת ההטבות</Link>
                </div>
            </section>
        </main>
    );
}
