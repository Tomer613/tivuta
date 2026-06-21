/**
 * Contact Us Page.
 * Professional form for service requests and inquiries.
 * Localized for multi-language support.
 */

"use client";

import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { useParams } from 'next/navigation';

interface ContactTranslation {
    title: string;
    subtitle: string;
    phone: string;
    email: string;
    office: string;
    office_loc: string;
    form_title: string;
    name: string;
    email_label: string;
    phone_label: string;
    subject: string;
    message: string;
    send: string;
    success_title: string;
    success_desc: string;
    back: string;
}

const translations: Record<string, ContactTranslation> = {
    he: {
        title: "מוקד שירות חברים",
        subtitle: "אנחנו כאן לכל שאלה, תקלה או בירור בנושא מימוש הטבות ושירותי הקהילה.",
        phone: "מוקד טלפוני",
        email: "דואר אלקטרוני",
        office: "משרדי החברה",
        office_loc: "ירושלים / בית שמש",
        form_title: "פתיחת קריאת שירות",
        name: "שם מלא",
        email_label: "אימייל",
        phone_label: "טלפון",
        subject: "נושא הפנייה",
        message: "תוכן ההודעה",
        send: "שליחת הפנייה",
        success_title: "הפנייה התקבלה!",
        success_desc: "תודה שפנית למוקד השירות של טיבותא. נציג מטעמנו יחזור אליך בהקדם האפשרי.",
        back: "חזרה לטופס"
    },
    en: {
        title: "Member Service Center",
        subtitle: "We are here for any question, issue, or inquiry regarding benefits and community services.",
        phone: "Call Center",
        email: "Email Address",
        office: "Company Offices",
        office_loc: "Israel",
        form_title: "Open Service Request",
        name: "Full Name",
        email_label: "Email",
        phone_label: "Phone",
        subject: "Subject",
        message: "Message Content",
        send: "Submit Request",
        success_title: "Request Received!",
        success_desc: "Thank you for contacting TIVUTA service center. A representative will get back to you shortly.",
        back: "Back to Form"
    },
    fr: {
        title: "Centre de Service",
        subtitle: "Nous sommes là pour toute question ou demande concernant les avantages et les services.",
        phone: "Centre d'appel",
        email: "Adresse E-mail",
        office: "Bureaux",
        office_loc: "Israël",
        form_title: "Ouvrir une demande",
        name: "Nom complet",
        email_label: "E-mail",
        phone_label: "Téléphone",
        subject: "Sujet",
        message: "Contenu du message",
        send: "Envoyer la demande",
        success_title: "Demande reçue !",
        success_desc: "Merci d'avoir contacté le centre de service TIVUTA. Un représentant vous répondra sous peu.",
        back: "Retour au formulaire"
    },
    yi: {
        title: "סערוויס צענטער",
        subtitle: "מיר זענען דא פאר סיי וועלכע פראגע אדער הילף וואס איר דארפט.",
        phone: "טעלעפאן צענטער",
        email: "ע-פאסט",
        office: "אונזערע אפיסעס",
        office_loc: "ארץ ישראל",
        form_title: "עפענען א פראגע",
        name: "פולער נאמען",
        email_label: "ע-פאסט",
        phone_label: "טעלעפאן",
        subject: "נושא",
        message: "הודעה",
        send: "שיקן די פראגע",
        success_title: "די פראגע איז צוגעשיקט!",
        success_desc: "א דאנק פארן זיך פארבינדן מיט טיבותא. מיר וועלן אייך ענטפערן בקרוב.",
        back: "צוריק צום טאבעלע"
    }
};

export default function ContactPage() {
    const [submitted, setSubmitted] = useState(false);
    const params = useParams();
    const locale = params.locale as string || 'he';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
    };

    const t = translations[locale] || translations.he;

    if (submitted) {
        return (
            <main className="min-h-[70vh] flex items-center justify-center bg-[#111a2f] px-8">
                <div className="max-w-md w-full bg-[#0e1628] p-12 rounded-[3rem] shadow-2xl text-center border border-[#d4af37]/20">
                    <div className="text-green-500 flex justify-center mb-6">
                        <CheckCircle2 size={80} strokeWidth={1.5} />
                    </div>
                    <h1 className="text-3xl font-black text-[#f0e6d3] mb-4">{t.success_title}</h1>
                    <p className="text-[#f0e6d3]/60 mb-8 leading-relaxed">{t.success_desc}</p>
                    <button 
                        onClick={() => setSubmitted(false)}
                        className="btn-primary w-full"
                    >
                        {t.back}
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#111a2f] py-24 px-8">
            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20">
                
                {/* Info Side */}
                <div className="flex flex-col">
                    <h1 className="text-6xl font-black text-[#f0e6d3] mb-8 leading-tight">
                        {t.title.split(' ').slice(0, -1).join(' ')} <br />
                        <span className="text-[#1e3a8a]">{t.title.split(' ').slice(-1)}</span>
                    </h1>
                    <p className="text-2xl text-[#f0e6d3]/60 mb-12 font-light leading-relaxed">
                        {t.subtitle}
                    </p>

                    <div className="space-y-10 mt-4">
                        <div className="flex items-start gap-6">
                            <div className="w-14 h-14 bg-[#0e1628] rounded-2xl shadow-sm flex items-center justify-center text-[#1e3a8a] shrink-0 border border-[#d4af37]/20">
                                <Phone size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-[#f0e6d3] mb-1">{t.phone}</h3>
                                <p className="text-[#f0e6d3]/60 text-lg">*9876</p>
                                <p className="text-[#f0e6d3]/60 text-sm">Sun-Thu | 09:00 - 18:00</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-6">
                            <div className="w-14 h-14 bg-[#0e1628] rounded-2xl shadow-sm flex items-center justify-center text-[#1e3a8a] shrink-0 border border-[#d4af37]/20">
                                <Mail size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-[#f0e6d3] mb-1">{t.email}</h3>
                                <p className="text-[#f0e6d3]/60 text-lg">support@tivuta.co.il</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-6">
                            <div className="w-14 h-14 bg-[#0e1628] rounded-2xl shadow-sm flex items-center justify-center text-[#1e3a8a] shrink-0 border border-[#d4af37]/20">
                                <MapPin size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-[#f0e6d3] mb-1">{t.office}</h3>
                                <p className="text-[#f0e6d3]/60 text-lg">{t.office_loc}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Side */}
                <div className="bg-[#0e1628] p-12 rounded-[3.5rem] shadow-2xl border border-[#d4af37]/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#111a2f] rounded-bl-[5rem] -z-10"></div>
                    
                    <h2 className="text-3xl font-black text-[#f0e6d3] mb-8">{t.form_title}</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-[#f0e6d3] px-2">{t.name}</label>
                            <input required type="text" className="bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all" />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-[#f0e6d3] px-2">{t.email_label}</label>
                                <input required type="email" className="bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-[#f0e6d3] px-2">{t.phone_label}</label>
                                <input required type="tel" className="bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-[#f0e6d3] px-2">{t.subject}</label>
                            <select className="bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all appearance-none">
                                <option>General Inquiry</option>
                                <option>Technical Issue</option>
                                <option>Benefit Help</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-[#f0e6d3] px-2">{t.message}</label>
                            <textarea required rows={4} className="bg-[#111a2f] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all resize-none"></textarea>
                        </div>
                        
                        <button type="submit" className="w-full btn-primary !py-5 !text-xl shadow-xl flex items-center justify-center gap-3 mt-4">
                            <Send size={20} />
                            <span>{t.send}</span>
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
