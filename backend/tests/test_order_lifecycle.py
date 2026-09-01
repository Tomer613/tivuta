from datetime import datetime, timedelta

from app import models


class _FakeEmailSender:
    def __init__(self):
        self.sent = []

    def send(self, *, to, subject, html_body, locale="he"):
        self.sent.append({"to": to, "subject": subject, "html_body": html_body, "locale": locale})


def _login(client, email, password="testpass123"):
    resp = client.post("/auth/login", data={"username": email, "password": password})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def _make_admin_headers(client, make_user, email="lifecycleadmin@example.com"):
    make_user(email=email, password="adminpass123", role="admin")
    return _login(client, email, "adminpass123")


def _make_vertical(db_session, slug="diamonds"):
    v = models.Vertical(slug=slug, label_he=slug, is_active=True)
    db_session.add(v)
    db_session.commit()
    db_session.refresh(v)
    return v


def _make_product(db_session, vertical="diamonds", price=1000.0, stock_quantity=None, title="מוצר"):
    p = models.Product(vertical=vertical, title_he=title, description_he="תיאור", price=price, stock_quantity=stock_quantity)
    db_session.add(p)
    db_session.commit()
    db_session.refresh(p)
    return p


def _checkout(client, headers, product_id, quantity=1):
    resp = client.post("/leads/cart-checkout", json={"items": [{"product_id": product_id, "quantity": quantity}]}, headers=headers)
    assert resp.status_code == 200
    lead = resp.json()[0]
    return lead["id"], lead["customer_order_id"]


# ── Per-item status change no longer emails/notifies ───────────────────────────

def test_single_status_change_sends_no_email_or_notification(client, db_session, make_user, monkeypatch):
    _make_vertical(db_session)
    product = _make_product(db_session)
    make_user(email="lifecycle1@example.com", password="testpass123")
    member_headers = _login(client, "lifecycle1@example.com")
    admin_headers = _make_admin_headers(client, make_user)

    fake_sender = _FakeEmailSender()
    monkeypatch.setattr("app.routers.leads.get_email_sender", lambda: fake_sender)

    lead_id, _ = _checkout(client, member_headers, product.id)
    fake_sender.sent.clear()  # only care about the status-change call below, not checkout's own confirmation email
    resp = client.patch(f"/admin/leads/{lead_id}/status?status=confirmed", headers=admin_headers)
    assert resp.status_code == 200
    assert fake_sender.sent == []
    assert db_session.query(models.Notification).count() == 0


def test_bulk_status_change_sends_no_email(client, db_session, make_user, monkeypatch):
    _make_vertical(db_session)
    product = _make_product(db_session)
    make_user(email="lifecycle2@example.com", password="testpass123")
    member_headers = _login(client, "lifecycle2@example.com")
    admin_headers = _make_admin_headers(client, make_user, "lifecycle2admin@example.com")

    fake_sender = _FakeEmailSender()
    monkeypatch.setattr("app.routers.leads.get_email_sender", lambda: fake_sender)

    lead_id, _ = _checkout(client, member_headers, product.id)
    fake_sender.sent.clear()
    resp = client.patch("/admin/leads/bulk", json={"lead_ids": [lead_id], "action": "set_status", "value": "confirmed"}, headers=admin_headers)
    assert resp.status_code == 200
    assert fake_sender.sent == []


# ── Stock reservation on confirm/un-confirm ─────────────────────────────────────

def test_confirming_line_item_decrements_tracked_stock(client, db_session, make_user):
    _make_vertical(db_session)
    product = _make_product(db_session, stock_quantity=10)
    make_user(email="lifecycle3@example.com", password="testpass123")
    member_headers = _login(client, "lifecycle3@example.com")
    admin_headers = _make_admin_headers(client, make_user, "lifecycle3admin@example.com")

    lead_id, _ = _checkout(client, member_headers, product.id, quantity=3)
    resp = client.patch(f"/admin/leads/{lead_id}/status?status=confirmed", headers=admin_headers)
    assert resp.status_code == 200

    db_session.refresh(product)
    assert product.stock_quantity == 7
    entry = db_session.query(models.InventoryLedgerEntry).filter(models.InventoryLedgerEntry.product_id == product.id).first()
    assert entry.delta == -3
    assert entry.reason == "order_reserved"
    assert entry.balance_after == 7


