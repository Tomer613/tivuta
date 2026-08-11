import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from . import models, schemas
from .database import SessionLocal
from .services import loyalty

_env_jwt_secret = os.environ.get("JWT_SECRET_KEY")
if not _env_jwt_secret and os.environ.get("DATABASE_URL"):
    # DATABASE_URL set (a real Postgres/Supabase backend, per this codebase's existing
    # local-SQLite-vs-real-DB convention) but no JWT secret configured — refuse to start
    # rather than silently issuing tokens signed with a guessable, publicly-known default.
    raise RuntimeError("JWT_SECRET_KEY must be set when DATABASE_URL is configured (production).")
SECRET_KEY = _env_jwt_secret or "tivuta_secret_key_change_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
vendor_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="vendor-auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


# Per-account login lockout — shared by both login principals (User via auth.py, Vendor via
# vendor_portal.py) so a fraud-sensitive check like this has exactly one implementation rather
# than two that could drift. Works on either model via duck-typing: both declare the same
# `hashed_password`/`failed_login_attempts`/`locked_until` columns.
def check_account_lock(db: Session, account) -> None:
    """Raises 423 if `account` is currently locked. Call BEFORE verifying the password, so a
    locked account never even pays for a bcrypt comparison."""
    if account.locked_until and account.locked_until > datetime.utcnow():
        lockout_minutes = int(loyalty.get_setting_float(db, "lockout_duration_minutes"))
        raise HTTPException(
            status_code=423,
            detail=f"Too many failed login attempts. Try again in {lockout_minutes} minute(s).",
        )


def record_failed_login(db: Session, account) -> None:
    """Increments the failure counter and locks the account once it reaches the configured
    threshold. The increment itself is an atomic SQL update (same pattern already used for
    Vendor.commission_owed_total / User.points_balance / Product.popularity_score) rather than a
    Python `+= 1` on an already-loaded object, so concurrent failed attempts against the same
    account (e.g. spread across IPs to dodge the per-IP rate limiter) can't lose an increment.
    Commits — callers don't need to commit again for this part of the request."""
    model = type(account)
    db.query(model).filter(model.id == account.id).update(
        {model.failed_login_attempts: model.failed_login_attempts + 1}
    )
    db.commit()
    db.refresh(account)

    max_attempts = loyalty.get_setting_float(db, "max_failed_login_attempts")
    if account.failed_login_attempts >= max_attempts:
        lockout_minutes = loyalty.get_setting_float(db, "lockout_duration_minutes")
        account.locked_until = datetime.utcnow() + timedelta(minutes=lockout_minutes)
        account.failed_login_attempts = 0
        db.commit()


def record_successful_login(db: Session, account) -> None:
    """Clears any lockout state on a successful login — old failed attempts never carry over."""
    if account.failed_login_attempts or account.locked_until:
        account.failed_login_attempts = 0
        account.locked_until = None
        db.commit()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Tokens issued before the "typ" claim existed have no "typ" at all — still accepted as
        # a member token so pre-existing sessions aren't force-logged-out. A vendor token always
        # carries typ="vendor" and must never be accepted here (a vendor is a store, not a member).
        if payload.get("typ") not in (None, "user"):
            raise credentials_exception
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user


async def get_current_user_optional(token: Optional[str] = Depends(optional_oauth2_scheme), db: Session = Depends(get_db)) -> Optional[models.User]:
    """Like get_current_user, but returns None instead of 401ing when no/invalid token is
    given — used by endpoints that must stay publicly readable (e.g. build-time static
    export fetches) but personalize their response when a user happens to be logged in."""
    if not token:
        return None
    try:
        return await get_current_user(token=token, db=db)
    except HTTPException:
        return None


async def get_current_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


async def get_current_vendor(token: str = Depends(vendor_oauth2_scheme), db: Session = Depends(get_db)):
    """Vendor portal auth — a fully separate principal from `User`/`role` (see loyalty program
    docs in CLAUDE.md): a vendor is a store, not a person, so it never satisfies get_current_user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("typ") != "vendor":
            raise credentials_exception
        login_email: str = payload.get("sub")
        if login_email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    vendor = (
        db.query(models.Vendor)
        .filter(models.Vendor.login_email == login_email, models.Vendor.is_active == True)
        .first()
    )
    if vendor is None:
        raise credentials_exception
    return vendor
