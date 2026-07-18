import secrets
from typing import Tuple

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
}

# Settings that must parse as a positive float — enforced on write so a bad admin edit
# (e.g. "point_value_ils": "0") fails fast instead of causing a ZeroDivisionError later,
# at sale-report time, for every vendor.
POSITIVE_FLOAT_SETTINGS = {
    "point_value_ils",
    "default_points_rate_percent",
    "default_commission_rate_percent",
    "min_transaction_ils",
    "max_transaction_ils",
}


def validate_setting_value(key: str, value: str) -> None:
    if key in POSITIVE_FLOAT_SETTINGS:
        try:
            parsed = float(value)
        except ValueError:
            raise ValueError(f"{key} must be a number")
        if parsed <= 0:
            raise ValueError(f"{key} must be greater than 0")


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
