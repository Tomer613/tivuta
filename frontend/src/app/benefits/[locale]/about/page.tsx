import { ShieldCheck, Target, Heart, Users } from 'lucide-react';

export function generateStaticParams() {
  return [
    { locale: 'he' },
    { locale: 'en' },
    { locale: 'fr' },
    { locale: 'yi' },
  ];
}

interface AboutTranslation {
    title: string;
    subtitle: string;
    vision_title: string;
    vision_text: string;
    value1_t: string;
    value1_d: string;
    value2_t: string;
    value2_d: string;
    value3_t: string;
    value3_d: string;
    value4_t: string;
    value4_d: string;
}

const translations: Record<string, AboutTranslation> = {
    he: {
        title: "הסיפור של טיבותא",
        subtitle: "אנחנו כאן כדי לבנות עולם שלם של פתרונות, המותאמים בדיוק לצרכים ולאורח החיים של הקהילה החרדית העובדת בישראל.",
        vision_title: "החזון שלנו",
        vision_text: "להיות המעטפת ההוליסטית המובילה, המעניקה ביטחון כלכלי, איכות חיים וגאוות יחידה לקהילה החרדית העובדת.",
        value1_t: "אמינות וביטחון",
        value1_d: "כל שירות וספק עוברים בדיקה קפדנית כדי להבטיח את הסטנדרטים הגבוהים ביותר.",
        value2_t: "דיוק ומקצועיות",
        value2_d: "אנחנו לא מאמינים בפתרונות 'על הדרך'. כל הצעה מותאמת אישית לקהל היעד שלנו.",
        value3_t: "לב וקהילה",
        value3_d: "טיבותא היא הרבה יותר מפורטל הטבות – היא כוח קנייה חברתי שדואג לאינטרסים שלכם.",
        value4_t: "שירותיות",
        value4_d: "מוקד השירות שלנו זמין עבורכם לכל שאלה, תקלה או בקשה מיוחדת."
    },
    en: {
        title: "The TIVUTA Story",
        subtitle: "We are here to build a world of solutions, specifically tailored to the needs and lifestyle of the working Haredi community in Israel.",
        vision_title: "Our Vision",
        vision_text: "To be the leading holistic ecosystem, providing financial security, quality of life, and unity for the working Haredi community.",
        value1_t: "Trust & Security",
        value1_d: "Every service and provider undergoes strict vetting to ensure the highest standards.",
        value2_t: "Precision & Professionalism",
        value2_d: "We don't believe in generic solutions. Every offer is personalized for our audience.",
        value3_t: "Heart & Community",
        value3_d: "TIVUTA is more than a portal – it's a social purchasing power looking out for you.",
        value4_t: "Service First",
        value4_d: "Our service center is available for any question, issue, or special request."
    },
    fr: {
        title: "L'histoire de TIVUTA",
        subtitle: "Nous sommes ici pour construire un monde de solutions, adaptées aux besoins et au mode de vie de la communauté Harédi en Israël.",
        vision_title: "Notre Vision",
        vision_text: "Être l'écosystème holistique de premier plan, offrant sécurité financière et qualité de vie à la communauté Harédi.",
        value1_t: "Confiance & Sécurité",
        value1_d: "Chaque service est rigoureusement vérifié pour garantir les plus hauts standards.",
        value2_t: "Précision & Professionnalisme",
        value2_d: "Chaque offre est personnalisée pour répondre parfaitement à vos besoins.",
        value3_t: "Cœur & Communauté",
        value3_d: "TIVUTA est plus qu'un portail – c'est une force d'achat sociale à votre service.",
        value4_t: "Service Client",
        value4_d: "Notre centre de service est disponible pour toute question ou demande spéciale."
    },
    yi: {
        title: "די טיבותא געשיכטע",
        subtitle: "מיר זענען דא פארן היימישן ארבעטער ציבור צוצושטעלן אלעס וואס איר דארפט.",
        vision_title: "אונזער זעאונג",
        vision_text: "צו זיין די פראפעסיאנעלע הילף פארן חרדישן ציבור.",
        value1_t: "געטרוי",
        value1_d: "אלע סערוויסעס זענען געפילטערט פארן היימישן ציבור.",
        value2_t: "פראפעסיאנאליזם",
        value2_d: "מיר שטעלן צו די בעסטע סערוויס פאר אייך.",
        value3_t: "הארץ און קהילה",
        value3_d: "טיבותא איז א כוח פארן ציבור.",
        value4_t: "סערוויס",
        value4_d: "מיר זענען דא פאר סיי וועלכע פראגע."
    }
};

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = translations[locale] || translations.he;

    return (
        <main className="min-h-screen bg-[#0e1628]">
            {/* Hero Section */}
            <header className="bg-[#111a2f] py-24 px-8 border-b border-[#d4af37]/20">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-5xl font-black text-[#f0e6d3] mb-8">{t.title}</h1>
                    <p className="text-2xl text-[#f0e6d3]/60 font-light leading-relaxed">
                        {t.subtitle}
                    </p>
                </div>
            </header>

            {/* Values Grid */}
            <section className="max-w-7xl mx-auto py-24 px-8 grid md:grid-cols-2 lg:grid-cols-4 gap-12">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-[#d4af37]/20 text-[#d4af37] rounded-2xl flex items-center justify-center mb-6">
                        <ShieldCheck size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-[#f0e6d3]">{t.value1_t}</h3>
                    <p className="text-[#f0e6d3]/60">{t.value1_d}</p>
                </div>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-[#d4af37]/20 text-[#d4af37] rounded-2xl flex items-center justify-center mb-6">
                        <Target size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-[#f0e6d3]">{t.value2_t}</h3>
                    <p className="text-[#f0e6d3]/60">{t.value2_d}</p>
                </div>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-[#d4af37]/20 text-[#d4af37] rounded-2xl flex items-center justify-center mb-6">
                        <Heart size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-[#f0e6d3]">{t.value3_t}</h3>
                    <p className="text-[#f0e6d3]/60">{t.value3_d}</p>
                </div>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-[#d4af37]/20 text-[#d4af37] rounded-2xl flex items-center justify-center mb-6">
                        <Users size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-[#f0e6d3]">{t.value4_t}</h3>
                    <p className="text-[#f0e6d3]/60">{t.value4_d}</p>
                </div>
            </section>

            {/* Vision Section */}
            <section className="max-w-5xl mx-auto py-24 px-8 bg-[#080d1f] rounded-[3rem] mb-24 text-white text-center">
                <h2 className="text-3xl font-black mb-8 italic uppercase tracking-tighter">{t.vision_title}</h2>
                <p className="text-2xl font-light leading-relaxed opacity-80 italic">
                    &quot;{t.vision_text}&quot;
                </p>
            </section>
        </main>
    );
}
