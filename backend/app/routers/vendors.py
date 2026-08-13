import os
import secrets
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..security import get_current_admin, get_db, get_password_hash
from ..services import get_email_sender, loyalty
from .vendor_portal import RESET_TOKEN_EXPIRE_MINUTES
from .verticals import validate_vertical_slug

router = APIRouter(tags=["vendors"])


@router.get("/admin/vendors", response_model=List[schemas.VendorRead], dependencies=[Depends(get_current_admin)])
def admin_list_vendors(vertical: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Vendor)
    if vertical:
        query = query.filter(models.Vendor.vertical == vertical)
    return query.order_by(models.Vendor.created_at.desc()).all()


@router.post("/admin/vendors", response_model=schemas.VendorRead, dependencies=[Depends(get_current_admin)])
def admin_create_vendor(vendor_in: schemas.VendorCreate, db: Session = Depends(get_db)):
    validate_vertical_slug(db, vendor_in.vertical)
    new_vendor = models.Vendor(**vendor_in.model_dump())
    db.add(new_vendor)
    db.commit()
    db.refresh(new_vendor)
    return new_vendor


@router.patch("/admin/vendors/{vendor_id}", response_model=schemas.VendorRead, dependencies=[Depends(get_current_admin)])
def admin_update_vendor(vendor_id: int, vendor_in: schemas.VendorUpdate, db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    update_data = vendor_in.model_dump(exclude_unset=True)
    if "vertical" in update_data:
        validate_vertical_slug(db, update_data["vertical"])
        if update_data["vertical"] != vendor.vertical:
            raise HTTPException(status_code=400, detail="Vendor vertical cannot be changed after creation")
    for key, value in update_data.items():
        setattr(vendor, key, value)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/admin/vendors/{vendor_id}", dependencies=[Depends(get_current_admin)])
def admin_delete_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor.is_active = False
    db.commit()
    return {"message": "Vendor deactivated"}


@router.patch(
    "/admin/vendors/{vendor_id}/portal-access",
    response_model=schemas.VendorRead,
    dependencies=[Depends(get_current_admin)],
)
def admin_set_vendor_portal_access(vendor_id: int, payload: schemas.VendorPortalAccessUpdate, db: Session = Depends(get_db)):
    """Issues or resets a vendor's self-service portal login. Vendors stay admin-curated (this
    endpoint is the only way a Vendor row ever gets portal credentials at all — there is no open
    self-registration), but the admin no longer has to invent and manually share a password:
    if payload.password is omitted, the vendor is emailed an invite link (the same token
    mechanism as POST /vendor-auth/reset-password) to set their own first password instead."""
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # A login_email must resolve unambiguously to exactly one principal (member vs vendor) —
    # get_current_user/get_current_vendor already separate tokens by "typ", but keeping the
    # emails themselves disjoint avoids any confusing overlap in admin tooling too.
    if db.query(models.User.id).filter(models.User.email == payload.login_email).first():
        raise HTTPException(status_code=400, detail="This email is already used by a member account")
    if (
        db.query(models.Vendor.id)
        .filter(models.Vendor.login_email == payload.login_email, models.Vendor.id != vendor_id)
        .first()
    ):
        raise HTTPException(status_code=400, detail="This email is already used by another vendor")

    vendor.login_email = payload.login_email
    if payload.password:
        vendor.hashed_password = get_password_hash(payload.password)
        vendor.reset_token = None
        vendor.reset_token_expires = None
    else:
        token = secrets.token_urlsafe(32)
        vendor.reset_token = token
        vendor.reset_token_expires = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
        base_url = os.environ.get("APP_BASE_URL", "http://localhost:3000")
        reset_link = f"{base_url}/he/vendor/reset-password?token={token}"
        get_email_sender().send(
            to=vendor.login_email,
            subject="הזמנה לפורטל הספקים - TIVUTA",
            html_body=(
                f"<p>הוקצתה לך גישה לפורטל הספקים של TIVUTA לדיווח עסקאות.</p>"
                f"<p>לקביעת סיסמה, לחץ/י על הקישור הבא (בתוקף לשעה):</p>"
                f"<p><a href=\"{reset_link}\">{reset_link}</a></p>"
            ),
        )
    # A fresh password (whether admin-set or invite-pending) shouldn't stay stuck behind an old lockout.
    vendor.failed_login_attempts = 0
    vendor.locked_until = None
    db.commit()
    db.refresh(vendor)
    return vendor


@router.get(
    "/admin/vendors/{vendor_id}/settlements",
    response_model=List[schemas.CommissionSettlementPeriodRead],
    dependencies=[Depends(get_current_admin)],
)
def admin_list_settlements(vendor_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.CommissionSettlementPeriod)
        .filter(models.CommissionSettlementPeriod.vendor_id == vendor_id)
        .order_by(models.CommissionSettlementPeriod.period_start.desc())
        .all()
    )


