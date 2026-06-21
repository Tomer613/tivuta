"use client";

import { useAuth } from '@/context/AuthContext';

interface SectionTitleProps {
    recommended: string;
    featured: string;
}

export default function SectionTitle({ recommended, featured }: SectionTitleProps) {
    const { user } = useAuth();

    return (
        <h2 className="text-4xl font-black text-[#f0e6d3] mb-12 flex items-center gap-4 border-s-8 border-[#f59e0b] ps-6 text-start animate-in fade-in slide-in-from-right-4">
            {user ? recommended : featured}
        </h2>
    );
}
