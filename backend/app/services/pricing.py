from typing import Optional, Tuple

from .. import models


def compute_effective_unit_price(
    product: models.Product, bundle_aggregate_qty: int
) -> Tuple[Optional[float], Optional[float], float]:
    """The single source of truth for what a customer actually pays per unit of `product`.

    Returns (unit_price, list_price, quantity_discount_percent_applied). `bundle_aggregate_qty`
    is the combined quantity of every item in the same checkout that belongs to `product`'s
    quantity-discount bundle (0/irrelevant if the product isn't in one). Sale price and quantity
    discount stack multiplicatively: the quantity-tier percent applies on top of whatever price
    the customer would otherwise pay (sale price if set, else the regular price).

    Returns (None, None, 0.0) for "on request" products (no price at all) — nothing to compute.
    """
    if product.price is None:
        return (None, None, 0.0)

    list_price = product.price
    base = product.sale_price if product.sale_price and product.sale_price > 0 else product.price

    applied_percent = 0.0
    bundle = product.quantity_discount_bundle
    if bundle is not None and bundle.is_active:
        qualifying = [t.discount_percent for t in bundle.tiers if t.min_quantity <= bundle_aggregate_qty]
        if qualifying:
            applied_percent = max(qualifying)

    unit_price = round(base * (1 - applied_percent / 100), 2)
    return (unit_price, list_price, applied_percent)
