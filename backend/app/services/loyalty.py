import secrets
from datetime import datetime, timedelta
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
    # Fraud-resistance (Phase 5) — cheapest-control thresholds, tunable without a code change.
    "max_vendor_sales_per_hour": "20",
    "max_customer_vendor_sales_per_day": "5",
    "max_unsettled_ils_before_deactivate": "5000",
    "unsettled_grace_days": "14",
    # Per-account login lockout (security hardening) — same "tunable threshold" shape as the
    # fraud-resistance settings above, reused rather than building a second settings mechanism.
    "max_failed_login_attempts": "5",
    "lockout_duration_minutes": "15",
    # Self-hosted analytics retention — same "tunable threshold" shape again.
    "page_view_retention_days": "180",
    # A distribution stuck at status=="sending" past this many minutes is swept to "failed" by
    # the /api/distributions/timeout-stuck-sends cron - same "tunable threshold" shape again.
    "stuck_sending_timeout_minutes": "30",
    # Wording for the two-question form shown right after voting on a product poll (SurveyCard.tsx)
    # - kept here (admin-editable via the generic settings mechanism) instead of hardcoded in the
    # component, per explicit request, so the copy can change without a code deploy.
    "survey_followup_question1_he": "מעוניין שנחזור אליך עם הצעת מחיר מיוחדת עבור המוצרים שסימנת?",
    "survey_followup_question2_he": "האם ישנם מוצרים נוספים שאינם ברשימה שאתה צורך עבור הקהילה?",
}

# Settings that must parse as a STRICTLY positive float — enforced on write so a bad admin
# edit (e.g. "point_value_ils": "0") fails fast instead of causing a ZeroDivisionError later,
# at sale-report time, for every vendor.
POSITIVE_FLOAT_SETTINGS = {
    "point_value_ils",
    "default_points_rate_percent",
    "default_commission_rate_percent",
    "min_transaction_ils",
    "max_transaction_ils",
}

# Fraud-control thresholds (Phase 5) where 0 is a legitimate, meaningful policy choice — e.g.
# unsettled_grace_days=0 means "deactivate immediately once over threshold, no grace period" —
# so these only need to reject negative/non-numeric values, not zero.
NON_NEGATIVE_FLOAT_SETTINGS = {
    "max_vendor_sales_per_hour",
    "max_customer_vendor_sales_per_day",
    "max_unsettled_ils_before_deactivate",
    "unsettled_grace_days",
    # 0 is a legitimate (if aggressive/degenerate) policy value for both: 0 attempts = lock on
    # the very first failure, 0 minutes = lock but expire immediately (effectively no lockout).
    "max_failed_login_attempts",
    "lockout_duration_minutes",
    # 0 means "keep nothing" — an extreme but legitimate retention policy, not an error.
    "page_view_retention_days",
    # 0 means "time out immediately" — aggressive, but a legitimate policy value like the others
    # in this set.
    "stuck_sending_timeout_minutes",
}


def validate_setting_value(key: str, value: str) -> None:
    if key in POSITIVE_FLOAT_SETTINGS or key in NON_NEGATIVE_FLOAT_SETTINGS:
        try:
            parsed = float(value)
        except ValueError:
            raise ValueError(f"{key} must be a number")
        if key in POSITIVE_FLOAT_SETTINGS and parsed <= 0:
            raise ValueError(f"{key} must be greater than 0")
        if key in NON_NEGATIVE_FLOAT_SETTINGS and parsed < 0:
            raise ValueError(f"{key} must be 0 or greater")


def resolve_locale_or_en(preferred_language: Optional[str]) -> str:
    """Collapses a user's stored/resolved locale preference down to just 'he' or 'en', for the
    templates in this codebase that only have Hebrew and English copy - unset, 'fr', and 'yi' all
    fall back to English. Shared by every notification/email call site that needs *this specific*
    2-language fallback rule (leads.py's appointment-reminder and lead-status notifications,
    promotions.py's raffle-winner email, and this module's own points-earned notification) so a
    future change to the rule only needs to happen in one place. NOT used by
    routers/distributions.py's campaign emails, which have real he/en/fr/yi copy and resolve a
    recipient's locale directly (`user.preferred_language or "he"`, no collapsing) instead."""
    return "he" if (preferred_language or "he") == "he" else "en"


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


