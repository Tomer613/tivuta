from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..security import get_current_admin, get_db
from ..services import loyalty

router = APIRouter(tags=["sales"])


def _sale_read(sale: models.SaleTransaction) -> schemas.SaleTransactionRead:
    result = schemas.SaleTransactionRead.model_validate(sale)
    result.vendor_name_he = sale.vendor.name_he if sale.vendor else None
    result.customer_name = f"{sale.customer.first_name} {sale.customer.last_name}" if sale.customer else None
    result.product_title_he = sale.product.title_he if sale.product else None
    return result


@router.get("/admin/settings", response_model=List[schemas.SystemSettingRead], dependencies=[Depends(get_current_admin)])
def admin_list_settings(db: Session = Depends(get_db)):
    existing = {row.key: row.value for row in db.query(models.SystemSetting).all()}
    merged = dict(loyalty.DEFAULT_SETTINGS)
    merged.update(existing)
    return [schemas.SystemSettingRead(key=k, value=v) for k, v in sorted(merged.items())]


@router.patch("/admin/settings", response_model=List[schemas.SystemSettingRead])
def admin_update_settings(
    payload: schemas.SystemSettingsUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    for key, value in payload.settings.items():
        try:
            loyalty.validate_setting_value(key, value)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        row = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
        if row:
            row.value = value
            row.updated_by = current_admin.id
        else:
            db.add(models.SystemSetting(key=key, value=value, updated_by=current_admin.id))
    db.commit()
    return admin_list_settings(db)


@router.get("/admin/sales", response_model=List[schemas.SaleTransactionRead], dependencies=[Depends(get_current_admin)])
def admin_list_sales(vendor_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.SaleTransaction).options(
        selectinload(models.SaleTransaction.vendor),
        selectinload(models.SaleTransaction.customer),
        selectinload(models.SaleTransaction.product),
    )
    if vendor_id:
        query = query.filter(models.SaleTransaction.vendor_id == vendor_id)
    sales = query.order_by(models.SaleTransaction.reported_at.desc()).all()
    return [_sale_read(s) for s in sales]


@router.post("/admin/sales", response_model=schemas.SaleTransactionRead)
def admin_create_sale(
    payload: schemas.AdminSaleCreate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    existing = (
        db.query(models.SaleTransaction)
        .filter(models.SaleTransaction.idempotency_key == payload.idempotency_key)
        .first()
    )
    if existing:
        return _sale_read(existing)

    vendor = (
        db.query(models.Vendor)
        .filter(models.Vendor.id == payload.vendor_id, models.Vendor.is_active == True)
        .first()
    )
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found or inactive")

    customer = db.query(models.User).filter(models.User.customer_number == payload.customer_number).first()
    if not customer:
        raise HTTPException(status_code=404, detail="No customer found for that customer number")

    product = None
    if payload.product_id is not None:
        product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        if product.vendor_id is not None and product.vendor_id != vendor.id:
            raise HTTPException(status_code=400, detail="Product belongs to a different vendor")

    min_amount = loyalty.get_setting_float(db, "min_transaction_ils")
    max_amount = loyalty.get_setting_float(db, "max_transaction_ils")
    if not (min_amount <= payload.amount_ils <= max_amount):
        raise HTTPException(
            status_code=400,
            detail=f"amount_ils must be between {min_amount} and {max_amount}",
        )

    points_awarded, commission_rate_snapshot, commission_owed_ils = loyalty.compute_sale_economics(
        db, vendor, payload.amount_ils
    )

    now = datetime.utcnow()
    sale = models.SaleTransaction(
        vendor_id=vendor.id,
        customer_id=customer.id,
        product_id=product.id if product else None,
        amount_ils=payload.amount_ils,
        idempotency_key=payload.idempotency_key,
        points_awarded=points_awarded,
        commission_rate_percent_snapshot=commission_rate_snapshot,
        commission_owed_ils=commission_owed_ils,
        status="confirmed",
        history=[{"ts": now.isoformat(), "actor": current_admin.email, "action": "reported_and_confirmed"}],
        reported_at=now,
        confirmed_at=now,
    )

    # Atomic SQL-level increments (same pattern as Product.view_count in routers/products.py) —
    # avoids a read-modify-write race against concurrent sales for the same vendor/customer.
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
    try:
        db.flush()  # assign sale.id for the ledger entry below; also surfaces a duplicate idempotency_key race
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(models.SaleTransaction)
            .filter(models.SaleTransaction.idempotency_key == payload.idempotency_key)
            .first()
        )
        if existing:
            return _sale_read(existing)
        raise

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

    db.commit()
    db.refresh(sale)
    return _sale_read(sale)