@router.post(
    "/admin/vendors/{vendor_id}/settlements",
    response_model=schemas.CommissionSettlementPeriodRead,
    dependencies=[Depends(get_current_admin)],
)
def admin_open_settlement_period(
    vendor_id: int, payload: schemas.CommissionSettlementPeriodCreate, db: Session = Depends(get_db)
):
    """Links unsettled confirmed transactions for the vendor within [period_start, period_end]
    to a new 'open' period, then sums whatever actually got linked. The claim is a single
    atomic UPDATE re-checking settlement_period_id IS NULL at execution time — two concurrent
    calls (e.g. an admin double-clicking submit) can't both read the same unclaimed rows and
    double-count them, since only one UPDATE can actually claim a given row."""
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    period = models.CommissionSettlementPeriod(
        vendor_id=vendor_id,
        period_start=payload.period_start,
        period_end=payload.period_end,
        total_amount_ils=0.0,
        status="open",
    )
    db.add(period)
    db.flush()  # assign period.id

    db.query(models.SaleTransaction).filter(
        models.SaleTransaction.vendor_id == vendor_id,
        models.SaleTransaction.status == "confirmed",
        models.SaleTransaction.settlement_period_id.is_(None),
        models.SaleTransaction.confirmed_at >= payload.period_start,
        models.SaleTransaction.confirmed_at <= payload.period_end,
    ).update({"settlement_period_id": period.id}, synchronize_session=False)

    total = (
        db.query(func.coalesce(func.sum(models.SaleTransaction.commission_owed_ils), 0.0))
        .filter(models.SaleTransaction.settlement_period_id == period.id)
        .scalar()
    )
    period.total_amount_ils = round(total, 2)

    db.commit()
    db.refresh(period)
    return period


