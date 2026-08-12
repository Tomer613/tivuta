"""Seeds a fresh DB with exactly the data the Playwright E2E specs (frontend/e2e/) need — a
vertical + a couple products, one member and one admin account with fixed credentials, and a
lowered max_failed_login_attempts so the lockout spec stays safely under slowapi's 5/minute
per-IP rate limit (see CLAUDE.md's "Per-Account Login Lockout" session for why 5+5 collides).

Idempotent by natural key (email / slug / setting key) so it's safe to re-run against the same DB.

Usage (from backend/, after `alembic upgrade head`):
    python -m scripts.seed_e2e
"""
from app.database import SessionLocal
from app import models
from app.security import get_password_hash

E2E_MEMBER_EMAIL = "e2e_member@tivuta.test"
E2E_MEMBER_PASSWORD = "e2eMemberPass123"
E2E_ADMIN_EMAIL = "e2e_admin@tivuta.test"
E2E_ADMIN_PASSWORD = "e2eAdminPass123"
# Dedicated to auth.spec.ts's lockout test — kept separate from E2E_MEMBER_EMAIL so locking this
# account out doesn't break cart-checkout.spec.ts / contact-us.spec.ts, which also need to log in
# as a member and don't run in any guaranteed order relative to the lockout spec.
E2E_LOCKOUT_EMAIL = "e2e_lockout@tivuta.test"
E2E_LOCKOUT_PASSWORD = "e2eLockoutPass123"
E2E_VERTICAL_SLUG = "diamonds"


def get_or_create_user(db, email: str, password: str, role: str) -> models.User:
    user = db.query(models.User).filter(models.User.email == email).first()
    if user:
        return user
    user = models.User(
        email=email,
        hashed_password=get_password_hash(password),
        first_name="E2E",
        last_name=role.capitalize(),
        role=role,
    )
    db.add(user)
    db.flush()
    return user


def get_or_create_vertical(db) -> models.Vertical:
    vertical = db.query(models.Vertical).filter(models.Vertical.slug == E2E_VERTICAL_SLUG).first()
    if vertical:
        return vertical
    vertical = models.Vertical(
        slug=E2E_VERTICAL_SLUG,
        label_he="יהלומים",
        label_en="Diamonds",
        icon="Gem",
        supports_appointments=True,
        is_active=True,
    )
    db.add(vertical)
    db.flush()
    return vertical


def get_or_create_product(db, title_he: str, price: float) -> models.Product:
    product = (
        db.query(models.Product)
        .filter(models.Product.vertical == E2E_VERTICAL_SLUG, models.Product.title_he == title_he)
        .first()
    )
    if product:
        return product
    product = models.Product(
        vertical=E2E_VERTICAL_SLUG,
        title_he=title_he,
        title_en=title_he,
        description_he="מוצר לבדיקות E2E",
        price=price,
        is_active=True,
    )
    db.add(product)
    db.flush()
    return product


def set_setting(db, key: str, value: str) -> None:
    row = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
    if row:
        row.value = value
    else:
        db.add(models.SystemSetting(key=key, value=value))


def seed_e2e():
    db = SessionLocal()
    try:
        get_or_create_user(db, E2E_MEMBER_EMAIL, E2E_MEMBER_PASSWORD, "member")
        get_or_create_user(db, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, "admin")
        get_or_create_user(db, E2E_LOCKOUT_EMAIL, E2E_LOCKOUT_PASSWORD, "member")
        get_or_create_vertical(db)
        get_or_create_product(db, "טבעת יהלום E2E", 5000.0)
        get_or_create_product(db, "עגילי יהלום E2E", 3000.0)
        # Keeps the lockout spec's 3-wrong-attempts-then-1-correct sequence (4 requests total)
        # safely under slowapi's 5/minute per-IP limit on /auth/login.
        set_setting(db, "max_failed_login_attempts", "3")
        db.commit()
        print("E2E seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_e2e()
