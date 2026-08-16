"""Seeds a fresh DB with exactly the data the Playwright E2E specs (frontend/e2e/) need — a
vertical + a couple products, one member and one admin account with fixed credentials, and a
lowered max_failed_login_attempts so the lockout spec stays safely under slowapi's 5/minute
per-IP rate limit (see CLAUDE.md's "Per-Account Login Lockout" session for why 5+5 collides).

Idempotent by natural key (email / slug / setting key) so it's safe to re-run against the same DB.

Usage (from backend/, after `alembic upgrade head`):
    python -m scripts.seed_e2e
"""
from typing import Type, TypeVar

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import models
from app.security import get_password_hash
from app.services import loyalty

E2E_MEMBER_EMAIL = "e2e_member@tivuta.test"
E2E_MEMBER_PASSWORD = "e2eMemberPass123"
E2E_ADMIN_EMAIL = "e2e_admin@tivuta.test"
E2E_ADMIN_PASSWORD = "e2eAdminPass123"
# Dedicated to auth.spec.ts's lockout test — kept separate from E2E_MEMBER_EMAIL so locking this
# account out doesn't break cart-checkout.spec.ts / contact-us.spec.ts, which also need to log in
# as a member and don't run in any guaranteed order relative to the lockout spec.
E2E_LOCKOUT_EMAIL = "e2e_lockout@tivuta.test"
E2E_LOCKOUT_PASSWORD = "e2eLockoutPass123"
E2E_VENDOR_LOGIN_EMAIL = "e2e_vendor@tivuta.test"
E2E_VENDOR_LOGIN_PASSWORD = "e2eVendorPass123"
# Dedicated to distribution-scheduling.spec.ts's audience segmentation test — each has exactly
# one of city/membership_tracks set, and no other seeded user shares either value, so a filtered
# send's sent_count directly proves the filter worked rather than just that *a* send happened.
E2E_DIST_CITY_MEMBER_EMAIL = "e2e_dist_city@tivuta.test"
E2E_DIST_CITY_MEMBER_PASSWORD = "e2eDistCityPass123"
E2E_DIST_CITY = "ירושלים"
E2E_DIST_TRACK_MEMBER_EMAIL = "e2e_dist_track@tivuta.test"
E2E_DIST_TRACK_MEMBER_PASSWORD = "e2eDistTrackPass123"
E2E_DIST_TRACK = "gold_track"
E2E_VERTICAL_SLUG = "diamonds"

ModelT = TypeVar("ModelT")


def get_or_create(db: Session, model: Type[ModelT], lookup: dict, defaults: dict) -> ModelT:
    """Query by `lookup` (the natural key); if found, return it as-is (no field updates on a
    re-run — a developer's already-seeded DB shouldn't get silently mutated). Otherwise construct
    with `lookup | defaults`, flush, and return."""
    instance = db.query(model).filter_by(**lookup).first()
    if instance:
        return instance
    instance = model(**lookup, **defaults)
    db.add(instance)
    db.flush()
    return instance


def set_setting(db: Session, key: str, value: str) -> None:
    loyalty.validate_setting_value(key, value)
    row = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
    if row:
        row.value = value
    else:
        db.add(models.SystemSetting(key=key, value=value))


def seed_e2e():
    db = SessionLocal()
    try:
        member = None
        for email, password, role, extra in [
            (E2E_MEMBER_EMAIL, E2E_MEMBER_PASSWORD, "member", {}),
            (E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, "admin", {}),
            (E2E_LOCKOUT_EMAIL, E2E_LOCKOUT_PASSWORD, "member", {}),
            (E2E_DIST_CITY_MEMBER_EMAIL, E2E_DIST_CITY_MEMBER_PASSWORD, "member", {"city": E2E_DIST_CITY}),
            (E2E_DIST_TRACK_MEMBER_EMAIL, E2E_DIST_TRACK_MEMBER_PASSWORD, "member", {"membership_tracks": [E2E_DIST_TRACK]}),
        ]:
            user = get_or_create(
                db,
                models.User,
                {"email": email},
                {
                    "hashed_password": get_password_hash(password),
                    "first_name": "E2E",
                    "last_name": role.capitalize(),
                    "role": role,
                    **extra,
                },
            )
            if email == E2E_MEMBER_EMAIL:
                member = user

        # Every real production user gets one at signup (see loyalty.py); the vendor-portal spec
        # needs to report a sale against a real customer_number, so the seeded member needs one too.
        if member is not None and member.customer_number is None:
            member.customer_number = loyalty.generate_customer_number(db)

        get_or_create(
            db,
            models.Vendor,
            {"login_email": E2E_VENDOR_LOGIN_EMAIL},
            {
                "vertical": E2E_VERTICAL_SLUG,
                "name_he": "ספק בדיקות E2E",
                "hashed_password": get_password_hash(E2E_VENDOR_LOGIN_PASSWORD),
            },
        )

        get_or_create(
            db,
            models.Vertical,
            {"slug": E2E_VERTICAL_SLUG},
            {
                "label_he": "יהלומים",
                "label_en": "Diamonds",
                "icon": "Gem",
                "supports_appointments": True,
                "is_active": True,
            },
        )

        for title_he, price in [("טבעת יהלום E2E", 5000.0), ("עגילי יהלום E2E", 3000.0)]:
            get_or_create(
                db,
                models.Product,
                {"vertical": E2E_VERTICAL_SLUG, "title_he": title_he},
                {
                    "title_en": title_he,
                    "description_he": "מוצר לבדיקות E2E",
                    "price": price,
                    "is_active": True,
                },
            )

        # Dedicated to product-pricing.spec.ts's sale-price display test — a stable, idempotent
        # fixture (unlike the quantity-discount bundle in that same spec, which the test creates
        # itself via the API each run, matching admin-bulk-actions.spec.ts's precedent for
        # single-spec-owned fixtures).
        get_or_create(
            db,
            models.Product,
            {"vertical": E2E_VERTICAL_SLUG, "title_he": "טבעת יהלום מבצע E2E"},
            {
                "title_en": "טבעת יהלום מבצע E2E",
                "description_he": "מוצר לבדיקות E2E עם מחיר מבצע",
                "price": 2000.0,
                "sale_price": 1500.0,
                "is_active": True,
            },
        )

        # Keeps the lockout spec's 3-wrong-attempts-then-1-correct sequence (4 requests total)
        # safely under slowapi's 5/minute per-IP limit on /auth/login.
        set_setting(db, "max_failed_login_attempts", "3")
        db.commit()
        print("E2E seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_e2e()
