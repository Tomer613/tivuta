from app import models


def test_cart_checkout_preserves_per_item_quantity(client, db_session, make_user):
    """Regression test for a real, previously-shipped bug (documented in CLAUDE.md): the
    cart-checkout endpoint's per-product loop once closed over a stale variable from an
    earlier merge loop, so every line item silently got tagged with the *last* cart item's
    quantity instead of its own. This pins that down so it can't come back unnoticed."""
    make_user(email="cartuser@example.com", password="testpass123")

    products = []
    for i in range(3):
        product = models.Product(
            vertical="diamonds",
            title_he=f"מוצר {i}",
            description_he="תיאור",
            price=100.0 * (i + 1),
        )
        db_session.add(product)
        products.append(product)
    db_session.commit()
    for product in products:
        db_session.refresh(product)

    login = client.post("/auth/login", data={"username": "cartuser@example.com", "password": "testpass123"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    quantities = [1, 3, 7]
    resp = client.post(
        "/leads/cart-checkout",
        json={"items": [{"product_id": p.id, "quantity": q} for p, q in zip(products, quantities)]},
        headers=headers,
    )
    assert resp.status_code == 200
    leads = resp.json()
    assert len(leads) == 3

    quantity_by_product = {lead["product_id"]: lead["quantity"] for lead in leads}
    for product, expected_quantity in zip(products, quantities):
        assert quantity_by_product[product.id] == expected_quantity

    # Every line item should share one CustomerOrder (one checkout, one order).
    order_ids = {lead["customer_order_id"] for lead in leads}
    assert len(order_ids) == 1
