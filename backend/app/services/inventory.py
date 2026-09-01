"""Shared stock-adjustment helper. The only place Product.stock_quantity is ever mutated —
always alongside an InventoryLedgerEntry audit row, same "atomic counter update + ledger row"
shape already established by loyalty.py's points_balance/commission_owed_total increments.
"""
from typing import Optional

from sqlalchemy.orm import Session

from .. import models


def adjust_stock(
    db: Session,
    product: models.Product,
    delta: int,
    reason: str,
    reference_order_id: Optional[int] = None,
    actor: Optional[str] = None,
) -> None:
    """Applies `delta` to product.stock_quantity and records one InventoryLedgerEntry. A no-op for
    a product that doesn't track stock (stock_quantity is NULL) — untracked products simply have
    unlimited, unmonitored availability, so there's nothing to adjust or ledger. No negative-stock
    guard: an admin can knowingly oversell, and this function doesn't second-guess that."""
    if product.stock_quantity is None or delta == 0:
        return

    db.query(models.Product).filter(models.Product.id == product.id).update(
        {"stock_quantity": models.Product.stock_quantity + delta}
    )
    db.flush()
    db.refresh(product)
    db.add(
        models.InventoryLedgerEntry(
            product_id=product.id,
            delta=delta,
            reason=reason,
            reference_order_id=reference_order_id,
            balance_after=product.stock_quantity,
            actor=actor,
        )
    )


def reserve_or_release_stock_for_lead(db: Session, lead: models.Lead, old_status: str, new_status: str) -> None:
    """Reserves/releases stock as a product-bearing line item enters/leaves "confirmed" (a no-op
    via adjust_stock above for a product that doesn't track stock). Symmetric by design: entering
    "confirmed" decrements once, leaving it for any other status (including "cancelled")
    increments back — so toggling a line item's status repeatedly, or cancelling an order that had
    already-confirmed items, can never leak or double-reserve stock. Shared by the single-item and
    bulk lead status-change endpoints, and by order cancellation (services/orders.py)."""
    if lead.lead_type != "contact_request" or not lead.product_id or not lead.quantity:
        return
    entering_confirmed = new_status == "confirmed" and old_status != "confirmed"
    leaving_confirmed = old_status == "confirmed" and new_status != "confirmed"
    if not (entering_confirmed or leaving_confirmed):
        return
    product = db.query(models.Product).filter(models.Product.id == lead.product_id).first()
    if not product:
        return
    delta = -lead.quantity if entering_confirmed else lead.quantity
    reason = "order_reserved" if entering_confirmed else "order_restocked"
    adjust_stock(db, product, delta, reason, reference_order_id=lead.customer_order_id)


def set_stock_quantity(db: Session, product: models.Product, new_value: Optional[int], actor: Optional[str] = None) -> None:
    """Handles an admin directly setting Product.stock_quantity via the product create/edit form
    (as opposed to a delta via the quick +/- stepper, which calls adjust_stock directly) — still
    always goes through the ledger. Three cases: starting to track (old None -> new int, ledgered
    as "initial_stock"), stopping tracking (old int -> new None, no ledger entry — there's nothing
    left to audit once tracking stops), or a plain adjustment (old int -> new int, ledgered as the
    difference)."""
    old_value = product.stock_quantity
    if old_value == new_value:
        return
    if new_value is None:
        product.stock_quantity = None
        return
    if old_value is None:
        product.stock_quantity = new_value
        db.flush()
        db.add(models.InventoryLedgerEntry(
            product_id=product.id, delta=new_value, reason="initial_stock",
            balance_after=new_value, actor=actor,
        ))
        return
    adjust_stock(db, product, new_value - old_value, "admin_adjustment", actor=actor)
