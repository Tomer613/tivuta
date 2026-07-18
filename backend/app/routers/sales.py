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
    existing = loyalty.resolve_existing_sale_by_idempotency_key(db, payload.idempotency_key)
    if existing:
        if existing.vendor_id != payload.vendor_id:
            raise HTTPException(status_code=409, detail="idempotency_key already used for a different vendor")
        return _sale_read(existing)

    vendor = (
        db.query(models.Vendor)
        .filter(models.Vendor.id == payload.vendor_id, models.Vendor.is_active == True)
        .first()
    )
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found or inactive")

    customer, product = loyalty.validate_and_resolve_sale_inputs(
        db, vendor, payload.customer_number, payload.product_id, payload.amount_ils
    )

    try:
        sale = loyalty.create_sale_transaction(
            db, vendor, customer, product, payload.amount_ils, payload.idempotency_key,
            actor=current_admin.email,
        )
    except IntegrityError:
        db.rollback()
        existing = loyalty.resolve_existing_sale_by_idempotency_key(db, payload.idempotency_key)
        if existing:
            return _sale_read(existing)
        raise

    db.commit()
    db.refresh(sale)
    return _sale_read(sale)
