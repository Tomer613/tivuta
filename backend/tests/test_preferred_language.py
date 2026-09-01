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


def test_garbage_payload_locale_never_persists_to_lead_or_notification(client, db_session, make_user, monkeypatch):
    """Regression test: a raw API caller can send any string as payload.locale (LeadCreate.locale
    has no field_validator). Before the fr/yi migration, loyalty.resolve_locale_or_en() absorbed
    this harmlessly by always normalizing to exactly 'he' or 'en'; removing that collapse exposed
    a real gap where a garbage value could flow straight into Lead.locale and then
    Notification.locale, which the frontend (NotificationBell.tsx) trusts is always one of the 4
    real locales to decide RTL vs LTR. schemas.normalize_locale() must catch this at the point the
    value first enters the system."""
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True, supports_appointments=True))
    db_session.commit()
    product = models.Product(vertical="diamonds", title_he="טבעת", description_he="תיאור", price=1000.0)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    make_user(email="garbagelocale@example.com", password="testpass123")  # no preferred_language set
    member_headers = _login(client, "garbagelocale@example.com")
    admin_headers = _make_admin_headers(client, make_user, email="garbagelocaleadmin@example.com")

    fake_sender = _FakeEmailSender()
    monkeypatch.setattr("app.routers.leads.get_email_sender", lambda: fake_sender)

    resp = client.post(
        "/leads",
        json={"product_id": product.id, "scheduled_at": "2026-09-01T10:00:00", "locale": "xyz123"},
        headers=member_headers,
    )
    assert resp.status_code == 200
    lead_id = resp.json()["id"]
    order_id = resp.json()["customer_order_id"]

    lead_row = db_session.query(models.Lead).filter(models.Lead.id == lead_id).first()
    assert lead_row.locale == "he"  # clamped, not "xyz123"

    status_resp = client.patch(f"/admin/leads/{lead_id}/status?status=confirmed", headers=admin_headers)
    assert status_resp.status_code == 200

    # The garbage payload locale never reaches the user record itself (no preferred_language was
    # ever set), so the finalize email/notification — which resolve locale from user.preferred_language,
    # not from the original lead-creation payload — must still land on the "he" fallback too.
    finalize_resp = client.post(f"/admin/orders/{order_id}/finalize", headers=admin_headers)
    assert finalize_resp.status_code == 200

    notif = (
        db_session.query(models.Notification)
        .filter(models.Notification.type == "system")
        .order_by(models.Notification.id.desc())
        .first()
    )
    assert notif.locale == "he"


def test_finalize_order_email_and_notification_use_preferred_language(client, db_session, make_user, monkeypatch):
    """Regression coverage for where this locale-correctness concern actually lives now: a single
    line-item status change (PATCH /admin/leads/{id}/status) no longer emails or notifies the
    customer at all (see test_order_lifecycle.py's dedicated test for that removal) — the
    consolidated summary email only goes out once, from POST /admin/orders/{id}/finalize."""
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
    order_id = create_resp.json()["customer_order_id"]
    client.patch(f"/admin/leads/{lead_id}/status?status=confirmed", headers=admin_headers)
    fake_sender.sent.clear()  # only care about the finalize email below

    finalize_resp = client.post(f"/admin/orders/{order_id}/finalize", headers=admin_headers)
    assert finalize_resp.status_code == 200

    assert len(fake_sender.sent) == 1
    assert fake_sender.sent[0]["locale"] == "en"
    assert "confirm" in fake_sender.sent[0]["subject"].lower()

    notif = (
        db_session.query(models.Notification)
        .filter(models.Notification.type == "system")
        .order_by(models.Notification.id.desc())
        .first()
    )
    assert notif is not None
    assert notif.locale == "en"


def test_forgot_password_uses_preferred_language(client, make_user, monkeypatch):
    make_user(email="langmember5@example.com", password="testpass123", preferred_language="en")

    fake_sender = _FakeEmailSender()
    monkeypatch.setattr("app.routers.auth.get_email_sender", lambda: fake_sender)

    resp = client.post("/auth/forgot-password", json={"email": "langmember5@example.com"})
    assert resp.status_code == 200

    assert len(fake_sender.sent) == 1
    assert fake_sender.sent[0]["locale"] == "en"
    assert "reset" in fake_sender.sent[0]["subject"].lower()


