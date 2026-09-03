from datetime import datetime, timedelta

from app import models


def _login(client, email, password="testpass123"):
    resp = client.post("/auth/login", data={"username": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _make_admin_headers(client, make_user, email="cadenceadmin@example.com"):
    make_user(email=email, password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": email, "password": "adminpass123"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _make_gabbai_vertical(db_session, slug="kiddush"):
    vertical = models.Vertical(slug=slug, label_he=slug, label_en=f"{slug}-en", requires_gabbai=True)
    db_session.add(vertical)
    db_session.commit()
    db_session.refresh(vertical)
    return vertical


def _make_product(db_session, vertical, title="מוצר בדיקה", price=100.0):
    product = models.Product(vertical=vertical, title_he=title, description_he="תיאור", price=price)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def _place_gabbai_order(client, headers, product_ids, days_ago, db_session):
    ids = product_ids if isinstance(product_ids, list) else [product_ids]
    resp = client.post(
        "/leads/cart-checkout",
        json={"items": [{"product_id": pid, "quantity": 1} for pid in ids]},
        headers=headers,
    )
    assert resp.status_code == 200
    order_id = resp.json()[0]["customer_order_id"]
    order = db_session.query(models.CustomerOrder).filter(models.CustomerOrder.id == order_id).first()
    order.created_at = datetime.utcnow() - timedelta(days=days_ago)
    for lead in order.leads:
        lead.created_at = order.created_at
    db_session.commit()
    return order


def test_cadence_nudge_sent_when_overdue_relative_to_own_rhythm(client, db_session, make_user):
    vertical = _make_gabbai_vertical(db_session)
    product = _make_product(db_session, vertical.slug)
    make_user(email="regulargabbai@example.com", password="testpass123", is_gabbai=True)
    headers = _login(client, "regulargabbai@example.com")
    admin_headers = _make_admin_headers(client, make_user)

    # Two past orders 7 days apart establish a ~7-day rhythm; the last one was 10 days ago — overdue.
    _place_gabbai_order(client, headers, product.id, days_ago=17, db_session=db_session)
    _place_gabbai_order(client, headers, product.id, days_ago=10, db_session=db_session)

    resp = client.post("/admin/leads/send-cadence-nudges", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json() == {"sent": 1}

    notif = (
        db_session.query(models.Notification)
        .filter(models.Notification.type == "order_cadence_nudge")
        .first()
    )
    assert notif is not None
    assert vertical.label_he in notif.title


def test_cadence_nudge_not_sent_when_not_yet_due(client, db_session, make_user):
    vertical = _make_gabbai_vertical(db_session)
    product = _make_product(db_session, vertical.slug)
    make_user(email="ontimegabbai@example.com", password="testpass123", is_gabbai=True)
    headers = _login(client, "ontimegabbai@example.com")
    admin_headers = _make_admin_headers(client, make_user, email="cadenceadmin2@example.com")

    # ~7-day rhythm, but the last order was only 2 days ago — not due.
    _place_gabbai_order(client, headers, product.id, days_ago=9, db_session=db_session)
    _place_gabbai_order(client, headers, product.id, days_ago=2, db_session=db_session)

    resp = client.post("/admin/leads/send-cadence-nudges", headers=admin_headers)
    assert resp.json() == {"sent": 0}


def test_cadence_nudge_requires_at_least_two_past_orders(client, db_session, make_user):
    vertical = _make_gabbai_vertical(db_session)
    product = _make_product(db_session, vertical.slug)
    make_user(email="firsttimegabbai@example.com", password="testpass123", is_gabbai=True)
    headers = _login(client, "firsttimegabbai@example.com")
    admin_headers = _make_admin_headers(client, make_user, email="cadenceadmin3@example.com")

    _place_gabbai_order(client, headers, product.id, days_ago=30, db_session=db_session)

    resp = client.post("/admin/leads/send-cadence-nudges", headers=admin_headers)
    assert resp.json() == {"sent": 0}


def test_cadence_nudge_not_resent_for_the_same_gap(client, db_session, make_user):
    vertical = _make_gabbai_vertical(db_session)
    product = _make_product(db_session, vertical.slug)
    make_user(email="repeatnudge@example.com", password="testpass123", is_gabbai=True)
    headers = _login(client, "repeatnudge@example.com")
    admin_headers = _make_admin_headers(client, make_user, email="cadenceadmin4@example.com")

    _place_gabbai_order(client, headers, product.id, days_ago=17, db_session=db_session)
    _place_gabbai_order(client, headers, product.id, days_ago=10, db_session=db_session)

    first = client.post("/admin/leads/send-cadence-nudges", headers=admin_headers)
    assert first.json() == {"sent": 1}

    # Same gap, no new order placed — re-running the cron must not nudge again.
    second = client.post("/admin/leads/send-cadence-nudges", headers=admin_headers)
    assert second.json() == {"sent": 0}


def test_cadence_nudge_uses_the_real_world_name_and_recipient_locale(client, db_session, make_user):
    vertical = _make_gabbai_vertical(db_session, slug="catering")
    product = _make_product(db_session, vertical.slug)
    make_user(email="englishgabbai2@example.com", password="testpass123", is_gabbai=True, preferred_language="en")
    headers = _login(client, "englishgabbai2@example.com")
    admin_headers = _make_admin_headers(client, make_user, email="cadenceadmin5@example.com")

    _place_gabbai_order(client, headers, product.id, days_ago=17, db_session=db_session)
    _place_gabbai_order(client, headers, product.id, days_ago=10, db_session=db_session)

    resp = client.post("/admin/leads/send-cadence-nudges", headers=admin_headers)
    assert resp.json() == {"sent": 1}

    notif = db_session.query(models.Notification).filter(models.Notification.type == "order_cadence_nudge").first()
    assert notif.locale == "en"
    assert "catering-en" in notif.title
    assert notif.title != "Time to order Kiddush?"


def test_cadence_nudge_requires_admin(client, db_session, make_user):
    make_user(email="notadmin3@example.com", password="testpass123")
    headers = _login(client, "notadmin3@example.com")
    resp = client.post("/admin/leads/send-cadence-nudges", headers=headers)
    assert resp.status_code == 403


def test_cron_cadence_nudges_requires_cron_secret(client, db_session, monkeypatch):
    monkeypatch.setenv("CRON_SECRET", "test-secret-789")

    resp = client.post("/api/leads/send-cadence-nudges")
    assert resp.status_code == 401

    resp = client.post("/api/leads/send-cadence-nudges", headers={"Authorization": "Bearer wrong"})
    assert resp.status_code == 401

    resp = client.post("/api/leads/send-cadence-nudges", headers={"Authorization": "Bearer test-secret-789"})
    assert resp.status_code == 200
    assert resp.json() == {"sent": 0}


def test_cadence_nudge_does_not_blend_across_different_gabbai_verticals(client, db_session, make_user):
    """Regression test: requires_gabbai is a free per-vertical admin toggle, not limited to one
    world — a gabbai's cadence in one gabbai-enabled world must never be skewed by an unrelated
    order in a different gabbai-enabled world."""
    kiddush = _make_gabbai_vertical(db_session, slug="kiddush")
    flowers = _make_gabbai_vertical(db_session, slug="flowers")
    kiddush_product = _make_product(db_session, kiddush.slug, title="יין")
    flowers_product = _make_product(db_session, flowers.slug, title="פרחים")
    make_user(email="multiworldgabbai@example.com", password="testpass123", is_gabbai=True)
    headers = _login(client, "multiworldgabbai@example.com")
    admin_headers = _make_admin_headers(client, make_user, email="cadenceadmin6@example.com")

    # A clean ~7-day kiddush rhythm, overdue by 3 days.
    _place_gabbai_order(client, headers, kiddush_product.id, days_ago=17, db_session=db_session)
    _place_gabbai_order(client, headers, kiddush_product.id, days_ago=10, db_session=db_session)
    # One unrelated flowers order sitting in between, chronologically — must not pollute the
    # kiddush gap calculation, and must not itself trigger a nudge (only 1 flowers order = no rhythm).
    _place_gabbai_order(client, headers, flowers_product.id, days_ago=13, db_session=db_session)

    resp = client.post("/admin/leads/send-cadence-nudges", headers=admin_headers)
    assert resp.json() == {"sent": 1}  # kiddush nudge only, not blended/skewed, not flowers

    notif = db_session.query(models.Notification).filter(models.Notification.type == "order_cadence_nudge").first()
    assert notif.link == "/world?slug=kiddush"


def test_cadence_nudge_tracks_every_vertical_within_a_mixed_order(client, db_session, make_user):
    """Regression test: _resolve_orderer_context allows a single checkout to mix two DIFFERENT
    gabbai-required verticals (it only rejects gabbai + non-gabbai mixes) — a mixed order must
    contribute to cadence tracking for BOTH verticals it contains, not just the first product
    found in it, or the second vertical's order history looks empty and never accrues a rhythm."""
    kiddush = _make_gabbai_vertical(db_session, slug="kiddush")
    flowers = _make_gabbai_vertical(db_session, slug="flowers")
    kiddush_product = _make_product(db_session, kiddush.slug, title="יין")
    flowers_product = _make_product(db_session, flowers.slug, title="פרחים")
    make_user(email="mixedordergabbai@example.com", password="testpass123", is_gabbai=True)
    headers = _login(client, "mixedordergabbai@example.com")
    admin_headers = _make_admin_headers(client, make_user, email="cadenceadmin7@example.com")

    # Two mixed orders (each with BOTH products), 7 days apart, last one 10 days ago — both
    # verticals are equally overdue and should each get their own nudge.
    _place_gabbai_order(client, headers, [kiddush_product.id, flowers_product.id], days_ago=17, db_session=db_session)
    _place_gabbai_order(client, headers, [kiddush_product.id, flowers_product.id], days_ago=10, db_session=db_session)

    resp = client.post("/admin/leads/send-cadence-nudges", headers=admin_headers)
    assert resp.json() == {"sent": 2}

    links = {
        n.link for n in db_session.query(models.Notification).filter(models.Notification.type == "order_cadence_nudge").all()
    }
    assert links == {"/world?slug=kiddush", "/world?slug=flowers"}


def test_cadence_nudge_skips_a_user_who_has_since_deactivated_gabbai_status(client, db_session, make_user):
    """A user's past gabbai orders still establish a rhythm in the data, but if they've since
    turned off is_gabbai, nudging them to place another gabbai order they've opted out of would be
    wrong — same overdue rhythm as test_cadence_nudge_sent_when_overdue_relative_to_own_rhythm,
    but no nudge should fire here."""
    vertical = _make_gabbai_vertical(db_session)
    product = _make_product(db_session, vertical.slug)
    user = make_user(email="formergabbai@example.com", password="testpass123", is_gabbai=True)
    headers = _login(client, "formergabbai@example.com")
    admin_headers = _make_admin_headers(client, make_user, email="cadenceadmin8@example.com")

    _place_gabbai_order(client, headers, product.id, days_ago=17, db_session=db_session)
    _place_gabbai_order(client, headers, product.id, days_ago=10, db_session=db_session)

    user.is_gabbai = False
    db_session.commit()

    resp = client.post("/admin/leads/send-cadence-nudges", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json() == {"sent": 0}
