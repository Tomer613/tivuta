import secrets
from datetime import datetime
from typing import Optional, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .. import models

# Excludes ambiguous characters (0/O, 1/I) so a hand-typed serial is less error-prone.
_CUSTOMER_NUMBER_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
_CUSTOMER_NUMBER_LENGTH = 10

DEFAULT_SETTINGS = {
    "point_value_ils": "1",
    "default_points_rate_percent": "5",
    "default_commission_rate_percent": "10",
    "min_transaction_ils": "5",
    "max_transaction_ils": "50000",
}

# Settings that must parse as a positive float — enforced on write so a bad admin edit
# (e.g. "point_value_ils": "0") fails fast instead of causing a ZeroDivisionError later,
# at sale-report time, for every vendor.
POSITIVE_FLOAT_SETTINGS = {
    "point_value_ils",
    "default_points_rate_percent",
    "default_commission_rate_percent",
    "min_transaction_ils",
    "max_transaction_ils",
}


def validate_setting_value(key: str, value: str) -> None:
    if key in POSITIVE_FLOAT_SETTINGS:
        try:
            parsed = float(value)
        except ValueError:
            raise ValueError(f"{key} must be a number")
        if parsed <= 0:
            raise ValueError(f"{key} must be greater than 0")


def generate_customer_number(db: Session) -> str:
    """Non-sequential ~50-bit random serial, so a card can't be guessed/enumerated."""
    for _ in range(10):
        candidate = "TVT-" + "".join(
            secrets.choice(_CUSTOMER_NUMBER_ALPHABET) for _ in range(_CUSTOMER_NUMBER_LENGTH)
        )
        exists = db.query(models.User.id).filter(models.User.customer_number == candidate).first()
        if not exists:
            return candidate
    raise RuntimeError("Could not generate a unique customer number")


def get_setting(db: Session, key: str) -> str:
    row = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
    if row is not None:
        return row.value
    return DEFAULT_SETTINGS[key]


def get_setting_float(db: Session, key: str) -> float:
    return float(get_setting(db, key))


def compute_sale_economics(db: Session, vendor: models.Vendor, amount_ils: float) -> Tuple[int, float, float]:
    """Returns (points_awarded, commission_rate_percent_snapshot, commission_owed_ils)."""
    point_value_ils = get_setting_float(db, "point_value_ils")
    points_rate_percent = (
        vendor.points_rate_percent
        if vendor.points_rate_percent is not None
        else get_setting_float(db, "default_points_rate_percent")
    )
    commission_rate_percent = vendor.commission_rate_percent

    points_awarded = int((amount_ils * points_rate_percent / 100) / point_value_ils)
    commission_owed_ils = round(amount_ils * commission_rate_percent / 100, 2)
    return points_awarded, commission_rate_percent, commission_owed_ils


def resolve_existing_sale_by_idempotency_key(db: Session, idempotency_key: str) -> Optional[models.SaleTransaction]:
    return (
        db.query(models.SaleTransaction)
        .filter(models.SaleTransaction.idempotency_key == idempotency_key)
        .first()
    )


def validate_and_resolve_sale_inputs(
    db: Session,
    vendor: models.Vendor,
    customer_number: str,
    product_id: Optional[int],
    amount_ils: float,
) -> Tuple[models.User, Optional[models.Product]]:
    """Shared validation for both admin-manual and vendor self-service sale reporting.
    Raises HTTPException directly — both call sites are routers, so this keeps the two
    reporting paths from drifting apart on a fraud-sensitive ledger."""
    customer = db.query(models.User).filter(models.User.customer_number == customer_number).first()
    if not customer:
        raise HTTPException(status_code=404, detail="No customer found for that customer number")

    product = None
    if product_id is not None:
        product = db.query(models.Product).filter(models.Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        if product.vendor_id is not None and product.vendor_id != vendor.id:
            raise HTTPException(status_code=400, detail="Product belongs to a different vendor")

    min_amount = get_setting_float(db, "min_transaction_ils")
    max_amount = get_setting_float(db, "max_transaction_ils")
    if not (min_amount <= amount_ils <= max_amount):
        raise HTTPException(
            status_code=400,
            detail=f"amount_ils must be between {min_amount} and {max_amount}",
        )

    return customer, product


def create_sale_transaction(
    db: Session,
    vendor: models.Vendor,
    customer: models.User,
    product: Optional[models.Product],
    amount_ils: float,
    idempotency_key: str,
    actor: str,
) -> models.SaleTransaction:
    """Writes the ledger rows (sale, atomic balance/popularity increments, points-ledger entry,
    notification). Raises sqlalchemy.exc.IntegrityError on an idempotency_key race — the caller
    must roll back and re-resolve via resolve_existing_sale_by_idempotency_key()."""
    points_awarded, commission_rate_snapshot, commission_owed_ils = compute_sale_economics(db, vendor, amount_ils)

    now = datetime.utcnow()
    sale = models.SaleTransaction(
        vendor_id=vendor.id,
        customer_id=customer.id,
        product_id=product.id if product else None,
        amount_ils=amount_ils,
        idempotency_key=idempotency_key,
        points_awarded=points_awarded,
        commission_rate_percent_snapshot=commission_rate_snapshot,
        commission_owed_ils=commission_owed_ils,
        status="confirmed",
        history=[{"ts": now.isoformat(), "actor": actor, "action": "reported_and_confirmed"}],
        reported_at=now,
        confirmed_at=now,
    )

    # Atomic SQL-level increments (same pattern as Product.view_count in routers/products.py) —
    # avoids a read-modify-write race against concurrent sales for the same vendor/customer/product.
    db.query(models.Vendor).filter(models.Vendor.id == vendor.id).update(
        {"commission_owed_total": models.Vendor.commission_owed_total + commission_owed_ils}
    )
    db.query(models.User).filter(models.User.id == customer.id).update(
        {"points_balance": models.User.points_balance + points_awarded}
    )
    if product is not None:
        db.query(models.Product).filter(models.Product.id == product.id).update(
            {"popularity_score": models.Product.popularity_score + 1}
        )

    db.add(sale)
    db.flush()  # assign sale.id; also surfaces a duplicate idempotency_key race as IntegrityError

    db.refresh(customer)  # pick up the atomic update above for an accurate ledger snapshot
    db.add(
        models.PointsLedgerEntry(
            user_id=customer.id,
            sale_transaction_id=sale.id,
            delta_points=points_awarded,
            reason="sale",
            balance_after=customer.points_balance,
        )
    )
    db.add(
        models.Notification(
            user_id=customer.id,
            type="points_earned",
            title_he="צברת נקודות ב-TIVUTA! 🎁",
            message_he=f"קיבלת {points_awarded} נקודות על רכישה ב-{vendor.name_he}",
        )
    )
    return sale
