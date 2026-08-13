from app import models


def _make_admin_headers(client, make_user, email="catadmin@example.com"):
    make_user(email=email, password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": email, "password": "adminpass123"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_category_and_assign_to_product(client, db_session, make_user):
    """Core flow: admin creates a category scoped to a world, assigns it to a product, and the
    public product listing returns the nested category — mirrors how vendor assignment works."""
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    headers = _make_admin_headers(client, make_user)

    resp = client.post(
        "/admin/product-categories",
        json={"vertical": "diamonds", "label_he": "טבעות", "label_en": "Rings"},
        headers=headers,
    )
    assert resp.status_code == 200
    category = resp.json()
    assert category["vertical"] == "diamonds"

    product = models.Product(vertical="diamonds", title_he="טבעת", description_he="תיאור", price=1000.0)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    update_resp = client.put(
        f"/admin/products/{product.id}",
        json={"category_id": category["id"]},
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["category"]["id"] == category["id"]

    list_resp = client.get("/products", params={"vertical": "diamonds"})
    assert list_resp.status_code == 200
    matched = next(p for p in list_resp.json() if p["id"] == product.id)
    assert matched["category"]["label_he"] == "טבעות"


def test_category_vertical_mismatch_rejected_on_product_update(client, db_session, make_user):
    db_session.add_all(
        [
            models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True),
            models.Vertical(slug="cars", label_he="רכב", is_active=True),
        ]
    )
    db_session.commit()
    headers = _make_admin_headers(client, make_user)

    category = client.post(
        "/admin/product-categories",
        json={"vertical": "diamonds", "label_he": "טבעות"},
        headers=headers,
    ).json()

    product = models.Product(vertical="cars", title_he="רכב", description_he="תיאור")
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    resp = client.put(
        f"/admin/products/{product.id}",
        json={"category_id": category["id"]},
        headers=headers,
    )
    assert resp.status_code == 400


def test_bulk_assign_category_rejects_mixed_vertical_selection(client, db_session, make_user):
    db_session.add_all(
        [
            models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True),
            models.Vertical(slug="cars", label_he="רכב", is_active=True),
        ]
    )
    db_session.commit()
    headers = _make_admin_headers(client, make_user)

    category = client.post(
        "/admin/product-categories",
        json={"vertical": "diamonds", "label_he": "טבעות"},
        headers=headers,
    ).json()

    diamond_product = models.Product(vertical="diamonds", title_he="טבעת", description_he="תיאור")
    car_product = models.Product(vertical="cars", title_he="רכב", description_he="תיאור")
    db_session.add_all([diamond_product, car_product])
    db_session.commit()
    db_session.refresh(diamond_product)
    db_session.refresh(car_product)

    resp = client.patch(
        "/admin/products/bulk-category",
        json={"product_ids": [diamond_product.id, car_product.id], "category_id": category["id"]},
        headers=headers,
    )
    assert resp.status_code == 400


def test_bulk_assign_category_updates_all_selected_products(client, db_session, make_user):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    headers = _make_admin_headers(client, make_user)

    category = client.post(
        "/admin/product-categories",
        json={"vertical": "diamonds", "label_he": "טבעות"},
        headers=headers,
    ).json()

    products = []
    for i in range(3):
        p = models.Product(vertical="diamonds", title_he=f"מוצר {i}", description_he="תיאור")
        db_session.add(p)
        products.append(p)
    db_session.commit()
    for p in products:
        db_session.refresh(p)

    resp = client.patch(
        "/admin/products/bulk-category",
        json={"product_ids": [p.id for p in products], "category_id": category["id"]},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["updated"] == 3

    for p in products:
        db_session.refresh(p)
        assert p.category_id == category["id"]

    # Bulk-clear (category_id: null) removes the assignment again.
    clear_resp = client.patch(
        "/admin/products/bulk-category",
        json={"product_ids": [p.id for p in products], "category_id": None},
        headers=headers,
    )
    assert clear_resp.status_code == 200
    for p in products:
        db_session.refresh(p)
        assert p.category_id is None


def test_deactivated_category_hidden_from_public_list_but_product_keeps_id(client, db_session, make_user):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    headers = _make_admin_headers(client, make_user)

    category = client.post(
        "/admin/product-categories",
        json={"vertical": "diamonds", "label_he": "טבעות"},
        headers=headers,
    ).json()

    product = models.Product(vertical="diamonds", title_he="טבעת", description_he="תיאור", category_id=category["id"])
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    del_resp = client.delete(f"/admin/product-categories/{category['id']}", headers=headers)
    assert del_resp.status_code == 200

    public_list = client.get("/product-categories", params={"vertical": "diamonds"}).json()
    assert all(c["id"] != category["id"] for c in public_list)

    db_session.refresh(product)
    assert product.category_id == category["id"]
