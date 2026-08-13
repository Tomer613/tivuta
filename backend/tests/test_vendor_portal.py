from datetime import datetime, timedelta

from app import models
from app.security import get_password_hash


def test_vendor_forgot_password_creates_reset_token(client, make_vendor, db_session):
    vendor = make_vendor(login_email="forgot1@example.com", hashed_password=get_password_hash("oldpass123"))

    resp = client.post("/vendor-auth/forgot-password", json={"email": "forgot1@example.com"})
    assert resp.status_code == 200

    db_session.refresh(vendor)
    assert vendor.reset_token is not None
    assert vendor.reset_token_expires is not None
    assert vendor.reset_token_expires > datetime.utcnow()


def test_vendor_forgot_password_nonexistent_email_still_returns_200(client):
    # Anti-enumeration — same response whether or not the login_email exists.
    resp = client.post("/vendor-auth/forgot-password", json={"email": "no-such-vendor@example.com"})
    assert resp.status_code == 200


def test_vendor_reset_password_updates_hash_and_clears_lockout(client, make_vendor, db_session):
    vendor = make_vendor(
        login_email="reset1@example.com",
        hashed_password=get_password_hash("oldpass123"),
        reset_token="test-vendor-reset-token",
        reset_token_expires=datetime.utcnow() + timedelta(minutes=30),
        locked_until=datetime.utcnow() + timedelta(minutes=15),
        failed_login_attempts=5,
    )

    resp = client.post(
        "/vendor-auth/reset-password",
        json={"token": "test-vendor-reset-token", "new_password": "brandnewpass123"},
    )
    assert resp.status_code == 200

    db_session.refresh(vendor)
    assert vendor.locked_until is None
    assert vendor.failed_login_attempts == 0
    assert vendor.reset_token is None

    login_resp = client.post("/vendor-auth/login", data={"username": "reset1@example.com", "password": "brandnewpass123"})
    assert login_resp.status_code == 200


def test_vendor_reset_password_invalid_token_rejected(client):
    resp = client.post("/vendor-auth/reset-password", json={"token": "not-a-real-token", "new_password": "whatever123"})
    assert resp.status_code == 400


def test_admin_portal_access_without_password_sends_invite(client, make_user, make_vendor, db_session):
    make_user(email="portaladmin1@example.com", password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": "portaladmin1@example.com", "password": "adminpass123"})
    token = login.json()["access_token"]

    vendor = make_vendor(name_he="ספק חדש")
    resp = client.patch(
        f"/admin/vendors/{vendor.id}/portal-access",
        headers={"Authorization": f"Bearer {token}"},
        json={"login_email": "invitee1@example.com"},
    )
    assert resp.status_code == 200

    db_session.refresh(vendor)
    assert vendor.login_email == "invitee1@example.com"
    assert vendor.hashed_password is None  # never set — vendor must complete the invite link
    assert vendor.reset_token is not None
    assert vendor.reset_token_expires is not None


def test_admin_portal_access_with_password_sets_directly(client, make_user, make_vendor, db_session):
    make_user(email="portaladmin2@example.com", password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": "portaladmin2@example.com", "password": "adminpass123"})
    token = login.json()["access_token"]

    vendor = make_vendor(name_he="ספק ישן")
    resp = client.patch(
        f"/admin/vendors/{vendor.id}/portal-access",
        headers={"Authorization": f"Bearer {token}"},
        json={"login_email": "directset1@example.com", "password": "adminpicked123"},
    )
    assert resp.status_code == 200

    db_session.refresh(vendor)
    assert vendor.login_email == "directset1@example.com"
    assert vendor.hashed_password is not None
    assert vendor.reset_token is None  # no invite pending — a real password was set directly

    login_resp = client.post("/vendor-auth/login", data={"username": "directset1@example.com", "password": "adminpicked123"})
    assert login_resp.status_code == 200


def test_admin_portal_access_requires_admin(client, make_user, make_vendor):
    make_user(email="portalmember1@example.com", password="memberpass123", role="member")
    login = client.post("/auth/login", data={"username": "portalmember1@example.com", "password": "memberpass123"})
    token = login.json()["access_token"]

    vendor = make_vendor()
    resp = client.patch(
        f"/admin/vendors/{vendor.id}/portal-access",
        headers={"Authorization": f"Bearer {token}"},
        json={"login_email": "shouldnotwork@example.com"},
    )
    assert resp.status_code == 403
