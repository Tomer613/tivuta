from datetime import timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..rate_limit import limiter
from ..security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    get_current_vendor,
    get_db,
    verify_password,
)
from ..services import loyalty
from .sales import _sale_read

router = APIRouter(tags=["vendor-portal"])


@router.post("/vendor-auth/login", response_model=schemas.Token)
@limiter.limit("5/minute")
def vendor_login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.login_email == form_data.username).first()
    if not vendor or not vendor.hashed_password or not verify_password(form_data.password, vendor.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not vendor.is_active:
        raise HTTPException(status_code=403, detail="Vendor account is inactive")

    access_token = create_access_token(
        data={"sub": vendor.login_email, "typ": "vendor"},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/vendor/me", response_model=schemas.VendorMeRead)
def vendor_me(vendor: models.Vendor = Depends(get_current_vendor)):
    return vendor


@router.get("/vendor/sales", response_model=List[schemas.SaleTransactionRead])
def vendor_list_sales(vendor: models.Vendor = Depends(get_current_vendor), db: Session = Depends(get_db)):
    sales = (
        db.query(models.SaleTransaction)
        .options(
            selectinload(models.SaleTransaction.vendor),
            selectinload(models.SaleTransaction.customer),
            selectinload(models.SaleTransaction.product),
        )
        .filter(models.SaleTransaction.vendor_id == vendor.id)
        .order_by(models.SaleTransaction.reported_at.desc())
        .all()
    )
    return [_sale_read(s) for s in sales]


@router.post("/vendor/sales", response_model=schemas.SaleTransactionRead)
def vendor_create_sale(
    payload: schemas.VendorSaleCreate,
    vendor: models.Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db),
):
    existing = loyalty.resolve_existing_sale_by_idempotency_key(db, payload.idempotency_key)
    if existing:
        if existing.vendor_id != vendor.id:
            # Never leak another vendor's sale details, even on an (astronomically unlikely)
            # idempotency_key collision — surface a conflict instead of returning their data.
            raise HTTPException(status_code=409, detail="idempotency_key already in use")
        return _sale_read(existing)

    customer, product = loyalty.validate_and_resolve_sale_inputs(
        db, vendor, payload.customer_number, payload.product_id, payload.amount_ils
    )

    try:
        sale = loyalty.create_sale_transaction(
            db, vendor, customer, product, payload.amount_ils, payload.idempotency_key,
            actor=f"vendor:{vendor.login_email}",
        )
    except IntegrityError:
        db.rollback()
        existing = loyalty.resolve_existing_sale_by_idempotency_key(db, payload.idempotency_key)
        if existing and existing.vendor_id == vendor.id:
            return _sale_read(existing)
        raise HTTPException(status_code=409, detail="idempotency_key already in use")

    db.commit()
    db.refresh(sale)
    return _sale_read(sale)


@router.get("/vendor/settlements", response_model=List[schemas.CommissionSettlementPeriodRead])
def vendor_list_settlements(vendor: models.Vendor = Depends(get_current_vendor), db: Session = Depends(get_db)):
    return (
        db.query(models.CommissionSettlementPeriod)
        .filter(models.CommissionSettlementPeriod.vendor_id == vendor.id)
        .order_by(models.CommissionSettlementPeriod.period_start.desc())
        .all()
    )
