/**
 * Mirrors backend/app/services/pricing.py's compute_effective_unit_price() exactly — keep the two
 * in sync if this formula ever changes. Used for the pre-checkout preview (cart page); the
 * server independently recomputes and stores the authoritative snapshot at checkout time, so this
 * is display-only and never trusted for what actually gets persisted.
 */

export interface QuantityTierLike {
    min_quantity: number;
    discount_percent: number;
}

export interface EffectivePrice {
    unitPrice: number | null;
    listPrice: number | null;
    discountPercent: number;
}

/** bundleAggregateQty is the combined quantity of every item (in this same cart/checkout) that
 *  shares the product's quantity_discount_bundle_id — 0/irrelevant if the product isn't in one. */
export function computeEffectiveUnitPrice(
    price: number | null | undefined,
    salePrice: number | null | undefined,
    tiers: QuantityTierLike[] | null | undefined,
    bundleAggregateQty: number
): EffectivePrice {
    if (!price) return { unitPrice: null, listPrice: null, discountPercent: 0 };
    const listPrice = price;
    const base = salePrice && salePrice > 0 ? salePrice : price;
    let discountPercent = 0;
    if (tiers && tiers.length > 0) {
        const qualifying = tiers.filter((t) => t.min_quantity <= bundleAggregateQty).map((t) => t.discount_percent);
        if (qualifying.length > 0) discountPercent = Math.max(...qualifying);
    }
    const unitPrice = Math.round(base * (1 - discountPercent / 100) * 100) / 100;
    return { unitPrice, listPrice, discountPercent };
}