def test_leaving_confirmed_restocks(client, db_session, make_user):
    _make_vertical(db_session)
    product = _make_product(db_session, stock_quantity=10)
    make_user(email="lifecycle4@example.com", password="testpass123")
    member_headers = _login(client, "lifecycle4@example.com")
    admin_headers = _make_admin_headers(client, make_user, "lifecycle4admin@example.com")

    lead_id, _ = _checkout(client, member_headers, product.id, quantity=2)
    client.patch(f"/admin/leads/{lead_id}/status?status=confirmed", headers=admin_headers)
    resp = client.patch(f"/admin/leads/{lead_id}/status?status=closed", headers=admin_headers)
    assert resp.status_code == 200

    db_session.refresh(product)
    assert product.stock_quantity == 10  # back to the original — reservation released


def test_untracked_stock_never_touched(client, db_session, make_user):
    _make_vertical(db_session)
    product = _make_product(db_session, stock_quantity=None)
    make_user(email="lifecycle5@example.com", password="testpass123")
    member_headers = _login(client, "lifecycle5@example.com")
    admin_headers = _make_admin_headers(client, make_user, "lifecycle5admin@example.com")

    lead_id, _ = _checkout(client, member_headers, product.id, quantity=5)
    resp = client.patch(f"/admin/leads/{lead_id}/status?status=confirmed", headers=admin_headers)
    assert resp.status_code == 200
    db_session.refresh(product)
    assert product.stock_quantity is None
    assert db_session.query(models.InventoryLedgerEntry).count() == 0


# ── Finalize / consolidated email ───────────────────────────────────────────────

