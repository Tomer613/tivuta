from app import models


def _make_admin_headers(client, make_user, email="saleadmin@example.com"):
    make_user(email=email, password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": email, "password": "adminpass123"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_product_with_valid_sale_price(client, db_session, make_user):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    headers = _make_admin_headers(client, make_user)

    resp = client.post(
        "/admin/products",
        json={
            "vertical": "diamonds",
            "title_he": "טבעת",
            "description_he": "תיאור",
            "price": 1000,
            "sale_price": 800,
        },
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["sale_price"] == 800

    list_resp = client.get("/products", params={"vertical": "diamonds"})
    product = next(p for p in list_resp.json() if p["title_he"] == "טבעת")
    assert product["sale_price"] == 800
    assert product["price"] == 1000


def test_create_rejects_sale_price_not_lower_than_price(client, db_session, make_user):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    headers = _make_admin_headers(client, make_user)

    resp = client.post(
        "/admin/products",
        json={"vertical": "diamonds", "title_he": "טבעת", "description_he": "תיאור", "price": 1000, "sale_price": 1000},
        headers=headers,
    )
    assert resp.status_code == 400


def test_create_rejects_sale_price_without_a_base_price(client, db_session, make_user):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    headers = _make_admin_headers(client, make_user)

    resp = client.post(
        "/admin/products",
        json={"vertical": "diamonds", "title_he": "טבעת", "description_he": "תיאור", "sale_price": 500},
        headers=headers,
    )
    assert resp.status_code == 400


def test_zero_sale_price_is_a_no_op(client, db_session, make_user):
    """sale_price=0 is the explicit 'no sale' sentinel — never validated against price."""
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    headers = _make_admin_headers(client, make_user)

    resp = client.post(
        "/admin/products",
        json={"vertical": "diamonds", "title_he": "טבעת", "description_he": "תיאור", "sale_price": 0},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["sale_price"] == 0


def test_update_validates_effective_state_not_just_payload(client, db_session, make_user):
    """A PUT that only sends sale_price must still be checked against the product's *existing*
    price, and a PUT that only lowers price must still be checked against an existing sale_price
    that would now be >= the new price."""
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    headers = _make_admin_headers(client, make_user)

    product = models.Product(vertical="diamonds", title_he="טבעת", description_he="תיאור", price=1000.0)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    # Sending only sale_price >= existing price must be rejected.
    resp = client.put(f"/admin/products/{product.id}", json={"sale_price": 1000}, headers=headers)
    assert resp.status_code == 400

    # A valid sale_price-only update succeeds.
    resp2 = client.put(f"/admin/products/{product.id}", json={"sale_price": 700}, headers=headers)
    assert resp2.status_code == 200
    assert resp2.json()["sale_price"] == 700

    # Now lowering price below the existing sale_price (without touching sale_price) must reject.
    resp3 = client.put(f"/admin/products/{product.id}", json={"price": 600}, headers=headers)
    assert resp3.status_code == 400
