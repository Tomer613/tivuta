import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface VerticalTileProps {
    href: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    locale: string;
}

export default function VerticalTile({ href, title, subtitle, icon, locale }: VerticalTileProps) {
    const isRTL = locale === 'he' || locale === 'yi';
    return (
        <Link
            href={href}
            className="world-tile flex items-center justify-between gap-8 p-10 md:p-14 group"
        >
            <div className="flex items-center gap-8">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-[#111a2f] border border-[#d4af37]/20 text-[#d4af37] rounded-3xl flex items-center justify-center shrink-0 group-hover:bg-[#d4af37] group-hover:text-[#080d1f] transition-all duration-500">
                    {icon}
                </div>
                <div className="text-start">
                    <h2 className="text-3xl md:text-4xl font-black text-[#f0e6d3] mb-2">{title}</h2>
                    <p className="text-[#f0e6d3]/60 text-lg font-light">{subtitle}</p>
                </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#111a2f] border border-[#d4af37]/20 text-[#d4af37] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-[#d4af37] group-hover:text-[#080d1f] transition-all duration-300">
                {isRTL ? <ArrowLeft size={22} /> : <ArrowRight size={22} />}
            </div>
        </Link>
    );
}