@router.patch(
    "/admin/vendors/{vendor_id}/settlements/{period_id}/settle",
    response_model=schemas.CommissionSettlementPeriodRead,
)
def admin_settle_period(
    vendor_id: int,
    period_id: int,
    payload: schemas.CommissionSettlementPeriodSettle,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    period = (
        db.query(models.CommissionSettlementPeriod)
        .filter(
            models.CommissionSettlementPeriod.id == period_id,
            models.CommissionSettlementPeriod.vendor_id == vendor_id,
        )
        .first()
    )
    if not period:
        raise HTTPException(status_code=404, detail="Settlement period not found")
    if period.status == "settled":
        raise HTTPException(status_code=400, detail="Period is already settled")

    period.status = "settled"
    period.settled_at = datetime.utcnow()
    period.settled_by = current_admin.id
    if payload.note:
        period.note = payload.note

    db.query(models.Vendor).filter(models.Vendor.id == vendor_id).update(
        {"commission_owed_total": models.Vendor.commission_owed_total - period.total_amount_ils}
    )

    db.commit()
    db.refresh(period)
    return period


def _batch_line_from_lead(lead: models.Lead) -> schemas.VendorPurchaseBatchLineRead:
    product = lead.product
    order = lead.customer_order
    user = lead.user
    return schemas.VendorPurchaseBatchLineRead(
        id=lead.id,
        product_id=lead.product_id,
        product_title_he=product.title_he if product else None,
        quantity=lead.quantity,
        status=lead.status,
        customer_order_id=lead.customer_order_id,
        order_number=order.order_number if order else None,
        user_name=f"{user.first_name} {user.last_name}".strip() if user else None,
        user_email=user.email if user else None,
        user_phone=user.phone if user else None,
    )


def _load_batch(db: Session, batch_id: int) -> Optional[models.VendorPurchaseBatch]:
    return (
        db.query(models.VendorPurchaseBatch)
        .options(
            selectinload(models.VendorPurchaseBatch.leads).selectinload(models.Lead.product),
            selectinload(models.VendorPurchaseBatch.leads).selectinload(models.Lead.customer_order),
            selectinload(models.VendorPurchaseBatch.leads).selectinload(models.Lead.user),
        )
        .filter(models.VendorPurchaseBatch.id == batch_id)
        .first()
    )


def _batch_read(batch: models.VendorPurchaseBatch) -> schemas.VendorPurchaseBatchRead:
    return schemas.VendorPurchaseBatchRead(
        id=batch.id,
        batch_number=batch.batch_number,
        vendor_id=batch.vendor_id,
        status=batch.status,
        notes=batch.notes,
        created_at=batch.created_at,
        ordered_at=batch.ordered_at,
        received_at=batch.received_at,
        items=[_batch_line_from_lead(lead) for lead in batch.leads],
    )


@router.get(
    "/admin/vendors/{vendor_id}/purchase-batches",
    response_model=List[schemas.VendorPurchaseBatchRead],
    dependencies=[Depends(get_current_admin)],
)
def admin_list_vendor_batches(vendor_id: int, db: Session = Depends(get_db)):
    batches = (
        db.query(models.VendorPurchaseBatch)
        .options(
            selectinload(models.VendorPurchaseBatch.leads).selectinload(models.Lead.product),
            selectinload(models.VendorPurchaseBatch.leads).selectinload(models.Lead.customer_order),
            selectinload(models.VendorPurchaseBatch.leads).selectinload(models.Lead.user),
        )
        .filter(models.VendorPurchaseBatch.vendor_id == vendor_id)
        .order_by(models.VendorPurchaseBatch.created_at.desc())
        .all()
    )
    return [_batch_read(b) for b in batches]


@router.post(
    "/admin/vendors/{vendor_id}/purchase-batches",
    response_model=Optional[schemas.VendorPurchaseBatchRead],
    dependencies=[Depends(get_current_admin)],
)
def admin_create_vendor_batch(vendor_id: int, payload: schemas.VendorPurchaseBatchCreate, db: Session = Depends(get_db)):
    """Consolidates line items from many different CustomerOrders (e.g. 50 customers' kugel
    orders) that share this vendor into one purchase batch. The claim is a single atomic UPDATE
    re-checking vendor_batch_id IS NULL at execution time — same shape as
    admin_open_settlement_period — so a double-submit can't double-claim a row.

    Returns null (200) rather than an error when zero items were claimable — e.g. another
    request already claimed the same leads a moment ago. This is deliberately NOT an
    HTTPException: a partial claim (some items claimed) already succeeds with a 200 and a
    smaller item list, so a *complete* miss should read as the same event, just at the 0-of-N
    end of that same spectrum, rather than jumping to a different, scarier UX path. The caller
    treats null the same way it already treats "fewer items than requested" — an informational
    message, not an error banner."""
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    batch = models.VendorPurchaseBatch(vendor_id=vendor_id, status="open")
    db.add(batch)
    db.flush()  # assign batch.id

    claimed = db.query(models.Lead).filter(
        models.Lead.id.in_(payload.lead_ids),
        models.Lead.vendor_batch_id.is_(None),
        models.Lead.lead_type == "contact_request",  # only product-purchase lines are procurable
        models.Lead.status.notin_(["closed", "cancelled"]),
        models.Lead.product_id.in_(
            db.query(models.Product.id).filter(models.Product.vendor_id == vendor_id)
        ),
    ).update({"vendor_batch_id": batch.id}, synchronize_session=False)

    if claimed == 0:
        # Nothing was actually claimable — don't leave a phantom empty batch behind for a claim
        # that did nothing.
        db.rollback()
        return None

    db.commit()
    loaded = _load_batch(db, batch.id)
    if not loaded:
        raise HTTPException(status_code=500, detail="Batch was created but could not be reloaded")
    return _batch_read(loaded)


@router.patch(
    "/admin/vendors/{vendor_id}/purchase-batches/{batch_id}/status",
    response_model=schemas.VendorPurchaseBatchRead,
    dependencies=[Depends(get_current_admin)],
)
def admin_update_vendor_batch_status(
    vendor_id: int, batch_id: int, payload: schemas.VendorPurchaseBatchStatusUpdate, db: Session = Depends(get_db)
):
    batch = (
        db.query(models.VendorPurchaseBatch)
        .filter(models.VendorPurchaseBatch.id == batch_id, models.VendorPurchaseBatch.vendor_id == vendor_id)
        .first()
    )
    if not batch:
        raise HTTPException(status_code=404, detail="Purchase batch not found")

    allowed_next = {"open": "ordered", "ordered": "received"}
    if allowed_next.get(batch.status) != payload.status:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot move batch from '{batch.status}' to '{payload.status}'",
        )

    batch.status = payload.status
    if payload.status == "ordered":
        batch.ordered_at = datetime.utcnow()
    elif payload.status == "received":
        batch.received_at = datetime.utcnow()

    db.commit()
    loaded = _load_batch(db, batch.id)
    if not loaded:
        raise HTTPException(status_code=500, detail="Batch was updated but could not be reloaded")
    return _batch_read(loaded)


