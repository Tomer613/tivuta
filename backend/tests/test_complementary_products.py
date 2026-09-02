from app import models


def _login(client, email, password="testpass123"):
    resp = client.post("/auth/login", data={"username": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _make_product(db_session, vertical, title="מוצר בדיקה", price=100.0, is_active=True):
    product = models.Product(vertical=vertical, title_he=title, description_he="תיאור", price=price, is_active=is_active)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def _checkout(client, headers, product_ids):
    resp = client.post(
        "/leads/cart-checkout",
        json={"items": [{"product_id": pid, "quantity": 1} for pid in product_ids]},
        headers=headers,
    )
    assert resp.status_code == 200
    return resp.json()


def test_complementary_products_ranked_by_co_purchase_frequency(client, db_session, make_user):
    db_session.add(models.Vertical(slug="kiddush", label_he="קידושים", is_active=True))
    db_session.commit()
    wine = _make_product(db_session, "kiddush", title="יין")
    challah = _make_product(db_session, "kiddush", title="חלה")
    napkins = _make_product(db_session, "kiddush", title="מפיות")

    # 3 different customers buy wine+challah together; only 1 buys wine+napkins.
    for i in range(3):
        make_user(email=f"comp{i}@example.com", password="testpass123")
        headers = _login(client, f"comp{i}@example.com")
        _checkout(client, headers, [wine.id, challah.id])
    make_user(email="comp_extra@example.com", password="testpass123")
    headers = _login(client, "comp_extra@example.com")
    _checkout(client, headers, [wine.id, napkins.id])

    resp = client.get(f"/products/{wine.id}/complementary")
    assert resp.status_code == 200
    ids = [p["id"] for p in resp.json()]
    assert ids == [challah.id, napkins.id]  # challah ranked first — bought together more often
    assert wine.id not in ids


def test_complementary_products_restricted_to_same_vertical(client, db_session, make_user):
    db_session.add(models.Vertical(slug="kiddush", label_he="קידושים", is_active=True))
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    wine = _make_product(db_session, "kiddush", title="יין")
    ring = _make_product(db_session, "diamonds", title="טבעת")

    make_user(email="crossvertbuyer@example.com", password="testpass123")
    headers = _login(client, "crossvertbuyer@example.com")
    _checkout(client, headers, [wine.id, ring.id])

    resp = client.get(f"/products/{wine.id}/complementary")
    assert resp.json() == []  # the only co-purchased product is from a different vertical


def test_complementary_products_excludes_cancelled_orders(client, db_session, make_user):
    db_session.add(models.Vertical(slug="kiddush", label_he="קידושים", is_active=True))
    db_session.commit()
    wine = _make_product(db_session, "kiddush", title="יין")
    challah = _make_product(db_session, "kiddush", title="חלה")

    make_user(email="cancelledbuyer@example.com", password="testpass123")
    headers = _login(client, "cancelledbuyer@example.com")
    leads = _checkout(client, headers, [wine.id, challah.id])
    order_id = leads[0]["customer_order_id"]
    order = db_session.query(models.CustomerOrder).filter(models.CustomerOrder.id == order_id).first()
    order.status = "cancelled"
    db_session.commit()

    resp = client.get(f"/products/{wine.id}/complementary")
    assert resp.json() == []


def test_complementary_products_excludes_inactive_products(client, db_session, make_user):
    db_session.add(models.Vertical(slug="kiddush", label_he="קידושים", is_active=True))
    db_session.commit()
    wine = _make_product(db_session, "kiddush", title="יין")
    challah = _make_product(db_session, "kiddush", title="חלה")

    make_user(email="inactivecompbuyer@example.com", password="testpass123")
    headers = _login(client, "inactivecompbuyer@example.com")
    _checkout(client, headers, [wine.id, challah.id])
    challah.is_active = False
    db_session.commit()

    resp = client.get(f"/products/{wine.id}/complementary")
    assert resp.json() == []


def test_complementary_products_same_vertical_match_survives_cross_vertical_ranking(client, db_session, make_user):
    """Regression: same-vertical restriction must apply BEFORE ranking/limiting, not just as a
    filter on the final result — otherwise a product whose most frequent co-purchases happen to be
    in other verticals can crowd a real, lower-frequency same-vertical match out of the ranking
    entirely, well before it would ever reach the final vertical filter."""
    db_session.add(models.Vertical(slug="kiddush", label_he="קידושים", is_active=True))
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    wine = _make_product(db_session, "kiddush", title="יין")
    challah = _make_product(db_session, "kiddush", title="חלה")  # same vertical, bought together once
    ring = _make_product(db_session, "diamonds", title="טבעת")  # different vertical, bought together twice

    make_user(email="samevert1@example.com", password="testpass123")
    _checkout(client, _login(client, "samevert1@example.com"), [wine.id, challah.id])
    for i in range(2):
        make_user(email=f"crossvert{i}@example.com", password="testpass123")
        _checkout(client, _login(client, f"crossvert{i}@example.com"), [wine.id, ring.id])

    # limit=1 makes the pre-fix bug deterministic: ranking across all verticals would put the
    # diamonds ring (2 co-purchases) ahead of challah (1) for the single available slot, so the
    # real same-vertical match would never surface at all once filtered afterward.
    resp = client.get(f"/products/{wine.id}/complementary?limit=1")
    assert resp.status_code == 200
    assert [p["id"] for p in resp.json()] == [challah.id]


def test_complementary_products_404_for_unknown_product(client, db_session):
    resp = client.get("/products/999999/complementary")
    assert resp.status_code == 404


def test_complementary_products_empty_with_no_co_purchases(client, db_session):
    db_session.add(models.Vertical(slug="kiddush", label_he="קידושים", is_active=True))
    db_session.commit()
    lonely = _make_product(db_session, "kiddush", title="בודד")
    resp = client.get(f"/products/{lonely.id}/complementary")
    assert resp.status_code == 200
    assert resp.json() == []
