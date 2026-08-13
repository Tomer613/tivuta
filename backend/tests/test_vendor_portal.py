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


def test_admin_portal_access_editing_active_vendor_without_password_is_a_no_op_on_credentials(client, make_user, make_vendor, db_session):
    """Regression test: omitting the password used to always send an invite email and issue a
    fresh reset token, even for a vendor who already has working portal access — surprising the
    vendor with an unwanted email and (per the review that caught this) never actually
    invalidating their old password either. Editing just the email on an already-active vendor
    must now be a pure no-op on credentials/reset_token."""
    make_user(email="portaladmin3@example.com", password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": "portaladmin3@example.com", "password": "adminpass123"})
    token = login.json()["access_token"]

    vendor = make_vendor(
        name_he="ספק פעיל",
        login_email="active-vendor@example.com",
        hashed_password=get_password_hash("existingpass123"),
    )
    resp = client.patch(
        f"/admin/vendors/{vendor.id}/portal-access",
        headers={"Authorization": f"Bearer {token}"},
        json={"login_email": "active-vendor-typo-fixed@example.com"},
    )
    assert resp.status_code == 200
    assert resp.json()["login_email"] == "active-vendor-typo-fixed@example.com"

    db_session.refresh(vendor)
    assert vendor.login_email == "active-vendor-typo-fixed@example.com"
    assert vendor.reset_token is None  # no invite triggered by a plain edit

    # The vendor's original password must still work — editing the email alone never revokes it.
    login_resp = client.post(
        "/vendor-auth/login",
        data={"username": "active-vendor-typo-fixed@example.com", "password": "existingpass123"},
    )
    assert login_resp.status_code == 200


def test_admin_portal_access_response_includes_login_email(client, make_user, make_vendor):
    make_user(email="portaladmin4@example.com", password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": "portaladmin4@example.com", "password": "adminpass123"})
    token = login.json()["access_token"]

    vendor = make_vendor(name_he="ספק לבדיקת שדה")
    resp = client.patch(
        f"/admin/vendors/{vendor.id}/portal-access",
        headers={"Authorization": f"Bearer {token}"},
        json={"login_email": "fieldcheck@example.com"},
    )
    assert resp.status_code == 200
    assert resp.json()["login_email"] == "fieldcheck@example.com"

    list_resp = client.get("/admin/vendors", headers={"Authorization": f"Bearer {token}"})
    assert any(v["id"] == vendor.id and v["login_email"] == "fieldcheck@example.com" for v in list_resp.json())


def test_reset_password_rejects_short_new_password(client, make_vendor, db_session):
    vendor = make_vendor(
        login_email="weakpass@example.com",
        hashed_password=get_password_hash("oldpass123"),
        reset_token="weak-pass-token",
        reset_token_expires=datetime.utcnow() + timedelta(minutes=30),
    )
    resp = client.post("/vendor-auth/reset-password", json={"token": "weak-pass-token", "new_password": "short"})
    assert resp.status_code == 422

    db_session.refresh(vendor)
    assert vendor.reset_token == "weak-pass-token"  # rejected before consuming the token