def determine_sale_status(db: Session, vendor: models.Vendor, customer: models.User) -> str:
    """Cheap velocity checks against the specific abuse patterns this system is exposed to:
    a vendor script-farming transactions to inflate ranking/points, or a vendor+customer pair
    fabricating repeat sales. Flags (does not block) — a genuinely busy store shouldn't be
    punished, but the pattern should land in front of an admin instead of auto-confirming."""
    now = datetime.utcnow()

    max_vendor_per_hour = get_setting_float(db, "max_vendor_sales_per_hour")
    vendor_count_last_hour = (
        db.query(models.SaleTransaction)
        .filter(
            models.SaleTransaction.vendor_id == vendor.id,
            models.SaleTransaction.reported_at >= now - timedelta(hours=1),
        )
        .count()
    )
    if vendor_count_last_hour >= max_vendor_per_hour:
        return "flagged"

    max_pair_per_day = get_setting_float(db, "max_customer_vendor_sales_per_day")
    pair_count_last_day = (
        db.query(models.SaleTransaction)
        .filter(
            models.SaleTransaction.vendor_id == vendor.id,
            models.SaleTransaction.customer_id == customer.id,
            models.SaleTransaction.reported_at >= now - timedelta(days=1),
        )
        .count()
    )
    if pair_count_last_day >= max_pair_per_day:
        return "flagged"

    return "confirmed"


def _apply_realized_sale_effects(db: Session, sale: models.SaleTransaction, customer: models.User, vendor_id: int, vendor_name_he: str, product_id: Optional[int]) -> None:
    """The atomic balance/popularity increments + points-ledger entry + notification that a sale
    actually 'counts' for. Shared by the synchronous-confirm path and the admin flagged-review
    confirm path, so a transaction realizes its effects exactly once, through one code path."""
    db.query(models.Vendor).filter(models.Vendor.id == vendor_id).update(
        {"commission_owed_total": models.Vendor.commission_owed_total + sale.commission_owed_ils}
    )
    db.query(models.User).filter(models.User.id == customer.id).update(
        {"points_balance": models.User.points_balance + sale.points_awarded}
    )
    if product_id is not None:
        db.query(models.Product).filter(models.Product.id == product_id).update(
            {"popularity_score": models.Product.popularity_score + 1}
        )
    db.flush()
    db.refresh(customer)
    db.add(
        models.PointsLedgerEntry(
            user_id=customer.id,
            sale_transaction_id=sale.id,
            delta_points=sale.points_awarded,
            reason="sale",
            balance_after=customer.points_balance,
        )
    )
    notif_locale = resolve_locale_or_en(customer.preferred_language)
    if notif_locale == "he":
        # Notification title/message render as plain React text (no dangerouslySetInnerHTML), so
        # bidi isolation here uses Unicode LRI/PDI marks, not the <span dir="ltr"> HTML technique
        # used in actual HTML email bodies elsewhere in this codebase.
        notif_title = "צברת נקודות ב-⁦TIVUTA⁩! 🎁"
        notif_message = f"קיבלת {sale.points_awarded} נקודות על רכישה ב-{vendor_name_he}"
    else:
        notif_title = "You earned points at TIVUTA! 🎁"
        notif_message = f"You earned {sale.points_awarded} points on a purchase at {vendor_name_he}"
    db.add(
        models.Notification(
            user_id=customer.id,
            type="points_earned",
            title=notif_title,
            message=notif_message,
            locale=notif_locale,
        )
    )


