import pytest
from sqlalchemy.exc import IntegrityError

from app import models
from app.services import loyalty


def test_confirmed_sale_credits_points_and_commission(db_session, make_user, make_vendor):
    customer = make_user(email="buyer@example.com")
    vendor = make_vendor(commission_rate_percent=10.0, points_rate_percent=5.0)

    sale = loyalty.create_sale_transaction(
        db_session, vendor, customer, None, amount_ils=100.0, idempotency_key="sale-1", actor="test"
    )
    db_session.commit()

    assert sale.status == "confirmed"
    db_session.refresh(customer)
    db_session.refresh(vendor)
    assert sale.points_awarded > 0
    assert customer.points_balance == sale.points_awarded
    assert vendor.commission_owed_total == sale.commission_owed_ils

    ledger = db_session.query(models.PointsLedgerEntry).filter_by(user_id=customer.id).all()
    assert len(ledger) == 1
    assert ledger[0].delta_points == sale.points_awarded
    assert ledger[0].reason == "sale"


def test_duplicate_idempotency_key_does_not_double_credit(db_session, make_user, make_vendor):
    customer = make_user(email="buyer2@example.com")
    vendor = make_vendor(commission_rate_percent=10.0)

    loyalty.create_sale_transaction(db_session, vendor, customer, None, 100.0, "dupe-key", "test")
    db_session.commit()
    db_session.refresh(customer)
    balance_after_first = customer.points_balance
    assert balance_after_first > 0

    with pytest.raises(IntegrityError):
        loyalty.create_sale_transaction(db_session, vendor, customer, None, 100.0, "dupe-key", "test")
    db_session.rollback()

    existing = loyalty.resolve_existing_sale_by_idempotency_key(db_session, "dupe-key")
    assert existing is not None

    db_session.refresh(customer)
    assert customer.points_balance == balance_after_first  # unchanged — not double-credited


def test_flagged_sale_defers_effects_until_confirmed(db_session, make_user, make_vendor):
    customer = make_user(email="buyer3@example.com")
    vendor = make_vendor(commission_rate_percent=10.0)

    # Trip the per-vendor hourly velocity threshold (default is 20) without needing 20 real sales.
    db_session.add(models.SystemSetting(key="max_vendor_sales_per_hour", value="1"))
    db_session.commit()

    first = loyalty.create_sale_transaction(db_session, vendor, customer, None, 50.0, "flag-key-1", "test")
    db_session.commit()
    assert first.status == "confirmed"

    second = loyalty.create_sale_transaction(db_session, vendor, customer, None, 50.0, "flag-key-2", "test")
    db_session.commit()
    assert second.status == "flagged"

    db_session.refresh(customer)
    db_session.refresh(vendor)
    # Only the first (confirmed) sale's effects should have been applied — the flagged
    # second sale contributes nothing until an admin reviews and confirms it.
    assert customer.points_balance == first.points_awarded
    assert vendor.commission_owed_total == first.commission_owed_ils

    points_ledger_count = db_session.query(models.PointsLedgerEntry).filter_by(user_id=customer.id).count()
    assert points_ledger_count == 1  # only the confirmed sale wrote a ledger entry
