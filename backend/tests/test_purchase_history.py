from app import models


def _login(client, email, password="testpass123"):
    resp = client.post("/auth/login", data={"username": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _make_vertical(db_session, slug):
    vertical = models.Vertical(slug=slug, label_he=slug)
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


def test_purchase_history_empty_with_no_orders(client, db_session, make_user):
    make_user(email="nohistory@example.com", password="testpass123")
    headers = _login(client, "nohistory@example.com")

    resp = client.get("/users/me/purchase-history", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_purchase_history_excludes_cancelled_orders(client, db_session, make_user):
    _make_vertical(db_session, "diamonds")
    kept = _make_product(db_session, "diamonds", title="נשאר")
    cancelled = _make_product(db_session, "diamonds", title="בוטל")
    make_user(email="cancelhist@example.com", password="testpass123")
    headers = _login(client, "cancelhist@example.com")

    client.post("/leads/cart-checkout", json={"items": [{"product_id": kept.id, "quantity": 1}]}, headers=headers)
    resp = client.post("/leads/cart-checkout", json={"items": [{"product_id": cancelled.id, "quantity": 1}]}, headers=headers)
    cancelled_order_id = resp.json()[0]["customer_order_id"]

    order = db_session.query(models.CustomerOrder).filter(models.CustomerOrder.id == cancelled_order_id).first()
    order.status = "cancelled"
    db_session.commit()

    history = client.get("/users/me/purchase-history", headers=headers).json()
    product_ids = [h["product_id"] for h in history]
    assert kept.id in product_ids
    assert cancelled.id not in product_ids


def test_purchase_history_respects_vertical_filter(client, db_session, make_user):
    _make_vertical(db_session, "diamonds")
    _make_vertical(db_session, "cars")
    diamond = _make_product(db_session, "diamonds", title="טבעת")
    car = _make_product(db_session, "cars", title="מכונית")
    make_user(email="crossvertical@example.com", password="testpass123")
    headers = _login(client, "crossvertical@example.com")

    client.post("/leads/cart-checkout", json={"items": [{"product_id": diamond.id, "quantity": 1}]}, headers=headers)
    client.post("/leads/cart-checkout", json={"items": [{"product_id": car.id, "quantity": 1}]}, headers=headers)

    history = client.get("/users/me/purchase-history?vertical=diamonds", headers=headers).json()
    assert len(history) == 1
    assert history[0]["product_id"] == diamond.id


def test_purchase_history_counts_repeat_purchases_and_orders_by_recency(client, db_session, make_user):
    _make_vertical(db_session, "diamonds")
    repeated = _make_product(db_session, "diamonds", title="חוזר")
    once = _make_product(db_session, "diamonds", title="פעם אחת")
    make_user(email="repeatbuyer@example.com", password="testpass123")
    headers = _login(client, "repeatbuyer@example.com")

    client.post("/leads/cart-checkout", json={"items": [{"product_id": repeated.id, "quantity": 1}]}, headers=headers)
    client.post("/leads/cart-checkout", json={"items": [{"product_id": once.id, "quantity": 3}]}, headers=headers)
    client.post("/leads/cart-checkout", json={"items": [{"product_id": repeated.id, "quantity": 5}]}, headers=headers)

    history = client.get("/users/me/purchase-history?vertical=diamonds", headers=headers).json()
    by_id = {h["product_id"]: h for h in history}
    assert by_id[repeated.id]["times_purchased"] == 2
    assert by_id[repeated.id]["last_quantity"] == 5  # the most recent checkout's quantity, not the first
    assert by_id[once.id]["times_purchased"] == 1
    # Most recently purchased product (repeated, bought last) comes first.
    assert history[0]["product_id"] == repeated.id


def test_purchase_history_excludes_individually_cancelled_line_item(client, db_session, make_user):
    """A single line item can be cancelled (PATCH /admin/leads/{id}/status or the bulk-action
    endpoint) without the parent CustomerOrder itself being cancelled — the two statuses are
    independent, so purchase history must check both."""
    _make_vertical(db_session, "diamonds")
    kept = _make_product(db_session, "diamonds", title="נשאר")
    cancelled_item = _make_product(db_session, "diamonds", title="פריט בוטל")
    make_user(email="lineitemcancel@example.com", password="testpass123")
    headers = _login(client, "lineitemcancel@example.com")

    resp = client.post(
        "/leads/cart-checkout",
        json={"items": [{"product_id": kept.id, "quantity": 1}, {"product_id": cancelled_item.id, "quantity": 1}]},
        headers=headers,
    )
    leads = resp.json()
    cancelled_lead_id = next(l["id"] for l in leads if l["product_id"] == cancelled_item.id)

    lead = db_session.query(models.Lead).filter(models.Lead.id == cancelled_lead_id).first()
    lead.status = "cancelled"
    db_session.commit()
    # The parent order itself is untouched — confirms this is testing line-item cancellation,
    # not the already-covered whole-order cancellation case.
    order = db_session.query(models.CustomerOrder).filter(models.CustomerOrder.id == lead.customer_order_id).first()
    assert order.status != "cancelled"

    history = client.get("/users/me/purchase-history?vertical=diamonds", headers=headers).json()
    product_ids = [h["product_id"] for h in history]
    assert kept.id in product_ids
    assert cancelled_item.id not in product_ids


def test_purchase_history_includes_active_quantity_discount_bundle(client, db_session, make_user):
    """PurchaseHistoryItem must carry the product's live quantity-discount bundle — this is what
    lets "reorder"/"quick reorder my usual" show the same discount a fresh add-to-cart would,
    instead of silently reordering at full price."""
    _make_vertical(db_session, "diamonds")
    product = _make_product(db_session, "diamonds", title="עם מבצע")
    bundle = models.QuantityDiscountBundle(name_he="מבצע", is_active=True)
    db_session.add(bundle)
    db_session.commit()
    db_session.refresh(bundle)
    db_session.add(models.QuantityDiscountTier(bundle_id=bundle.id, min_quantity=3, discount_percent=10))
    product.quantity_discount_bundle_id = bundle.id
    db_session.commit()

    make_user(email="bundlehistory@example.com", password="testpass123")
    headers = _login(client, "bundlehistory@example.com")
    client.post("/leads/cart-checkout", json={"items": [{"product_id": product.id, "quantity": 1}]}, headers=headers)

    history = client.get("/users/me/purchase-history?vertical=diamonds", headers=headers).json()
    assert history[0]["quantity_discount_bundle_id"] == bundle.id
    assert history[0]["quantity_discount_tiers"] == [{"min_quantity": 3, "discount_percent": 10}]


def test_purchase_history_omits_deactivated_quantity_discount_bundle(client, db_session, make_user):
    _make_vertical(db_session, "diamonds")
    product = _make_product(db_session, "diamonds")
    bundle = models.QuantityDiscountBundle(name_he="מבצע ישן", is_active=False)
    db_session.add(bundle)
    db_session.commit()
    db_session.refresh(bundle)
    product.quantity_discount_bundle_id = bundle.id
    db_session.commit()

    make_user(email="deadbundlehistory@example.com", password="testpass123")
    headers = _login(client, "deadbundlehistory@example.com")
    client.post("/leads/cart-checkout", json={"items": [{"product_id": product.id, "quantity": 1}]}, headers=headers)

    history = client.get("/users/me/purchase-history?vertical=diamonds", headers=headers).json()
    assert history[0]["quantity_discount_bundle_id"] is None
    assert history[0]["quantity_discount_tiers"] is None


def test_purchase_history_excludes_inactive_products(client, db_session, make_user):
    _make_vertical(db_session, "diamonds")
    product = _make_product(db_session, "diamonds")
    make_user(email="inactivebuyer@example.com", password="testpass123")
    headers = _login(client, "inactivebuyer@example.com")

    client.post("/leads/cart-checkout", json={"items": [{"product_id": product.id, "quantity": 1}]}, headers=headers)
    product.is_active = False
    db_session.commit()

    history = client.get("/users/me/purchase-history", headers=headers).json()
    assert history == []
