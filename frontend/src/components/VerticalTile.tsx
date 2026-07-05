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
            {/* Icon box — tilts + scales + glows on hover */}
            <div className="flex items-center gap-8">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-[#111a2f] border border-[#d4af37]/20 text-[#d4af37] rounded-3xl flex items-center justify-center shrink-0 transition-all duration-500 ease-out group-hover:bg-[#d4af37] group-hover:text-[#080d1f] group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-[0_0_32px_rgba(212,175,55,0.5)]">
                    {icon}
                </div>

                <div className="text-start">
                    <h2 className="text-3xl md:text-4xl font-black text-[#f0e6d3] mb-2 transition-colors duration-300 group-hover:text-white">
                        {title}
                    </h2>
                    <p className="text-[#f0e6d3]/60 text-lg font-light transition-colors duration-300 group-hover:text-[#f0e6d3]/80">
                        {subtitle}
                    </p>
                </div>
            </div>

            {/* Arrow — bounces sideways on hover */}
            <div className="w-12 h-12 rounded-full bg-[#111a2f] border border-[#d4af37]/20 text-[#d4af37] flex items-center justify-center shrink-0 transition-all duration-300 ease-out group-hover:scale-125 group-hover:bg-[#d4af37] group-hover:text-[#080d1f] group-hover:shadow-[0_0_24px_rgba(212,175,55,0.6)]"
                style={{ transform: 'translateX(0)' }}
            >
                <span className="transition-transform duration-300 group-hover:-translate-x-1 block">
                    {isRTL ? <ArrowLeft size={22} /> : <ArrowRight size={22} />}
                </span>
            </div>
        </Link>
    );
}