def _oldest_unsettled_transaction(db: Session, vendor_id: int) -> Optional[models.SaleTransaction]:
    return (
        db.query(models.SaleTransaction)
        .filter(
            models.SaleTransaction.vendor_id == vendor_id,
            models.SaleTransaction.status == "confirmed",
            models.SaleTransaction.settlement_period_id.is_(None),
        )
        .order_by(models.SaleTransaction.confirmed_at.asc())
        .first()
    )


@router.get(
    "/admin/vendors/at-risk",
    response_model=List[schemas.VendorAtRiskRead],
    dependencies=[Depends(get_current_admin)],
)
def admin_list_at_risk_vendors(db: Session = Depends(get_db)):
    """Vendors with an outstanding commission balance, surfaced so an admin can see who's
    overdue before it reaches the auto-deactivation threshold — a lightweight substitute for a
    full fraud dashboard, proportionate to a v1 rollout with no observed abuse yet."""
    threshold = loyalty.get_setting_float(db, "max_unsettled_ils_before_deactivate")
    now = datetime.utcnow()
    vendors = db.query(models.Vendor).filter(models.Vendor.commission_owed_total > 0).all()
    result = []
    for vendor in vendors:
        oldest = _oldest_unsettled_transaction(db, vendor.id)
        age_days = (now - oldest.confirmed_at).days if oldest and oldest.confirmed_at else None
        result.append(
            schemas.VendorAtRiskRead(
                vendor_id=vendor.id,
                name_he=vendor.name_he,
                commission_owed_total=vendor.commission_owed_total,
                oldest_unsettled_days=age_days,
                over_threshold=vendor.commission_owed_total >= threshold,
            )
        )
    result.sort(key=lambda v: v.commission_owed_total, reverse=True)
    return result


@router.post("/admin/vendors/check-unsettled-deactivation", dependencies=[Depends(get_current_admin)])
def admin_check_unsettled_deactivation(db: Session = Depends(get_db)):
    """The operational backstop for 'a vendor reports sales but never pays': if a vendor's
    unsettled commission balance is over threshold AND their oldest unsettled sale is older
    than the grace period, deactivate them — this immediately stops both further self-service
    reporting (get_current_vendor checks is_active) and further popularity accrual, without
    needing a payment gateway. Meant to be triggered manually from the admin UI for now (same
    pattern as the existing follow-up-reminders trigger); wiring it to a cron like
    distributions.py's process-scheduled is a drop-in follow-up once this is trusted in prod."""
    threshold = loyalty.get_setting_float(db, "max_unsettled_ils_before_deactivate")
    grace_days = int(loyalty.get_setting_float(db, "unsettled_grace_days"))
    cutoff = datetime.utcnow() - timedelta(days=grace_days)

    candidates = (
        db.query(models.Vendor)
        .filter(models.Vendor.is_active == True, models.Vendor.commission_owed_total >= threshold)
        .all()
    )
    deactivated = []
    for vendor in candidates:
        oldest = _oldest_unsettled_transaction(db, vendor.id)
        if oldest and oldest.confirmed_at and oldest.confirmed_at <= cutoff:
            vendor.is_active = False
            deactivated.append({"vendor_id": vendor.id, "name_he": vendor.name_he})

    db.commit()
    return {"checked": len(candidates), "deactivated": deactivated}
