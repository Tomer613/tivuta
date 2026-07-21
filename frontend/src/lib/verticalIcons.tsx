import { Gem, Car, ShieldCheck, Home, Watch, Briefcase, Store, Sparkles, Heart, Building2, LucideIcon } from 'lucide-react';

// lucide-react icons must be statically imported, so a Vertical's `icon` string (set by the
// admin) is a key into this fixed map rather than an arbitrary dynamic import.
export const VERTICAL_ICON_MAP: Record<string, LucideIcon> = {
    Gem, Car, ShieldCheck, Home, Watch, Briefcase, Store, Sparkles, Heart, Building2,
};

export const VERTICAL_ICON_OPTIONS = Object.keys(VERTICAL_ICON_MAP);

export function getVerticalIcon(icon: string): LucideIcon {
    return VERTICAL_ICON_MAP[icon] || Store;
}
