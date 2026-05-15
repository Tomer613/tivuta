"use client";

import React from 'react';

interface LogoProps {
    className?: string;
    height?: string;
    light?: boolean;
}

export default function Logo({ className = "", height = "h-10", light = false }: LogoProps) {
    const logoUrl = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/branding/logo.svg`;
    
    return (
        <div className={`logo-shine-container ${className} transition-transform duration-300`}>
            <img 
                src={logoUrl} 
                alt="TIVUTA Logo" 
                className={`${height} w-auto ${light ? 'brightness-0 invert' : ''}`} 
            />
            <div 
                className={`logo-shine-overlay ${light ? 'logo-shine-vibrant-gold' : 'logo-shine-bronze'}`} 
                style={{ 
                    '--logo-url': `url(${logoUrl})`
                } as any}
            />
        </div>
    );
}