def test_finalize_sends_one_email_with_all_item_statuses_and_notes(client, db_session, make_user, monkeypatch):
    _make_vertical(db_session)
    p1 = _make_product(db_session, title="מוצר א")
    p2 = _make_product(db_session, title="מוצר ב")
    make_user(email="lifecycle6@example.com", password="testpass123")
    member_headers = _login(client, "lifecycle6@example.com")
    admin_headers = _make_admin_headers(client, make_user, "lifecycle6admin@example.com")

    resp = client.post(
        "/leads/cart-checkout",
        json={"items": [{"product_id": p1.id, "quantity": 1}, {"product_id": p2.id, "quantity": 1}]},
        headers=member_headers,
    )
    leads = resp.json()
    order_id = leads[0]["customer_order_id"]
    lead1_id, lead2_id = leads[0]["id"], leads[1]["id"]

    client.patch(f"/admin/leads/{lead1_id}/status?status=confirmed", headers=admin_headers)
    client.patch(f"/admin/leads/{lead1_id}/notes", json={"notes": "יש להתקשר לפני משלוח"}, headers=admin_headers)
    client.patch(f"/admin/leads/{lead2_id}/status?status=closed", headers=admin_headers)

    fake_sender = _FakeEmailSender()
    monkeypatch.setattr("app.routers.leads.get_email_sender", lambda: fake_sender)

    resp = client.post(f"/admin/orders/{order_id}/finalize", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "awaiting_customer"
    assert body["confirmation_deadline"] is not None

    assert len(fake_sender.sent) == 1
    html = fake_sender.sent[0]["html_body"]
    assert "מוצר א" in html
    assert "מוצר ב" in html
    assert "יש להתקשר לפני משלוח" in html  # admin's note, now finally surfaced to the customer
    assert "order-confirm" in html


def test_finalize_rejects_already_confirmed_or_cancelled_order(client, db_session, make_user):
    _make_vertical(db_session)
    product = _make_product(db_session)
    make_user(email="lifecycle7@example.com", password="testpass123")
    member_headers = _login(client, "lifecycle7@example.com")
    admin_headers = _make_admin_headers(client, make_user, "lifecycle7admin@example.com")

    _, order_id = _checkout(client, member_headers, product.id)
    order = db_session.query(models.CustomerOrder).filter(models.CustomerOrder.id == order_id).first()
    order.status = "cancelled"
    db_session.commit()

    resp = client.post(f"/admin/orders/{order_id}/finalize", headers=admin_headers)
    assert resp.status_code == 400


# ── Cancel (manual + auto) restocks ─────────────────────────────────────────────

def test_manual_cancel_restocks_confirmed_items_and_marks_lines_cancelled(client, db_session, make_user):
    _make_vertical(db_session)
    product = _make_product(db_session, stock_quantity=5)
    make_user(email="lifecycle8@example.com", password="testpass123")
    member_headers = _login(client, "lifecycle8@example.com")
    admin_headers = _make_admin_headers(client, make_user, "lifecycle8admin@example.com")

    lead_id, order_id = _checkout(client, member_headers, product.id, quantity=2)
    client.patch(f"/admin/leads/{lead_id}/status?status=confirmed", headers=admin_headers)
    db_session.refresh(product)
    assert product.stock_quantity == 3

    resp = client.post(f"/admin/orders/{order_id}/cancel", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"
    assert resp.json()["items"][0]["status"] == "cancelled"

    db_session.refresh(product)
    assert product.stock_quantity == 5  # restocked


def test_cancel_rejects_already_confirmed_or_cancelled(client, db_session, make_user):
    _make_vertical(db_session)
    product = _make_product(db_session)
    make_user(email="lifecycle9@example.com", password="testpass123")
    member_headers = _login(client, "lifecycle9@example.com")
    admin_headers = _make_admin_headers(client, make_user, "lifecycle9admin@example.com")

    _, order_id = _checkout(client, member_headers, product.id)
    resp1 = client.post(f"/admin/orders/{order_id}/cancel", headers=admin_headers)
    assert resp1.status_code == 200
    resp2 = client.post(f"/admin/orders/{order_id}/cancel", headers=admin_headers)
    assert resp2.status_code == 400


# ── Public order-confirmation token flow ────────────────────────────────────────

def test_order_confirm_get_and_confirm_flow(client, db_session, make_user):
    _make_vertical(db_session)
    product = _make_product(db_session, price=250.0)
    make_user(email="lifecycle10@example.com", password="testpass123")
    member_headers = _login(client, "lifecycle10@example.com")
    admin_headers = _make_admin_headers(client, make_user, "lifecycle10admin@example.com")

    _, order_id = _checkout(client, member_headers, product.id, quantity=2)
    finalize_resp = client.post(f"/admin/orders/{order_id}/finalize", headers=admin_headers)
    order = db_session.query(models.CustomerOrder).filter(models.CustomerOrder.id == order_id).first()
    token = order.confirmation_token
    assert token

    get_resp = client.get(f"/order-confirm/{token}")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["status"] == "awaiting_customer"
    assert data["total"] == 500.0  # real price always present here

    confirm_resp = client.post(f"/order-confirm/{token}/confirm")
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["status"] == "customer_confirmed"

    db_session.refresh(order)
    assert order.status == "customer_confirmed"
    assert order.confirmed_at is not None

    # A second confirm attempt is rejected — already confirmed.
    resp_again = client.post(f"/order-confirm/{token}/confirm")
    assert resp_again.status_code == 400


def test_order_confirm_unknown_token_404s(client):
    resp = client.get("/order-confirm/not-a-real-token")
    assert resp.status_code == 404


def test_order_confirm_expired_deadline_rejected(client, db_session, make_user):
    _make_vertical(db_session)
    product = _make_product(db_session)
    make_user(email="lifecycle11@example.com", password="testpass123")
    member_headers = _login(client, "lifecycle11@example.com")
    admin_headers = _make_admin_headers(client, make_user, "lifecycle11admin@example.com")

    _, order_id = _checkout(client, member_headers, product.id)
    client.post(f"/admin/orders/{order_id}/finalize", headers=admin_headers)
    order = db_session.query(models.CustomerOrder).filter(models.CustomerOrder.id == order_id).first()
    order.confirmation_deadline = datetime.utcnow() - timedelta(hours=1)
    db_session.commit()

    resp = client.post(f"/order-confirm/{order.confirmation_token}/confirm")
    assert resp.status_code == 410


# ── Cron endpoints ───────────────────────────────────────────────────────────────

def test_reminder_cron_requires_secret(client):
    resp = client.post("/api/orders/send-confirmation-reminders")
    assert resp.status_code in (401, 500)


def test_reminder_cron_sends_once_past_halfway_point(client, db_session, make_user, monkeypatch):
    monkeypatch.setenv("CRON_SECRET", "test-secret-456")
    _make_vertical(db_session)
    product = _make_product(db_session)
    make_user(email="lifecycle12@example.com", password="testpass123")
    member_headers = _login(client, "lifecycle12@example.com")
    admin_headers = _make_admin_headers(client, make_user, "lifecycle12admin@example.com")

    _, order_id = _checkout(client, member_headers, product.id)
    client.post(f"/admin/orders/{order_id}/finalize", headers=admin_headers)
    order = db_session.query(models.CustomerOrder).filter(models.CustomerOrder.id == order_id).first()
    order.confirmation_deadline = datetime.utcnow() + timedelta(hours=1)  # within the 12h reminder window
    db_session.commit()

    fake_sender = _FakeEmailSender()
    monkeypatch.setattr("app.routers.order_confirm.get_email_sender", lambda: fake_sender)

    resp = client.post("/api/orders/send-confirmation-reminders", headers={"Authorization": "Bearer test-secret-456"})
    assert resp.status_code == 200
    assert resp.json()["reminders_sent"] == 1
    assert len(fake_sender.sent) == 1

    db_session.refresh(order)
    assert order.reminder_sent_at is not None

    # Running it again must not send a second reminder for the same order.
    resp2 = client.post("/api/orders/send-confirmation-reminders", headers={"Authorization": "Bearer test-secret-456"})
    assert resp2.json()["reminders_sent"] == 0


def test_auto_cancel_cron_cancels_expired_and_restocks(client, db_session, make_user, monkeypatch):
    monkeypatch.setenv("CRON_SECRET", "test-secret-789")
    _make_vertical(db_session)
    product = _make_product(db_session, stock_quantity=8)
    make_user(email="lifecycle13@example.com", password="testpass123")
    member_headers = _login(client, "lifecycle13@example.com")
    admin_headers = _make_admin_headers(client, make_user, "lifecycle13admin@example.com")

    lead_id, order_id = _checkout(client, member_headers, product.id, quantity=3)
    client.patch(f"/admin/leads/{lead_id}/status?status=confirmed", headers=admin_headers)
    client.post(f"/admin/orders/{order_id}/finalize", headers=admin_headers)
    order = db_session.query(models.CustomerOrder).filter(models.CustomerOrder.id == order_id).first()
    order.confirmation_deadline = datetime.utcnow() - timedelta(hours=1)
    db_session.commit()
    db_session.refresh(product)
    assert product.stock_quantity == 5  # reserved at confirm time

    resp = client.post("/api/orders/auto-cancel-expired", headers={"Authorization": "Bearer test-secret-789"})
    assert resp.status_code == 200
    assert resp.json()["cancelled"] == 1

    db_session.refresh(order)
    assert order.status == "cancelled"
    db_session.refresh(product)
    assert product.stock_quantity == 8  # restocked


# ── Admin stock adjustment ────────────────────────────────────────────────────

def test_admin_stock_adjust_endpoint(client, db_session, make_user):
    _make_vertical(db_session)
    product = _make_product(db_session, stock_quantity=20)
    admin_headers = _make_admin_headers(client, make_user, "lifecycle14admin@example.com")

    resp = client.patch(f"/admin/products/{product.id}/stock", json={"delta": -5}, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["stock_quantity"] == 15

    ledger = db_session.query(models.InventoryLedgerEntry).filter(models.InventoryLedgerEntry.product_id == product.id).first()
    assert ledger.delta == -5
    assert ledger.reason == "admin_adjustment"


def test_admin_delete_product_blocked_when_it_has_inventory_ledger_history(client, db_session, make_user):
    _make_vertical(db_session)
    product = _make_product(db_session, stock_quantity=10)
    admin_headers = _make_admin_headers(client, make_user, "lifecycle18admin@example.com")

    client.patch(f"/admin/products/{product.id}/stock", json={"delta": 5}, headers=admin_headers)

    resp = client.delete(f"/admin/products/{product.id}", headers=admin_headers)
    assert resp.status_code == 409
    # The product must survive untouched.
    still_there = db_session.query(models.Product).filter(models.Product.id == product.id).first()
    assert still_there is not None


def test_admin_create_product_with_initial_stock_writes_ledger_entry(client, db_session, make_user):
    _make_vertical(db_session)
    admin_headers = _make_admin_headers(client, make_user, "lifecycle15admin@example.com")

    resp = client.post(
        "/admin/products",
        json={"vertical": "diamonds", "title_he": "מוצר חדש", "description_he": "תיאור", "price": 100.0, "stock_quantity": 12},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    product_id = resp.json()["id"]
    entry = db_session.query(models.InventoryLedgerEntry).filter(models.InventoryLedgerEntry.product_id == product_id).first()
    assert entry.delta == 12
    assert entry.reason == "initial_stock"
    assert entry.balance_after == 12


# ── Order-linked customer inquiries ─────────────────────────────────────────────

def test_contact_us_with_order_id_links_to_order_and_hides_from_general_leads(client, db_session, make_user):
    _make_vertical(db_session)
    product = _make_product(db_session)
    make_user(email="lifecycle16@example.com", password="testpass123")
    member_headers = _login(client, "lifecycle16@example.com")
    admin_headers = _make_admin_headers(client, make_user, "lifecycle16admin@example.com")

    _, order_id = _checkout(client, member_headers, product.id)

    resp = client.post(
        "/leads/contact",
        json={"subject": "שאלה על ההזמנה", "message": "מתי זה מגיע?", "order_id": order_id},
        headers=member_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["customer_order_id"] == order_id

    admin_leads = client.get("/admin/leads", headers=admin_headers).json()
    assert all(l["subject"] != "שאלה על ההזמנה" for l in admin_leads)

    admin_orders = client.get("/admin/orders", headers=admin_headers).json()
    order = next(o for o in admin_orders if o["id"] == order_id)
    assert len(order["inquiries"]) == 1
    assert order["inquiries"][0]["subject"] == "שאלה על ההזמנה"


def test_contact_us_with_someone_elses_order_id_rejected(client, db_session, make_user):
    _make_vertical(db_session)
    product = _make_product(db_session)
    make_user(email="lifecycle17a@example.com", password="testpass123")
    make_user(email="lifecycle17b@example.com", password="testpass123")
    owner_headers = _login(client, "lifecycle17a@example.com")
    other_headers = _login(client, "lifecycle17b@example.com")

    _, order_id = _checkout(client, owner_headers, product.id)

    resp = client.post(
        "/leads/contact",
        json={"subject": "שאלה", "message": "הודעה", "order_id": order_id},
        headers=other_headers,
    )
    assert resp.status_code == 404
