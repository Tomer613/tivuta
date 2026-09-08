import {
    Gem, Sparkles, Crown, Diamond, Watch, Heart,
    Car, Truck, Bike, Fuel, Wrench,
    Home, Sofa, Lamp, Bed,
    UtensilsCrossed, Cake, Wine, Coffee, ChefHat, Soup,
    Shield, FileText, Umbrella, Landmark,
    Tag, Star, Package, ShoppingBag, Shirt, Gift,
    LucideIcon,
} from 'lucide-react';

// lucide-react icons must be statically imported, so a ProductCategory's `icon` string (set by
// the admin) is a key into this fixed map rather than an arbitrary dynamic import. A broader set
// than verticalIcons.tsx's VERTICAL_ICON_MAP — a category is finer-grained than a world (e.g.
// "Rings" vs "Necklaces" within diamonds), so it needs more specific icon choices than
// world-level ones like Gem/Car/Watch. Must match backend/app/schemas.py's VALID_CATEGORY_ICONS.
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
    Gem, Sparkles, Crown, Diamond, Watch, Heart,
    Car, Truck, Bike, Fuel, Wrench,
    Home, Sofa, Lamp, Bed,
    UtensilsCrossed, Cake, Wine, Coffee, ChefHat, Soup,
    Shield, FileText, Umbrella, Landmark,
    Tag, Star, Package, ShoppingBag, Shirt, Gift,
};

export const CATEGORY_ICON_OPTIONS = Object.keys(CATEGORY_ICON_MAP);

export function getCategoryIcon(icon: string | null | undefined): LucideIcon {
    return (icon && CATEGORY_ICON_MAP[icon]) || Tag;
}
