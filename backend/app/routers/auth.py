import os
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import models, schemas
from ..rate_limit import limiter
from ..security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    check_account_lock,
    consume_reset_token,
    create_access_token,
    get_db,
    get_password_hash,
    issue_reset_token,
    record_failed_login,
    record_successful_login,
    verify_password,
)
from ..services import get_email_sender
from ..services import loyalty

router = APIRouter(prefix="/auth", tags=["auth"])

# Overridable only so the E2E test suite (frontend/e2e/) can raise this well above its own
# default — the suite's specs collectively make several /auth/login requests across different
# accounts within the same test run, all counted against the same per-IP bucket regardless of
# account (unlike the separate per-account lockout, which IS account-scoped). Every real
# deployment (Render, local dev) is unaffected: unset LOGIN_RATE_LIMIT and this is exactly the
# "5/minute" it always was.
# Read once at import time (slowapi decorator args are static) — a pytest fixture resetting this
# would run too late to matter. If you manually export LOGIN_RATE_LIMIT in a shell to start the
# backend for local E2E runs (see CLAUDE.md "How to Run"), use a separate terminal for `pytest`,
# or the rate-limit test (test_login_rate_limit_blocks_after_five_attempts) will see the wrong
# threshold and fail confusingly.
LOGIN_RATE_LIMIT = os.environ.get("LOGIN_RATE_LIMIT", "5/minute")


@router.post("/signup", response_model=schemas.UserRead)
@limiter.limit("10/hour")
def signup(request: Request, user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = get_password_hash(user_in.password)
    new_user = models.User(
        email=user_in.email,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone=user_in.phone,
        hashed_password=hashed_pw,
        customer_number=loyalty.generate_customer_number(db),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=schemas.Token)
@limiter.limit(LOGIN_RATE_LIMIT)
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if user:
        check_account_lock(db, user)
    if not user or not verify_password(form_data.password, user.hashed_password):
        if user:
            record_failed_login(db, user)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    record_successful_login(db, user)

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email, "typ": "user"}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/forgot-password")
@limiter.limit("3/hour")
def forgot_password(request: Request, payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user:
        token = issue_reset_token(db, user)

        base_url = os.environ.get("APP_BASE_URL", "http://localhost:3000")
        # A member's stored preference wins over whatever locale segment the forgot-password page
        # happened to be submitted from - fr/yi fall back to the English copy below, matching the
        # existing he-vs-English convention already used by _status_update_body/_confirmation_body.
        locale = user.preferred_language or payload.locale or "he"
        reset_link = f"{base_url}/{locale}/reset-password?token={token}"
        if locale == "he":
            subject = "איפוס סיסמה - TIVUTA"
            html_body = f"<p>לאיפוס הסיסמה שלך, לחץ/י על הקישור הבא (בתוקף לשעה):</p><p><a href=\"{reset_link}\">{reset_link}</a></p>"
        else:
            subject = "Reset your password - TIVUTA"
            html_body = f"<p>To reset your password, click the link below (valid for 1 hour):</p><p><a href=\"{reset_link}\">{reset_link}</a></p>"
        get_email_sender().send(to=user.email, subject=subject, html_body=html_body, locale=locale)

    # Always return success regardless of whether the email exists, to avoid email enumeration.
    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    consume_reset_token(db, models.User, payload.token, payload.new_password)
    return {"message": "Password updated successfully."}
