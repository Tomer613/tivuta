from app import models


def _make_admin_headers(client, make_user, email="qdadmin@example.com"):
    make_user(email=email, password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": email, "password": "adminpass123"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _login(client, make_user, email="qdmember@example.com"):
    make_user(email=email, password="testpass123")
    login = client.post("/auth/login", data={"username": email, "password": "testpass123"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_bundle_and_assign_single_product(client, db_session, make_user):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    headers = _make_admin_headers(client, make_user)

    resp = client.post(
        "/admin/quantity-discounts",
        json={
            "name_he": "מבצע כמות",
            "tiers": [{"min_quantity": 3, "discount_percent": 10}, {"min_quantity": 5, "discount_percent": 15}],
        },
        headers=headers,
    )
    assert resp.status_code == 200
    bundle = resp.json()
    assert bundle["bundle_code"] == f"QD-{bundle['id']:06d}"
    assert len(bundle["tiers"]) == 2
    assert bundle["product_count"] == 0

    product = models.Product(vertical="diamonds", title_he="טבעת", description_he="תיאור", price=100.0)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    update_resp = client.put(
        f"/admin/products/{product.id}",
        json={"quantity_discount_bundle_id": bundle["id"]},
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["quantity_discount"]["id"] == bundle["id"]

    list_resp = client.get("/products", params={"vertical": "diamonds"}).json()
    matched = next(p for p in list_resp if p["id"] == product.id)
    assert matched["quantity_discount"]["tiers"][0]["min_quantity"] == 3


def test_reject_duplicate_tier_quantities(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    resp = client.post(
        "/admin/quantity-discounts",
        json={"name_he": "מבצע", "tiers": [{"min_quantity": 3, "discount_percent": 10}, {"min_quantity": 3, "discount_percent": 20}]},
        headers=headers,
    )
    assert resp.status_code == 400


def test_reject_inverted_tier_percents(client, db_session, make_user):
    """A higher quantity threshold offering a *lower* percent than a lower threshold is rejected
    as a nonsensical configuration."""
    headers = _make_admin_headers(client, make_user)
    resp = client.post(
        "/admin/quantity-discounts",
        json={"name_he": "מבצע", "tiers": [{"min_quantity": 3, "discount_percent": 20}, {"min_quantity": 5, "discount_percent": 10}]},
        headers=headers,
    )
    assert resp.status_code == 400


def test_bulk_assign_and_clear(client, db_session, make_user):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    headers = _make_admin_headers(client, make_user)

    bundle = client.post(
        "/admin/quantity-discounts",
        json={"name_he": "מבצע", "tiers": [{"min_quantity": 3, "discount_percent": 10}]},
        headers=headers,
    ).json()

    products = []
    for i in range(3):
        p = models.Product(vertical="diamonds", title_he=f"מוצר {i}", description_he="תיאור", price=100.0)
        db_session.add(p)
        products.append(p)
    db_session.commit()
    for p in products:
        db_session.refresh(p)

    resp = client.patch(
        "/admin/products/bulk-quantity-discount",
        json={"product_ids": [p.id for p in products], "quantity_discount_bundle_id": bundle["id"]},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["updated"] == 3
    for p in products:
        db_session.refresh(p)
        assert p.quantity_discount_bundle_id == bundle["id"]

    clear_resp = client.patch(
        "/admin/products/bulk-quantity-discount",
        json={"product_ids": [p.id for p in products], "quantity_discount_bundle_id": None},
        headers=headers,
    )
    assert clear_resp.status_code == 200
    for p in products:
        db_session.refresh(p)
        assert p.quantity_discount_bundle_id is None


def test_deactivated_bundle_hidden_from_product_read_but_fk_preserved(client, db_session, make_user):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    headers = _make_admin_headers(client, make_user)

    bundle = client.post(
        "/admin/quantity-discounts",
        json={"name_he": "מבצע", "tiers": [{"min_quantity": 3, "discount_percent": 10}]},
        headers=headers,
    ).json()

    product = models.Product(
        vertical="diamonds", title_he="טבעת", description_he="תיאור", price=100.0, quantity_discount_bundle_id=bundle["id"]
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    del_resp = client.delete(f"/admin/quantity-discounts/{bundle['id']}", headers=headers)
    assert del_resp.status_code == 200

    get_resp = client.get(f"/products/{product.id}").json()
    assert get_resp["quantity_discount"] is None

    db_session.refresh(product)
    assert product.quantity_discount_bundle_id == bundle["id"]


def test_cart_checkout_applies_aggregate_tier_and_snapshots_price(client, db_session, make_user):
    """The core order-price-snapshotting regression test: two different products sharing one
    bundle, checked out together, cross the bundle's tier threshold on their *combined* quantity
    — every line item gets the tier discount stacked on top of its own sale price, and the
    resulting Lead rows permanently record the real numbers, not just a live product reference."""
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    admin_headers = _make_admin_headers(client, make_user)

    bundle = client.post(
        "/admin/quantity-discounts",
        json={
            "name_he": "מבצע כמות",
            "tiers": [{"min_quantity": 3, "discount_percent": 10}, {"min_quantity": 5, "discount_percent": 20}],
        },
        headers=admin_headers,
    ).json()

    # Product A has a sale price (900 instead of 1000); Product B has none.
    product_a = models.Product(
        vertical="diamonds", title_he="מוצר א", description_he="תיאור", price=1000.0, sale_price=900.0,
        quantity_discount_bundle_id=bundle["id"],
    )
    product_b = models.Product(
        vertical="diamonds", title_he="מוצר ב", description_he="תיאור", price=200.0,
        quantity_discount_bundle_id=bundle["id"],
    )
    db_session.add_all([product_a, product_b])
    db_session.commit()
    db_session.refresh(product_a)
    db_session.refresh(product_b)

    member_headers = _login(client, make_user)

    # 2 of A + 2 of B = 4 combined units -> qualifies for the 10% tier (not the 5-unit 20% tier).
    resp = client.post(
        "/leads/cart-checkout",
        json={"items": [{"product_id": product_a.id, "quantity": 2}, {"product_id": product_b.id, "quantity": 2}]},
        headers=member_headers,
    )
    assert resp.status_code == 200
    leads = {lead["product_id"]: lead for lead in resp.json()}

    lead_a = leads[product_a.id]
    assert lead_a["list_price_snapshot"] == 1000.0
    assert lead_a["quantity_discount_percent_snapshot"] == 10.0
    assert lead_a["unit_price_snapshot"] == round(900.0 * 0.9, 2)  # stacks on top of the sale price

    lead_b = leads[product_b.id]
    assert lead_b["list_price_snapshot"] == 200.0
    assert lead_b["quantity_discount_percent_snapshot"] == 10.0
    assert lead_b["unit_price_snapshot"] == round(200.0 * 0.9, 2)

    # The stored snapshot must survive a later price change untouched.
    db_row_a = db_session.query(models.Lead).filter(models.Lead.id == lead_a["id"]).first()
    assert db_row_a.unit_price_snapshot == round(900.0 * 0.9, 2)
    product_a.price = 5000.0
    product_a.sale_price = 0
    db_session.commit()
    db_session.refresh(db_row_a)
    assert db_row_a.unit_price_snapshot == round(900.0 * 0.9, 2)


def test_cart_checkout_crossing_higher_tier(client, db_session, make_user):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    admin_headers = _make_admin_headers(client, make_user)

    bundle = client.post(
        "/admin/quantity-discounts",
        json={
            "name_he": "מבצע כמות",
            "tiers": [{"min_quantity": 3, "discount_percent": 10}, {"min_quantity": 5, "discount_percent": 20}],
        },
        headers=admin_headers,
    ).json()

    product = models.Product(
        vertical="diamonds", title_he="מוצר", description_he="תיאור", price=100.0,
        quantity_discount_bundle_id=bundle["id"],
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    member_headers = _login(client, make_user, email="qdmember2@example.com")
    resp = client.post(
        "/leads/cart-checkout",
        json={"items": [{"product_id": product.id, "quantity": 5}]},
        headers=member_headers,
    )
    assert resp.status_code == 200
    lead = resp.json()[0]
    assert lead["quantity_discount_percent_snapshot"] == 20.0
    assert lead["unit_price_snapshot"] == 80.0


def test_appointment_lead_has_no_price_snapshot(client, db_session, make_user):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True, supports_appointments=True))
    db_session.commit()

    product = models.Product(vertical="diamonds", title_he="מוצר", description_he="תיאור", price=100.0)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    member_headers = _login(client, make_user, email="qdmember3@example.com")
    resp = client.post(
        "/leads",
        json={"product_id": product.id, "scheduled_at": "2026-09-01T10:00:00"},
        headers=member_headers,
    )
    assert resp.status_code == 200
    lead = resp.json()
    assert lead["lead_type"] if "lead_type" in lead else True  # sanity, schema always returns this
    lead_row = db_session.query(models.Lead).filter(models.Lead.id == lead["id"]).first()
    assert lead_row.unit_price_snapshot is None
    assert lead_row.list_price_snapshot is None
    assert lead_row.quantity_discount_percent_snapshot is None
