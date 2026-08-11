import type { Product } from '@/components/ProductTile';

// Dedicated subdomain (CNAME → the backend) rather than the app's own domain, so a static
// export can still serve a correct per-product WhatsApp preview (og:image/title) — see
// backend/app/routers/share.py. Kept as a plain constant, matching how SITE_URL is already a
// hardcoded constant in [locale]/layout.tsx, not an env var.
const SHARE_BASE_URL = 'https://share.tivuta.co.il/share/products';

export function buildProductShareUrl(productId: number, locale: string): string {
    return `${SHARE_BASE_URL}/${productId}?locale=${locale}`;
}

export function shareProductOnWhatsApp(product: Product, locale: 'he' | 'en' | 'fr' | 'yi'): void {
    const titleText = product[`title_${locale}`] || product.title_he;
    const price = product.price ? `₪${product.price.toLocaleString()}` : '';
    const url = buildProductShareUrl(product.id, locale);
    const text = encodeURIComponent(`${titleText}${price ? ' — ' + price : ''}\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}
