from app import models
from app.services.notifications import SendResult


class _FakeEmailSender:
    """Captures every .send() call instead of actually sending, so tests can assert on the
    exact subject/body language a call site chose."""

    def __init__(self):
        self.sent = []

    def send(self, *, to, subject, html_body, locale="he"):
        self.sent.append({"to": to, "subject": subject, "html_body": html_body, "locale": locale})
        return SendResult(success=True, provider_message_id="fake")


def _make_admin_headers(client, make_user, email="plangadmin@example.com"):
    make_user(email=email, password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": email, "password": "adminpass123"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _login(client, email, password="testpass123"):
    login = client.post("/auth/login", data={"username": email, "password": password})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_update_preferred_language_valid_value(client, make_user):
    make_user(email="langmember1@example.com", password="testpass123")
    headers = _login(client, "langmember1@example.com")

    resp = client.patch("/users/me/preferred-language", json={"preferred_language": "en"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["preferred_language"] == "en"

    # Persisted, not just echoed back.
    me = client.get("/users/me", headers=headers)
    assert me.json()["preferred_language"] == "en"


def test_update_preferred_language_rejects_invalid_value(client, make_user):
    make_user(email="langmember2@example.com", password="testpass123")
    headers = _login(client, "langmember2@example.com")

    resp = client.patch("/users/me/preferred-language", json={"preferred_language": "de"}, headers=headers)
    assert resp.status_code == 422


def test_update_preferred_language_requires_auth(client):
    resp = client.patch("/users/me/preferred-language", json={"preferred_language": "en"})
    assert resp.status_code == 401


def test_lead_locale_prefers_stored_language_over_payload_locale(client, db_session, make_user, monkeypatch):
    """A member's stored preference should win over whatever locale segment the form happened
    to be submitted from - confirmed via the Lead row's own snapshotted .locale."""
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True, supports_appointments=True))
    db_session.commit()
    product = models.Product(vertical="diamonds", title_he="טבעת", description_he="תיאור", price=1000.0)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    make_user(email="langmember3@example.com", password="testpass123", preferred_language="en")
    headers = _login(client, "langmember3@example.com")

    fake_sender = _FakeEmailSender()
    monkeypatch.setattr("app.routers.leads.get_email_sender", lambda: fake_sender)

    resp = client.post(
        "/leads",
        json={"product_id": product.id, "scheduled_at": "2026-09-01T10:00:00", "locale": "he"},
        headers=headers,
    )
    assert resp.status_code == 200
    lead_id = resp.json()["id"]

    lead_row = db_session.query(models.Lead).filter(models.Lead.id == lead_id).first()
    assert lead_row.locale == "en"

    # Two emails go out per lead: the user's own confirmation (should follow their preference)
    # and a fixed-Hebrew internal admin notification (admin UI stays Hebrew regardless).
    user_email = next(m for m in fake_sender.sent if m["to"] == "langmember3@example.com")
    assert user_email["locale"] == "en"
    assert "Thank you" in user_email["html_body"]


def test_status_change_email_and_notification_use_preferred_language(client, db_session, make_user, monkeypatch):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True, supports_appointments=True))
    db_session.commit()
    product = models.Product(vertical="diamonds", title_he="טבעת", description_he="תיאור", price=1000.0)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    make_user(email="langmember4@example.com", password="testpass123", preferred_language="en")
    member_headers = _login(client, "langmember4@example.com")
    admin_headers = _make_admin_headers(client, make_user)

    fake_sender = _FakeEmailSender()
    monkeypatch.setattr("app.routers.leads.get_email_sender", lambda: fake_sender)

    create_resp = client.post(
        "/leads",
        json={"product_id": product.id, "scheduled_at": "2026-09-01T10:00:00"},
        headers=member_headers,
    )
    lead_id = create_resp.json()["id"]
    fake_sender.sent.clear()  # only care about the status-change email below

    status_resp = client.patch(f"/admin/leads/{lead_id}/status?status=confirmed", headers=admin_headers)
    assert status_resp.status_code == 200

    assert len(fake_sender.sent) == 1
    assert fake_sender.sent[0]["locale"] == "en"
    assert "confirmed" in fake_sender.sent[0]["subject"].lower()

    notif = (
        db_session.query(models.Notification)
        .filter(models.Notification.type == "lead_status")
        .order_by(models.Notification.id.desc())
        .first()
    )
    assert notif is not None
    assert notif.locale == "en"
    assert "confirmed" in notif.title.lower()


def test_forgot_password_uses_preferred_language(client, make_user, monkeypatch):
    make_user(email="langmember5@example.com", password="testpass123", preferred_language="en")

    fake_sender = _FakeEmailSender()
    monkeypatch.setattr("app.routers.auth.get_email_sender", lambda: fake_sender)

    resp = client.post("/auth/forgot-password", json={"email": "langmember5@example.com"})
    assert resp.status_code == 200

    assert len(fake_sender.sent) == 1
    assert fake_sender.sent[0]["locale"] == "en"
    assert "reset" in fake_sender.sent[0]["subject"].lower()