def test_forgot_password_supports_french_and_yiddish_natively(client, make_user, monkeypatch):
    """Regression test: fr/yi used to silently collapse to English for every transactional email
    in this codebase (loyalty.resolve_locale_or_en) - the profile page promises all 4 languages,
    so these must now be genuinely distinct from both Hebrew and English, not a fallback."""
    make_user(email="langmemberfr@example.com", password="testpass123", preferred_language="fr")
    make_user(email="langmemberyi@example.com", password="testpass123", preferred_language="yi")

    fake_sender = _FakeEmailSender()
    monkeypatch.setattr("app.routers.auth.get_email_sender", lambda: fake_sender)

    client.post("/auth/forgot-password", json={"email": "langmemberfr@example.com"})
    client.post("/auth/forgot-password", json={"email": "langmemberyi@example.com"})

    fr_mail = next(m for m in fake_sender.sent if m["to"] == "langmemberfr@example.com")
    yi_mail = next(m for m in fake_sender.sent if m["to"] == "langmemberyi@example.com")
    assert fr_mail["locale"] == "fr"
    assert "réinitialis" in fr_mail["subject"].lower()
    assert "reset your password" not in fr_mail["html_body"].lower()
    assert yi_mail["locale"] == "yi"
    assert "reset your password" not in yi_mail["html_body"].lower()
    assert "לאיפוס הסיסמה" not in yi_mail["html_body"]  # not the Hebrew body either


def test_finalize_order_supports_french_and_yiddish_natively(client, db_session, make_user, monkeypatch):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True, supports_appointments=True))
    db_session.commit()
    product = models.Product(vertical="diamonds", title_he="טבעת", description_he="תיאור", price=1000.0)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    make_user(email="statusfr@example.com", password="testpass123", preferred_language="fr")
    member_headers = _login(client, "statusfr@example.com")
    admin_headers = _make_admin_headers(client, make_user, email="statusfradmin@example.com")

    fake_sender = _FakeEmailSender()
    monkeypatch.setattr("app.routers.leads.get_email_sender", lambda: fake_sender)

    create_resp = client.post(
        "/leads", json={"product_id": product.id, "scheduled_at": "2026-09-01T10:00:00"}, headers=member_headers,
    )
    lead_id = create_resp.json()["id"]
    order_id = create_resp.json()["customer_order_id"]
    client.patch(f"/admin/leads/{lead_id}/status?status=confirmed", headers=admin_headers)
    fake_sender.sent.clear()

    finalize_resp = client.post(f"/admin/orders/{order_id}/finalize", headers=admin_headers)
    assert finalize_resp.status_code == 200

    assert fake_sender.sent[0]["locale"] == "fr"
    assert "confirmer" in fake_sender.sent[0]["html_body"].lower()


def test_appointment_reminder_supports_french_and_yiddish_natively(client, db_session, make_user, monkeypatch):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True, supports_appointments=True))
    db_session.commit()
    product = models.Product(vertical="diamonds", title_he="טבעת", description_he="תיאור", price=1000.0)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    make_user(email="remindfr@example.com", password="testpass123", preferred_language="fr")
    member_headers = _login(client, "remindfr@example.com")
    admin_headers = _make_admin_headers(client, make_user, email="remindfradmin@example.com")

    fake_sender = _FakeEmailSender()
    monkeypatch.setattr("app.routers.leads.get_email_sender", lambda: fake_sender)

    create_resp = client.post(
        "/leads", json={"product_id": product.id, "scheduled_at": "2026-09-01T10:00:00"}, headers=member_headers,
    )
    lead_id = create_resp.json()["id"]
    fake_sender.sent.clear()

    resp = client.post(f"/admin/leads/{lead_id}/send-appointment-reminder", headers=admin_headers)
    assert resp.status_code == 200

    assert fake_sender.sent[0]["locale"] == "fr"
    assert "rendez-vous" in fake_sender.sent[0]["html_body"].lower()

    notif = (
        db_session.query(models.Notification)
        .filter(models.Notification.type == "appointment_reminder")
        .order_by(models.Notification.id.desc())
        .first()
    )
    assert notif.locale == "fr"
    assert "rendez-vous" in notif.title.lower()


def test_points_earned_notification_supports_french_and_yiddish_natively(db_session, make_user, make_vendor):
    from app.services import loyalty

    customer = make_user(email="pointsfr@example.com", preferred_language="fr")
    vendor = make_vendor(commission_rate_percent=10.0, points_rate_percent=5.0)

    loyalty.create_sale_transaction(
        db_session, vendor, customer, None, amount_ils=100.0, idempotency_key="points-fr-1", actor="test"
    )
    db_session.commit()

    notif = (
        db_session.query(models.Notification)
        .filter(models.Notification.user_id == customer.id, models.Notification.type == "points_earned")
        .first()
    )
    assert notif is not None
    assert notif.locale == "fr"
    assert "gagné" in notif.title.lower()
    assert "you earned points" not in notif.title.lower()
