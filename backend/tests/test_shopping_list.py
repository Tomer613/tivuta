from app import models


def _login(client, email, password="testpass123"):
    resp = client.post("/auth/login", data={"username": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _make_vertical(db_session, slug, enables_shopping_list=True):
    vertical = models.Vertical(slug=slug, label_he=slug, enables_shopping_list=enables_shopping_list)
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


def test_shopping_list_auto_seeds_from_purchase_history_on_first_visit(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    product = _make_product(db_session, "kiddush", title="יין קידוש")
    make_user(email="seedme@example.com", password="testpass123")
    headers = _login(client, "seedme@example.com")

    client.post("/leads/cart-checkout", json={"items": [{"product_id": product.id, "quantity": 4}]}, headers=headers)

    resp = client.get("/shopping-list?vertical=kiddush", headers=headers)
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["product_id"] == product.id
    assert items[0]["quantity"] == 4  # seeded from the last purchased quantity


def test_shopping_list_empty_with_no_purchase_history(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    make_user(email="noseeds@example.com", password="testpass123")
    headers = _login(client, "noseeds@example.com")

    resp = client.get("/shopping-list?vertical=kiddush", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_shopping_list_add_update_and_delete_item(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    product = _make_product(db_session, "kiddush")
    make_user(email="editlist@example.com", password="testpass123")
    headers = _login(client, "editlist@example.com")

    add_resp = client.post("/shopping-list/items", json={"product_id": product.id, "quantity": 2}, headers=headers)
    assert add_resp.status_code == 200
    item_id = add_resp.json()["id"]
    assert add_resp.json()["quantity"] == 2

    # Adding the same product again is an upsert (updates quantity), not a duplicate row.
    add_again = client.post("/shopping-list/items", json={"product_id": product.id, "quantity": 9}, headers=headers)
    assert add_again.json()["id"] == item_id
    assert add_again.json()["quantity"] == 9

    update_resp = client.patch(f"/shopping-list/items/{item_id}", json={"quantity": 3}, headers=headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["quantity"] == 3

    list_resp = client.get("/shopping-list?vertical=kiddush", headers=headers).json()
    assert len(list_resp) == 1

    delete_resp = client.delete(f"/shopping-list/items/{item_id}", headers=headers)
    assert delete_resp.status_code == 204

    empty_resp = client.get("/shopping-list?vertical=kiddush", headers=headers).json()
    assert empty_resp == []


def test_shopping_list_refresh_adds_missing_without_touching_existing_edits(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    product_a = _make_product(db_session, "kiddush", title="יין")
    product_b = _make_product(db_session, "kiddush", title="חלה")
    make_user(email="refreshme@example.com", password="testpass123")
    headers = _login(client, "refreshme@example.com")

    client.post("/leads/cart-checkout", json={"items": [{"product_id": product_a.id, "quantity": 2}]}, headers=headers)
    seeded = client.get("/shopping-list?vertical=kiddush", headers=headers).json()
    item_id = seeded[0]["id"]

    # The user edits the auto-seeded quantity themselves before ever refreshing.
    client.patch(f"/shopping-list/items/{item_id}", json={"quantity": 10}, headers=headers)

    # A second, later purchase of a different product — not yet reflected on the saved list.
    client.post("/leads/cart-checkout", json={"items": [{"product_id": product_b.id, "quantity": 1}]}, headers=headers)

    refreshed = client.post("/shopping-list/refresh?vertical=kiddush", headers=headers).json()
    by_product = {i["product_id"]: i for i in refreshed}
    assert len(refreshed) == 2
    assert by_product[product_a.id]["quantity"] == 10  # user's own edit was not overwritten
    assert product_b.id in by_product


def test_shopping_list_scoped_by_vertical(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    _make_vertical(db_session, "diamonds")
    kiddush_product = _make_product(db_session, "kiddush")
    diamond_product = _make_product(db_session, "diamonds")
    make_user(email="scopedlist@example.com", password="testpass123")
    headers = _login(client, "scopedlist@example.com")

    client.post("/shopping-list/items", json={"product_id": kiddush_product.id, "quantity": 1}, headers=headers)
    client.post("/shopping-list/items", json={"product_id": diamond_product.id, "quantity": 1}, headers=headers)

    kiddush_list = client.get("/shopping-list?vertical=kiddush", headers=headers).json()
    diamonds_list = client.get("/shopping-list?vertical=diamonds", headers=headers).json()
    assert [i["product_id"] for i in kiddush_list] == [kiddush_product.id]
    assert [i["product_id"] for i in diamonds_list] == [diamond_product.id]


def test_shopping_list_blocked_when_vertical_does_not_enable_it(client, db_session, make_user):
    _make_vertical(db_session, "diamonds", enables_shopping_list=False)
    product = _make_product(db_session, "diamonds")
    make_user(email="notenabled@example.com", password="testpass123")
    headers = _login(client, "notenabled@example.com")

    get_resp = client.get("/shopping-list?vertical=diamonds", headers=headers)
    assert get_resp.status_code == 400

    refresh_resp = client.post("/shopping-list/refresh?vertical=diamonds", headers=headers)
    assert refresh_resp.status_code == 400

    add_resp = client.post("/shopping-list/items", json={"product_id": product.id, "quantity": 1}, headers=headers)
    assert add_resp.status_code == 400


def test_shopping_list_404s_for_unknown_vertical(client, db_session, make_user):
    make_user(email="noworld@example.com", password="testpass123")
    headers = _login(client, "noworld@example.com")

    resp = client.get("/shopping-list?vertical=nonexistent", headers=headers)
    assert resp.status_code == 404


def test_shopping_list_items_are_private_per_user(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    product = _make_product(db_session, "kiddush")
    make_user(email="listowner@example.com", password="testpass123")
    make_user(email="otheruser@example.com", password="testpass123")
    owner_headers = _login(client, "listowner@example.com")
    other_headers = _login(client, "otheruser@example.com")

    add_resp = client.post("/shopping-list/items", json={"product_id": product.id, "quantity": 1}, headers=owner_headers)
    item_id = add_resp.json()["id"]

    # Another user cannot see, update, or delete someone else's shopping list item.
    assert client.get("/shopping-list?vertical=kiddush", headers=other_headers).json() == []
    assert client.patch(f"/shopping-list/items/{item_id}", json={"quantity": 9}, headers=other_headers).status_code == 404
    assert client.delete(f"/shopping-list/items/{item_id}", headers=other_headers).status_code == 204  # no-op, nothing owned
    # The owner's item survives the other user's no-op delete attempt.
    assert len(client.get("/shopping-list?vertical=kiddush", headers=owner_headers).json()) == 1
