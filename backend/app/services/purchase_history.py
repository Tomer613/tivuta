from typing import List, Optional

from sqlalchemy.orm import Session, selectinload

from .. import models


def get_user_purchase_history(
    db: Session, user_id: int, vertical: Optional[str] = None
) -> List[dict]:
    """The single source of truth for "what has this user bought before" — feeds the cart page's
    "bought before" strip, the world listing's "my taste" sort, and the shopping list's auto-seed,
    so all three agree on what counts as a past purchase.

    A "purchase" is a contact_request Lead whose parent CustomerOrder was never cancelled AND
    whose own line-item status was never individually cancelled (a single item within an
    otherwise-active order can be cancelled on its own via PATCH /admin/leads/{id}/status or the
    bulk-action endpoint, independent of the parent CustomerOrder's status). Loads
    the (small, per-user) row set and aggregates in Python rather than a SQL GROUP BY — same
    "load everything, bucket in code" convention already used for other stats-shaped endpoints
    (e.g. GET /admin/leads/stats), chosen there for cross-DB portability between SQLite dev and
    Postgres prod, and just as appropriate here given the per-user dataset size.

    Returns a list of dicts (one per distinct, still-active product), newest-purchase-first:
    {"product": Product, "last_quantity": int, "times_purchased": int, "last_purchased_at": datetime}
    """
    query = (
        db.query(models.Lead)
        .join(models.CustomerOrder, models.Lead.customer_order_id == models.CustomerOrder.id)
        .filter(
            models.Lead.user_id == user_id,
            models.Lead.lead_type == "contact_request",
            models.Lead.status != "cancelled",
            models.CustomerOrder.status != "cancelled",
        )
        .options(
            selectinload(models.Lead.product)
            .selectinload(models.Product.quantity_discount_bundle)
            .selectinload(models.QuantityDiscountBundle.tiers)
        )
    )
    if vertical:
        query = query.join(models.Product, models.Lead.product_id == models.Product.id).filter(
            models.Product.vertical == vertical
        )

    by_product: dict[int, dict] = {}
    for lead in query.all():
        product = lead.product
        if product is None or not product.is_active:
            continue
        entry = by_product.get(product.id)
        if entry is None:
            by_product[product.id] = {
                "product": product,
                "last_quantity": lead.quantity or 1,
                "times_purchased": 1,
                "last_purchased_at": lead.created_at,
            }
        else:
            entry["times_purchased"] += 1
            if lead.created_at > entry["last_purchased_at"]:
                entry["last_purchased_at"] = lead.created_at
                entry["last_quantity"] = lead.quantity or 1

    return sorted(by_product.values(), key=lambda e: e["last_purchased_at"], reverse=True)
