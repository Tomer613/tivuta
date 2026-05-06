/**
 * About Page.
 * Explains the mission and background of Tivuta.
 */

import { ShieldCheck, Target, Heart, Users } from 'lucide-react';

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-white">
            {/* Hero Section */}
            <header className="bg-slate-50 py-24 px-8 border-b border-slate-200">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-5xl font-black text-slate-900 mb-8">הסיפור של טיבותא</h1>
                    <p className="text-2xl text-slate-500 font-light leading-relaxed">
                        אנחנו כאן כדי לבנות עולם שלם של פתרונות, המותאמים בדיוק לצרכים ולאורח החיים של הקהילה החרדית העובדת בישראל.
                    </p>
                </div>
            </header>

            {/* Values Grid */}
            <section className="max-w-7xl mx-auto py-24 px-8 grid md:grid-cols-2 lg:grid-cols-4 gap-12">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-blue-100 text-[#1e3a8a] rounded-2xl flex items-center justify-center mb-6">
                        <ShieldCheck size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-4">אמינות וביטחון</h3>
                    <p className="text-slate-500">כל שירות וספק עוברים בדיקה קפדנית כדי להבטיח את הסטנדרטים הגבוהים ביותר.</p>
                </div>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-amber-100 text-[#d97706] rounded-2xl flex items-center justify-center mb-6">
                        <Target size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-4">דיוק ומקצועיות</h3>
                    <p className="text-slate-500">אנחנו לא מאמינים בפתרונות "על הדרך". כל הצעה מותאמת אישית לקהל היעד שלנו.</p>
                </div>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                        <Heart size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-4">לב וקהילה</h3>
                    <p className="text-slate-500">טיבותא היא הרבה יותר מפורטל הטבות – היא כוח קנייה חברתי שדואג לאינטרסים שלכם.</p>
                </div>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                        <Users size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-4">שירותיות</h3>
                    <p className="text-slate-500">מוקד השירות שלנו זמין עבורכם לכל שאלה, תקלה או בקשה מיוחדת.</p>
                </div>
            </section>

            {/* Vision Section */}
            <section className="max-w-5xl mx-auto py-24 px-8 bg-slate-900 rounded-[3rem] mb-24 text-white text-center">
                <h2 className="text-3xl font-black mb-8 italic uppercase tracking-tighter">OUR VISION</h2>
                <p className="text-2xl font-light leading-relaxed opacity-80 italic">
                    "להיות המעטפת ההוליסטית המובילה, המעניקה ביטחון כלכלי, איכות חיים וגאוות יחידה לקהילה החרדית העובדת."
                </p>
            </section>
        </main>
    );
}
