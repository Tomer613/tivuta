'use client';

import { useState } from 'react';
import { LogIn, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const { locale } = useParams();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const t = {
        he: {
            title: "ברוך שובך ל-TIVUTA",
            subtitle: "התחבר כדי לצפות בהטבות שלך ובמצב החיסכון",
            email: "כתובת אימייל",
            password: "סיסמה",
            submit: "התחבר למערכת",
            forgot: "שכחתי סיסמה",
            no_account: "עדיין אין לך חשבון? הצטרף עכשיו",
            secure: "התחברות מאובטחת",
            error_invalid: "אימייל או סיסמה שגויים"
        },
        en: {
            title: "Welcome back to TIVUTA",
            subtitle: "Login to view your benefits and savings status",
            email: "Email Address",
            password: "Password",
            submit: "Login",
            forgot: "Forgot Password?",
            no_account: "Don't have an account? Join now",
            secure: "Secure Login",
            error_invalid: "Invalid email or password"
        }
    }[locale as 'he' | 'en'] || t.he;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);

            const response = await fetch('http://127.0.0.1:8000/auth/login', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                await login(data.access_token);
            } else {
                setError(t.error_invalid);
            }
        } catch (err) {
            setError("Connection error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-8 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1e3a8a] blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400 blur-[120px] rounded-full" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-md bg-white/80 backdrop-blur-xl p-12 rounded-[3rem] shadow-2xl border border-white relative z-10"
            >
                <div className="flex flex-col items-center mb-12">
                    <div className="w-16 h-16 bg-[#1e3a8a] text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg rotate-3">
                        <LogIn size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-3">{t.title}</h1>
                    <p className="text-slate-500 font-medium text-center leading-relaxed">{t.subtitle}</p>
                </div>

                {error && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full p-4 mb-8 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 text-center"
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2 flex flex-col items-start">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">{t.email}</label>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-100 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all" 
                            placeholder="email@example.com"
                        />
                    </div>
                    <div className="space-y-2 flex flex-col items-start">
                        <div className="w-full flex justify-between items-center px-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.password}</label>
                            <a href="#" className="text-xs font-bold text-[#1e3a8a] hover:underline">{t.forgot}</a>
                        </div>
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-100 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all" 
                            placeholder="••••••••"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-slate-900 text-white py-5 rounded-2xl text-lg font-bold shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-4 group"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : (
                            <>
                                <span>{t.submit}</span>
                                <motion.div animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                    <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                                </motion.div>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                    <a href={`/${locale}/join`} className="text-sm font-bold text-slate-400 hover:text-[#1e3a8a] transition-colors">
                        {t.no_account}
                    </a>
                </div>

                <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                    <ShieldCheck size={12} />
                    <span>{t.secure}</span>
                </div>
            </motion.div>
        </main>
    );
}
