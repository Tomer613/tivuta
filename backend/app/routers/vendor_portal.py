import os
import secrets
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..rate_limit import limiter
from ..security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    check_account_lock,
    create_access_token,
    get_current_vendor,
    get_db,
    get_password_hash,
    record_failed_login,
    record_successful_login,
    verify_password,
)
from ..services import get_email_sender, loyalty
from .sales import _sale_read

router = APIRouter(tags=["vendor-portal"])

# Same escape hatch as auth.py's LOGIN_RATE_LIMIT, and for the same reason: a future E2E spec
# exercising the vendor portal would hit the identical per-IP slowapi collision that
# LOGIN_RATE_LIMIT was added to fix for /auth/login (see that file's comment). Unset in every
# real deployment, so this is exactly the "5/minute" it always was until a spec actually needs it.
VENDOR_LOGIN_RATE_LIMIT = os.environ.get("VENDOR_LOGIN_RATE_LIMIT", "5/minute")


@router.post("/vendor-auth/login", response_model=schemas.Token)
@limiter.limit(VENDOR_LOGIN_RATE_LIMIT)
def vendor_login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.login_email == form_data.username).first()
    if vendor:
        check_account_lock(db, vendor)
    if not vendor or not vendor.hashed_password or not verify_password(form_data.password, vendor.hashed_password):
        if vendor:
            record_failed_login(db, vendor)
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    record_successful_login(db, vendor)
    if not vendor.is_active:
        raise HTTPException(status_code=403, detail="Vendor account is inactive")

    access_token = create_access_token(
        data={"sub": vendor.login_email, "typ": "vendor"},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}


RESET_TOKEN_EXPIRE_MINUTES = 60  # matches auth.py's RESET_TOKEN_EXPIRE_MINUTES for members


@router.post("/vendor-auth/forgot-password")
@limiter.limit("3/hour")
def vendor_forgot_password(request: Request, payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Self-service password reset for a vendor who already has portal access. Mirrors
    auth.py's forgot_password exactly (same token/expiry shape, same anti-enumeration response)."""
    vendor = db.query(models.Vendor).filter(models.Vendor.login_email == payload.email).first()
    if vendor:
        token = secrets.token_urlsafe(32)
        vendor.reset_token = token
        vendor.reset_token_expires = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
        db.commit()

        base_url = os.environ.get("APP_BASE_URL", "http://localhost:3000")
        locale = payload.locale or "he"
        reset_link = f"{base_url}/{locale}/vendor/reset-password?token={token}"
        get_email_sender().send(
            to=vendor.login_email,
            subject="איפוס סיסמה - פורטל ספקים TIVUTA",
            html_body=f"<p>לאיפוס הסיסמה שלך לפורטל הספקים, לחץ/י על הקישור הבא (בתוקף לשעה):</p><p><a href=\"{reset_link}\">{reset_link}</a></p>",
        )

    # Always return success regardless of whether the email exists, to avoid email enumeration.
    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/vendor-auth/reset-password")
@limiter.limit("5/minute")
def vendor_reset_password(request: Request, payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.reset_token == payload.token).first()
    if not vendor or not vendor.reset_token_expires or vendor.reset_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    vendor.hashed_password = get_password_hash(payload.new_password)
    vendor.reset_token = None
    vendor.reset_token_expires = None
    # A fresh password shouldn't stay stuck behind an old lockout from the forgotten one.
    vendor.failed_login_attempts = 0
    vendor.locked_until = None
    db.commit()
    return {"message": "Password updated successfully."}


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
