'use client';

import { Minus, Plus } from 'lucide-react';

interface QuantityStepperProps {
    qty: number;
    onDec: (e: React.MouseEvent) => void;
    onInc: (e: React.MouseEvent) => void;
    decDisabled?: boolean;
    incDisabled?: boolean;
    size?: 'sm' | 'md';
    decLabel: string;
    incLabel: string;
}

const SIZE_MAP = {
    sm: { btn: 'w-9 h-9 sm:w-7 sm:h-7', icon: 12 },
    md: { btn: 'w-10 h-10 sm:w-8 sm:h-8', icon: 14 },
};

export default function QuantityStepper({ qty, onDec, onInc, decDisabled, incDisabled, size = 'md', decLabel, incLabel }: QuantityStepperProps) {
    const { btn, icon } = SIZE_MAP[size];
    return (
        <div className="flex items-center justify-center gap-2">
            <button
                type="button"
                aria-label={decLabel}
                onClick={onDec}
                disabled={decDisabled}
                className={`${btn} rounded-full bg-[#111a2f] border border-[#d4af37]/20 flex items-center justify-center text-[#f0e6d3]/70 hover:border-[#d4af37]/50 transition-colors disabled:opacity-30 disabled:hover:border-[#d4af37]/20`}
            >
                <Minus size={icon} />
            </button>
            <span className="w-6 text-center text-[#f0e6d3] font-bold">{qty}</span>
            <button
                type="button"
                aria-label={incLabel}
                onClick={onInc}
                disabled={incDisabled}
                className={`${btn} rounded-full bg-[#111a2f] border border-[#d4af37]/20 flex items-center justify-center text-[#f0e6d3]/70 hover:border-[#d4af37]/50 transition-colors disabled:opacity-30 disabled:hover:border-[#d4af37]/20`}
            >
                <Plus size={icon} />
            </button>
        </div>
    );
}