def create_sale_transaction(
    db: Session,
    vendor: models.Vendor,
    customer: models.User,
    product: Optional[models.Product],
    amount_ils: float,
    idempotency_key: str,
    actor: str,
) -> models.SaleTransaction:
    """Writes the sale row. If velocity checks pass, immediately realizes its effects (points,
    commission, popularity) — same as before Phase 5. If flagged, the row is written with no
    effects applied yet; an admin must confirm it (via admin_review_sale) before anything is
    realized, or reverse it (nothing to claw back, since nothing was ever applied).
    Raises sqlalchemy.exc.IntegrityError on an idempotency_key race — the caller must roll back
    and re-resolve via resolve_existing_sale_by_idempotency_key()."""
    points_awarded, commission_rate_snapshot, commission_owed_ils = compute_sale_economics(db, vendor, amount_ils)
    status = determine_sale_status(db, vendor, customer)

    now = datetime.utcnow()
    action = "reported_and_confirmed" if status == "confirmed" else "reported_and_flagged"
    sale = models.SaleTransaction(
        vendor_id=vendor.id,
        customer_id=customer.id,
        product_id=product.id if product else None,
        amount_ils=amount_ils,
        idempotency_key=idempotency_key,
        points_awarded=points_awarded,
        commission_rate_percent_snapshot=commission_rate_snapshot,
        commission_owed_ils=commission_owed_ils,
        status=status,
        history=[{"ts": now.isoformat(), "actor": actor, "action": action}],
        reported_at=now,
        confirmed_at=now if status == "confirmed" else None,
    )

    db.add(sale)
    db.flush()  # assign sale.id; also surfaces a duplicate idempotency_key race as IntegrityError

    if status == "confirmed":
        _apply_realized_sale_effects(db, sale, customer, vendor.id, vendor.name_he, product.id if product else None)

    return sale


def review_sale(db: Session, sale: models.SaleTransaction, action: str, actor: str) -> models.SaleTransaction:
    """Admin decision on a sale — 'confirm' only applies to a flagged sale (releases its
    deferred points/commission/popularity effects); 'reverse' works on either a flagged sale
    (nothing to claw back, since a flagged sale never had its effects applied) or an already-
    confirmed one (full clawback: negative points-ledger entry, popularity decrement, and a
    commission_owed_total decrement — but only if the sale hasn't already been swept into a
    settled CommissionSettlementPeriod, since that money has already changed hands outside the
    app and reversing it here would silently misstate the vendor's real running balance)."""
    if action not in ("confirm", "reverse"):
        raise HTTPException(status_code=400, detail="action must be 'confirm' or 'reverse'")

    now = datetime.utcnow()
    history = list(sale.history or [])

    if action == "confirm":
        if sale.status != "flagged":
            raise HTTPException(status_code=400, detail="Only flagged sales can be confirmed")
        customer = db.query(models.User).filter(models.User.id == sale.customer_id).first()
        vendor = db.query(models.Vendor).filter(models.Vendor.id == sale.vendor_id).first()
        sale.status = "confirmed"
        sale.confirmed_at = now
        history.append({"ts": now.isoformat(), "actor": actor, "action": "admin_confirmed_flagged"})
        sale.history = history
        _apply_realized_sale_effects(db, sale, customer, vendor.id, vendor.name_he, sale.product_id)
        return sale

    # action == "reverse"
    if sale.status == "reversed":
        raise HTTPException(status_code=400, detail="Sale is already reversed")
    was_realized = sale.status == "confirmed"
    sale.status = "reversed"
    history.append({"ts": now.isoformat(), "actor": actor, "action": "admin_reversed"})
    sale.history = history

    if was_realized:
        db.query(models.User).filter(models.User.id == sale.customer_id).update(
            {"points_balance": models.User.points_balance - sale.points_awarded}
        )
        if sale.product_id is not None:
            db.query(models.Product).filter(models.Product.id == sale.product_id).update(
                {"popularity_score": models.Product.popularity_score - 1}
            )
        if sale.settlement_period_id is None:
            db.query(models.Vendor).filter(models.Vendor.id == sale.vendor_id).update(
                {"commission_owed_total": models.Vendor.commission_owed_total - sale.commission_owed_ils}
            )
        db.flush()
        customer = db.query(models.User).filter(models.User.id == sale.customer_id).first()
        db.add(
            models.PointsLedgerEntry(
                user_id=sale.customer_id,
                sale_transaction_id=sale.id,
                delta_points=-sale.points_awarded,
                reason="clawback",
                balance_after=customer.points_balance,
            )
        )
    return sale
