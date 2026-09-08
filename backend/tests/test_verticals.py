from app import models


def _make_admin_headers(client, make_user, email="verticaladmin@example.com"):
    make_user(email=email, password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": email, "password": "adminpass123"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_vertical_icon_accepts_new_library_icon(client, db_session, make_user):
    """Icons like Trophy only exist since the icon library was unified/expanded — confirms the
    unified VALID_ICON_NAMES tuple (not the old, narrower 11-name VALID_VERTICAL_ICONS) is what
    Vertical.icon is actually validated against now."""
    headers = _make_admin_headers(client, make_user)
    resp = client.post(
        "/admin/verticals",
        json={"slug": "trophies", "label_he": "גביעים", "icon": "Trophy"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["icon"] == "Trophy"


def test_vertical_icon_update_accepts_new_library_icon(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    vertical = models.Vertical(slug="watches2", label_he="שעונים", icon="Store", is_active=True)
    db_session.add(vertical)
    db_session.commit()
    db_session.refresh(vertical)

    resp = client.patch(
        f"/admin/verticals/{vertical.id}",
        json={"icon": "Handshake"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["icon"] == "Handshake"


def test_invalid_vertical_icon_rejected(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    resp = client.post(
        "/admin/verticals",
        json={"slug": "bogus", "label_he": "בדיקה", "icon": "NotARealIcon"},
        headers=headers,
    )
    assert resp.status_code == 422

    vertical = models.Vertical(slug="realestate2", label_he="נדלן", icon="Store", is_active=True)
    db_session.add(vertical)
    db_session.commit()
    db_session.refresh(vertical)
    update_resp = client.patch(
        f"/admin/verticals/{vertical.id}",
        json={"icon": "NotARealIcon"},
        headers=headers,
    )
    assert update_resp.status_code == 422
