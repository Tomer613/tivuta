from app import models


def _login(client, email, password="testpass123"):
    resp = client.post("/auth/login", data={"username": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _make_vertical(db_session, slug, enables_shopping_list=True, requires_gabbai=False):
    vertical = models.Vertical(slug=slug, label_he=slug, enables_shopping_list=enables_shopping_list, requires_gabbai=requires_gabbai)
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


def _solo_list(client, headers, vertical):
    """GET /shopping-lists auto-creates+seeds the user's first list for a vertical if they have
    none yet — this fetches (and asserts) exactly that single list, for tests that don't care
    about multi-list behavior specifically."""
    lists = client.get(f"/shopping-lists?vertical={vertical}", headers=headers).json()
    assert len(lists) == 1
    return lists[0]


def _list_items(client, headers, list_id):
    return client.get(f"/shopping-lists/{list_id}", headers=headers).json()["items"]


def test_shopping_list_auto_seeds_from_purchase_history_on_first_visit(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    product = _make_product(db_session, "kiddush", title="יין קידוש")
    make_user(email="seedme@example.com", password="testpass123")
    headers = _login(client, "seedme@example.com")

    client.post("/leads/cart-checkout", json={"items": [{"product_id": product.id, "quantity": 4}]}, headers=headers)

    list_id = _solo_list(client, headers, "kiddush")["id"]
    items = _list_items(client, headers, list_id)
    assert len(items) == 1
    assert items[0]["product_id"] == product.id
    assert items[0]["quantity"] == 4  # seeded from the last purchased quantity


def test_shopping_list_empty_with_no_purchase_history(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    make_user(email="noseeds@example.com", password="testpass123")
    headers = _login(client, "noseeds@example.com")

    solo = _solo_list(client, headers, "kiddush")
    assert solo["item_count"] == 0


def test_shopping_list_add_update_and_delete_item(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    product = _make_product(db_session, "kiddush")
    make_user(email="editlist@example.com", password="testpass123")
    headers = _login(client, "editlist@example.com")
    list_id = _solo_list(client, headers, "kiddush")["id"]

    add_resp = client.post(f"/shopping-lists/{list_id}/items", json={"product_id": product.id, "quantity": 2}, headers=headers)
    assert add_resp.status_code == 200
    item_id = add_resp.json()["id"]
    assert add_resp.json()["quantity"] == 2

    # Adding the same product again is an upsert (updates quantity), not a duplicate row.
    add_again = client.post(f"/shopping-lists/{list_id}/items", json={"product_id": product.id, "quantity": 9}, headers=headers)
    assert add_again.json()["id"] == item_id
    assert add_again.json()["quantity"] == 9

    update_resp = client.patch(f"/shopping-list-items/{item_id}", json={"quantity": 3}, headers=headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["quantity"] == 3

    assert len(_list_items(client, headers, list_id)) == 1

    delete_resp = client.delete(f"/shopping-list-items/{item_id}", headers=headers)
    assert delete_resp.status_code == 204

    assert _list_items(client, headers, list_id) == []


def test_shopping_list_ids_endpoint_does_not_auto_seed(client, db_session, make_user):
    """GET /shopping-list/ids is a passive, frequent read (called on every listing-page load to
    drive "on my list" badges) — unlike GET /shopping-lists, it must never auto-seed from purchase
    history, or just browsing a world would silently start populating a list the user never
    opened."""
    _make_vertical(db_session, "kiddush")
    product = _make_product(db_session, "kiddush")
    make_user(email="idsnoseed@example.com", password="testpass123")
    headers = _login(client, "idsnoseed@example.com")

    client.post("/leads/cart-checkout", json={"items": [{"product_id": product.id, "quantity": 1}]}, headers=headers)

    ids_resp = client.get("/shopping-list/ids?vertical=kiddush", headers=headers)
    assert ids_resp.status_code == 200
    assert ids_resp.json() == []  # purchase history exists, but /ids never triggers auto-seed

    # Create a list explicitly (bypassing GET /shopping-lists' own auto-seed-on-first-fetch) and
    # add an item — only an explicit add should make a product show up in /ids.
    list_id = client.post("/shopping-lists?vertical=kiddush", json={"name": "הרשימה שלי"}, headers=headers).json()["id"]
    client.post(f"/shopping-lists/{list_id}/items", json={"product_id": product.id, "quantity": 1}, headers=headers)
    assert client.get("/shopping-list/ids?vertical=kiddush", headers=headers).json() == [product.id]


def test_shopping_list_replace_overwrites_existing_list(client, db_session, make_user):
    """PUT /shopping-lists/{id} is the cart page's "save current cart as my shopping list" action
    — wholesale replace, unlike every other endpoint which only ever touches one row."""
    _make_vertical(db_session, "kiddush")
    old_product = _make_product(db_session, "kiddush", title="ישן")
    new_a = _make_product(db_session, "kiddush", title="חדש א")
    new_b = _make_product(db_session, "kiddush", title="חדש ב")
    make_user(email="replacelist@example.com", password="testpass123")
    headers = _login(client, "replacelist@example.com")
    list_id = _solo_list(client, headers, "kiddush")["id"]

    client.post(f"/shopping-lists/{list_id}/items", json={"product_id": old_product.id, "quantity": 3}, headers=headers)

    resp = client.put(
        f"/shopping-lists/{list_id}",
        json={"items": [{"product_id": new_a.id, "quantity": 2}, {"product_id": new_b.id, "quantity": 5}]},
        headers=headers,
    )
    assert resp.status_code == 200
    items = resp.json()["items"]
    by_product = {i["product_id"]: i["quantity"] for i in items}
    assert by_product == {new_a.id: 2, new_b.id: 5}
    assert old_product.id not in by_product  # the old item was discarded, not merged


def test_shopping_list_replace_with_empty_items_clears_the_list(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    product = _make_product(db_session, "kiddush")
    make_user(email="clearlist@example.com", password="testpass123")
    headers = _login(client, "clearlist@example.com")
    list_id = _solo_list(client, headers, "kiddush")["id"]

    client.post(f"/shopping-lists/{list_id}/items", json={"product_id": product.id, "quantity": 1}, headers=headers)
    resp = client.put(f"/shopping-lists/{list_id}", json={"items": []}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["items"] == []


def test_shopping_list_replace_rejects_product_from_another_vertical(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    _make_vertical(db_session, "diamonds")
    diamond_product = _make_product(db_session, "diamonds")
    make_user(email="crossreplace@example.com", password="testpass123")
    headers = _login(client, "crossreplace@example.com")
    list_id = _solo_list(client, headers, "kiddush")["id"]

    resp = client.put(
        f"/shopping-lists/{list_id}",
        json={"items": [{"product_id": diamond_product.id, "quantity": 1}]},
        headers=headers,
    )
    assert resp.status_code == 400
    # Nothing was written — the reject-the-whole-request behavior leaves the list untouched.
    assert _list_items(client, headers, list_id) == []


def test_shopping_list_replace_only_touches_the_target_list(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    _make_vertical(db_session, "diamonds")
    kiddush_product = _make_product(db_session, "kiddush")
    diamond_product = _make_product(db_session, "diamonds")
    make_user(email="isolatedreplace@example.com", password="testpass123")
    headers = _login(client, "isolatedreplace@example.com")
    kiddush_list_id = _solo_list(client, headers, "kiddush")["id"]
    diamonds_list_id = _solo_list(client, headers, "diamonds")["id"]

    client.post(f"/shopping-lists/{diamonds_list_id}/items", json={"product_id": diamond_product.id, "quantity": 1}, headers=headers)
    client.put(f"/shopping-lists/{kiddush_list_id}", json={"items": [{"product_id": kiddush_product.id, "quantity": 1}]}, headers=headers)

    # Replacing the kiddush list must not have touched the pre-existing, separate diamonds list.
    assert [i["product_id"] for i in _list_items(client, headers, diamonds_list_id)] == [diamond_product.id]


def test_shopping_list_refresh_adds_missing_without_touching_existing_edits(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    product_a = _make_product(db_session, "kiddush", title="יין")
    product_b = _make_product(db_session, "kiddush", title="חלה")
    make_user(email="refreshme@example.com", password="testpass123")
    headers = _login(client, "refreshme@example.com")

    client.post("/leads/cart-checkout", json={"items": [{"product_id": product_a.id, "quantity": 2}]}, headers=headers)
    list_id = _solo_list(client, headers, "kiddush")["id"]
    seeded = _list_items(client, headers, list_id)
    item_id = seeded[0]["id"]

    # The user edits the auto-seeded quantity themselves before ever refreshing.
    client.patch(f"/shopping-list-items/{item_id}", json={"quantity": 10}, headers=headers)

    # A second, later purchase of a different product — not yet reflected on the saved list.
    client.post("/leads/cart-checkout", json={"items": [{"product_id": product_b.id, "quantity": 1}]}, headers=headers)

    refreshed = client.post(f"/shopping-lists/{list_id}/refresh", headers=headers).json()["items"]
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
    kiddush_list_id = _solo_list(client, headers, "kiddush")["id"]
    diamonds_list_id = _solo_list(client, headers, "diamonds")["id"]

    client.post(f"/shopping-lists/{kiddush_list_id}/items", json={"product_id": kiddush_product.id, "quantity": 1}, headers=headers)
    client.post(f"/shopping-lists/{diamonds_list_id}/items", json={"product_id": diamond_product.id, "quantity": 1}, headers=headers)

    assert [i["product_id"] for i in _list_items(client, headers, kiddush_list_id)] == [kiddush_product.id]
    assert [i["product_id"] for i in _list_items(client, headers, diamonds_list_id)] == [diamond_product.id]


def test_shopping_list_item_includes_active_quantity_discount_bundle(client, db_session, make_user):
    """ShoppingListItemRead must carry the product's live bundle info — otherwise the shopping
    list page's "add to cart" and running-total both silently miss an active discount."""
    _make_vertical(db_session, "kiddush")
    product = _make_product(db_session, "kiddush")
    bundle = models.QuantityDiscountBundle(name_he="מבצע", is_active=True)
    db_session.add(bundle)
    db_session.commit()
    db_session.refresh(bundle)
    db_session.add(models.QuantityDiscountTier(bundle_id=bundle.id, min_quantity=2, discount_percent=20))
    product.quantity_discount_bundle_id = bundle.id
    db_session.commit()

    make_user(email="listbundle@example.com", password="testpass123")
    headers = _login(client, "listbundle@example.com")
    list_id = _solo_list(client, headers, "kiddush")["id"]
    client.post(f"/shopping-lists/{list_id}/items", json={"product_id": product.id, "quantity": 2}, headers=headers)

    items = _list_items(client, headers, list_id)
    assert items[0]["quantity_discount_bundle_id"] == bundle.id
    assert items[0]["quantity_discount_tiers"] == [{"min_quantity": 2, "discount_percent": 20}]


def test_shopping_list_blocked_when_vertical_does_not_enable_it(client, db_session, make_user):
    _make_vertical(db_session, "diamonds", enables_shopping_list=False)
    make_user(email="notenabled@example.com", password="testpass123")
    headers = _login(client, "notenabled@example.com")

    get_resp = client.get("/shopping-lists?vertical=diamonds", headers=headers)
    assert get_resp.status_code == 400

    create_resp = client.post("/shopping-lists?vertical=diamonds", json={"name": "x"}, headers=headers)
    assert create_resp.status_code == 400


def test_shopping_list_404s_for_unknown_vertical(client, db_session, make_user):
    make_user(email="noworld@example.com", password="testpass123")
    headers = _login(client, "noworld@example.com")

    resp = client.get("/shopping-lists?vertical=nonexistent", headers=headers)
    assert resp.status_code == 404


def test_shopping_list_items_are_private_per_user(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    product = _make_product(db_session, "kiddush")
    make_user(email="listowner@example.com", password="testpass123")
    make_user(email="otheruser@example.com", password="testpass123")
    owner_headers = _login(client, "listowner@example.com")
    other_headers = _login(client, "otheruser@example.com")
    list_id = _solo_list(client, owner_headers, "kiddush")["id"]

    add_resp = client.post(f"/shopping-lists/{list_id}/items", json={"product_id": product.id, "quantity": 1}, headers=owner_headers)
    item_id = add_resp.json()["id"]

    # Another user cannot see, update, or delete someone else's shopping list item.
    assert client.get(f"/shopping-lists/{list_id}", headers=other_headers).status_code == 404
    assert client.patch(f"/shopping-list-items/{item_id}", json={"quantity": 9}, headers=other_headers).status_code == 404
    assert client.delete(f"/shopping-list-items/{item_id}", headers=other_headers).status_code == 204  # no-op, nothing owned
    # The owner's item survives the other user's no-op delete attempt.
    assert len(_list_items(client, owner_headers, list_id)) == 1


def test_creating_a_second_list_does_not_auto_seed(client, db_session, make_user):
    """Auto-seed-from-purchase-history only ever bootstraps a user's very FIRST list for a
    vertical — a deliberately separate list created afterward (e.g. a holiday variant) must start
    genuinely empty, never pre-filled with the regular weekly items."""
    _make_vertical(db_session, "kiddush")
    product = _make_product(db_session, "kiddush")
    make_user(email="secondlist@example.com", password="testpass123")
    headers = _login(client, "secondlist@example.com")

    client.post("/leads/cart-checkout", json={"items": [{"product_id": product.id, "quantity": 3}]}, headers=headers)
    first_list_id = _solo_list(client, headers, "kiddush")["id"]
    assert len(_list_items(client, headers, first_list_id)) == 1  # auto-seeded

    created = client.post("/shopping-lists?vertical=kiddush", json={"name": "רשימת חג"}, headers=headers)
    assert created.status_code == 200
    assert created.json()["item_count"] == 0
    assert _list_items(client, headers, created.json()["id"]) == []  # NOT seeded


def test_multiple_lists_for_the_same_vertical_are_independent(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    product_a = _make_product(db_session, "kiddush", title="א")
    product_b = _make_product(db_session, "kiddush", title="ב")
    make_user(email="twolists@example.com", password="testpass123")
    headers = _login(client, "twolists@example.com")

    list_a = client.post("/shopping-lists?vertical=kiddush", json={"name": "שבת"}, headers=headers).json()
    list_b = client.post("/shopping-lists?vertical=kiddush", json={"name": "חג"}, headers=headers).json()

    client.post(f"/shopping-lists/{list_a['id']}/items", json={"product_id": product_a.id, "quantity": 1}, headers=headers)
    client.post(f"/shopping-lists/{list_b['id']}/items", json={"product_id": product_b.id, "quantity": 1}, headers=headers)

    assert [i["product_id"] for i in _list_items(client, headers, list_a["id"])] == [product_a.id]
    assert [i["product_id"] for i in _list_items(client, headers, list_b["id"])] == [product_b.id]

    lists = client.get("/shopping-lists?vertical=kiddush", headers=headers).json()
    assert len(lists) == 2
    assert {l["name"] for l in lists} == {"שבת", "חג"}


def test_rename_list(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    make_user(email="renamer@example.com", password="testpass123")
    headers = _login(client, "renamer@example.com")
    list_id = _solo_list(client, headers, "kiddush")["id"]

    resp = client.patch(f"/shopping-lists/{list_id}", json={"name": "שם חדש"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "שם חדש"
    assert client.get(f"/shopping-lists/{list_id}", headers=headers).json()["name"] == "שם חדש"


def test_rename_list_rejects_blank_name(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    make_user(email="blankrename@example.com", password="testpass123")
    headers = _login(client, "blankrename@example.com")
    list_id = _solo_list(client, headers, "kiddush")["id"]

    resp = client.patch(f"/shopping-lists/{list_id}", json={"name": "   "}, headers=headers)
    assert resp.status_code == 400


def test_delete_list_removes_its_items_and_a_fresh_one_is_recreated_on_next_visit(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    product = _make_product(db_session, "kiddush")
    make_user(email="deleter@example.com", password="testpass123")
    headers = _login(client, "deleter@example.com")
    list_id = _solo_list(client, headers, "kiddush")["id"]
    client.post(f"/shopping-lists/{list_id}/items", json={"product_id": product.id, "quantity": 1}, headers=headers)

    resp = client.delete(f"/shopping-lists/{list_id}", headers=headers)
    assert resp.status_code == 204
    assert client.get(f"/shopping-lists/{list_id}", headers=headers).status_code == 404

    # The world isn't left permanently list-less — a fresh GET auto-creates a new, empty one again.
    lists_after = client.get("/shopping-lists?vertical=kiddush", headers=headers).json()
    assert len(lists_after) == 1
    assert lists_after[0]["item_count"] == 0


def test_ids_endpoint_unions_across_multiple_lists(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    product_a = _make_product(db_session, "kiddush", title="א")
    product_b = _make_product(db_session, "kiddush", title="ב")
    make_user(email="unionids@example.com", password="testpass123")
    headers = _login(client, "unionids@example.com")

    list_a = client.post("/shopping-lists?vertical=kiddush", json={"name": "שבת"}, headers=headers).json()
    list_b = client.post("/shopping-lists?vertical=kiddush", json={"name": "חג"}, headers=headers).json()
    client.post(f"/shopping-lists/{list_a['id']}/items", json={"product_id": product_a.id, "quantity": 1}, headers=headers)
    client.post(f"/shopping-lists/{list_b['id']}/items", json={"product_id": product_b.id, "quantity": 1}, headers=headers)

    ids = client.get("/shopping-list/ids?vertical=kiddush", headers=headers).json()
    assert set(ids) == {product_a.id, product_b.id}


def test_list_ownership_enforced_across_all_list_level_operations(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    product = _make_product(db_session, "kiddush")
    make_user(email="listowner2@example.com", password="testpass123")
    make_user(email="otheruser2@example.com", password="testpass123")
    owner_headers = _login(client, "listowner2@example.com")
    other_headers = _login(client, "otheruser2@example.com")
    list_id = _solo_list(client, owner_headers, "kiddush")["id"]

    assert client.get(f"/shopping-lists/{list_id}", headers=other_headers).status_code == 404
    assert client.patch(f"/shopping-lists/{list_id}", json={"name": "hijack"}, headers=other_headers).status_code == 404
    assert client.post(f"/shopping-lists/{list_id}/items", json={"product_id": product.id, "quantity": 1}, headers=other_headers).status_code == 404
    assert client.post(f"/shopping-lists/{list_id}/refresh", headers=other_headers).status_code == 404
    assert client.put(f"/shopping-lists/{list_id}", json={"items": []}, headers=other_headers).status_code == 404
    assert client.delete(f"/shopping-lists/{list_id}", headers=other_headers).status_code == 404

    # The owner's list is completely untouched by every attempt above.
    assert client.get(f"/shopping-lists/{list_id}", headers=owner_headers).status_code == 200


def test_create_list_rejects_duplicate_name_in_same_vertical(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    make_user(email="dupname@example.com", password="testpass123")
    headers = _login(client, "dupname@example.com")
    solo = _solo_list(client, headers, "kiddush")  # auto-created, named after the vertical label

    resp = client.post("/shopping-lists?vertical=kiddush", json={"name": solo["name"]}, headers=headers)
    assert resp.status_code == 400


def test_rename_list_rejects_collision_with_another_of_the_users_own_lists(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    make_user(email="renamecollide@example.com", password="testpass123")
    headers = _login(client, "renamecollide@example.com")
    solo_id = _solo_list(client, headers, "kiddush")["id"]
    other = client.post("/shopping-lists?vertical=kiddush", json={"name": "רשימה אחרת"}, headers=headers).json()

    resp = client.patch(f"/shopping-lists/{solo_id}", json={"name": "רשימה אחרת"}, headers=headers)
    assert resp.status_code == 400
    # Nothing was actually renamed.
    assert client.get(f"/shopping-lists/{other['id']}", headers=headers).json()["name"] == "רשימה אחרת"


def test_get_shopping_lists_recovers_from_a_concurrent_auto_seed_race(client, db_session, make_user):
    """Simulates the real race GET /shopping-lists' auto-seed path can hit: two near-simultaneous
    first visits both see zero lists and both try to create "the" first list (always named after
    the vertical's own label). The (user_id, vertical, name) unique constraint lets only one
    actually land — this asserts the loser's request recovers gracefully (200, the winner's list)
    instead of a raw 500."""
    vertical = _make_vertical(db_session, "kiddush")
    make_user(email="raceuser@example.com", password="testpass123")
    headers = _login(client, "raceuser@example.com")

    # Pre-create the row a "concurrent" request would have created, with the exact same name the
    # auto-seed logic would pick — this is what the loser's request finds already committed.
    winner = models.ShoppingList(user_id=db_session.query(models.User).filter_by(email="raceuser@example.com").first().id,
                                  vertical="kiddush", name=vertical.label_he)
    db_session.add(winner)
    db_session.commit()

    resp = client.get("/shopping-lists?vertical=kiddush", headers=headers)
    assert resp.status_code == 200
    lists = resp.json()
    assert len(lists) == 1  # no duplicate list was created
    assert lists[0]["id"] == winner.id


def test_writes_are_blocked_once_the_vertical_disables_shopping_lists(client, db_session, make_user):
    """A list created while the world's shopping-list feature was enabled must stop accepting
    mutations once an admin disables it — not just block creating brand-new lists."""
    vertical = _make_vertical(db_session, "kiddush")
    product = _make_product(db_session, "kiddush")
    make_user(email="disabledmid@example.com", password="testpass123")
    headers = _login(client, "disabledmid@example.com")
    list_id = _solo_list(client, headers, "kiddush")["id"]

    vertical.enables_shopping_list = False
    db_session.commit()

    assert client.post(f"/shopping-lists/{list_id}/items", json={"product_id": product.id, "quantity": 1}, headers=headers).status_code == 400
    assert client.post(f"/shopping-lists/{list_id}/refresh", headers=headers).status_code == 400
    assert client.put(f"/shopping-lists/{list_id}", json={"items": []}, headers=headers).status_code == 400
    assert client.patch(f"/shopping-lists/{list_id}", json={"name": "x"}, headers=headers).status_code == 400
    # Reading and deleting an already-existing list are deliberately still allowed — only active
    # use of the (now-disabled) feature is blocked.
    assert client.get(f"/shopping-lists/{list_id}", headers=headers).status_code == 200
    assert client.delete(f"/shopping-lists/{list_id}", headers=headers).status_code == 204


def _make_admin_headers(client, make_user, email="slistadmin@example.com"):
    make_user(email=email, password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": email, "password": "adminpass123"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_send_weekly_reminders_sends_to_users_with_lists(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    product = _make_product(db_session, "kiddush")
    member = make_user(email="reminderme@example.com", password="testpass123")
    member_headers = _login(client, "reminderme@example.com")
    admin_headers = _make_admin_headers(client, make_user)
    list_id = _solo_list(client, member_headers, "kiddush")["id"]

    client.post(f"/shopping-lists/{list_id}/items", json={"product_id": product.id, "quantity": 2}, headers=member_headers)

    resp = client.post("/admin/shopping-list/send-weekly-reminders", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json() == {"sent": 1}

    notif = (
        db_session.query(models.Notification)
        .filter(models.Notification.user_id == member.id, models.Notification.type == "shopping_list_reminder")
        .first()
    )
    assert notif is not None
    assert notif.link == f"/shopping-list?vertical=kiddush&list={list_id}"


def test_admin_send_weekly_reminders_sends_one_email_per_non_empty_list(client, db_session, make_user):
    """A gabbai juggling several named lists gets a reminder naming EACH one specifically, not a
    single blended reminder for the whole world."""
    _make_vertical(db_session, "kiddush")
    product = _make_product(db_session, "kiddush")
    member = make_user(email="multireminder@example.com", password="testpass123")
    member_headers = _login(client, "multireminder@example.com")
    admin_headers = _make_admin_headers(client, make_user, email="multiadmin@example.com")

    list_a = client.post("/shopping-lists?vertical=kiddush", json={"name": "רשימת שבת"}, headers=member_headers).json()
    list_b = client.post("/shopping-lists?vertical=kiddush", json={"name": "רשימת חג"}, headers=member_headers).json()
    client.post(f"/shopping-lists/{list_a['id']}/items", json={"product_id": product.id, "quantity": 1}, headers=member_headers)
    client.post(f"/shopping-lists/{list_b['id']}/items", json={"product_id": product.id, "quantity": 1}, headers=member_headers)

    resp = client.post("/admin/shopping-list/send-weekly-reminders", headers=admin_headers)
    assert resp.json() == {"sent": 2}

    notifs = (
        db_session.query(models.Notification)
        .filter(models.Notification.user_id == member.id, models.Notification.type == "shopping_list_reminder")
        .all()
    )
    assert len(notifs) == 2
    messages = {n.message for n in notifs}
    assert any("רשימת שבת" in m for m in messages)
    assert any("רשימת חג" in m for m in messages)


def test_admin_send_weekly_reminders_skips_users_with_no_list_items(client, db_session, make_user):
    _make_vertical(db_session, "kiddush")
    make_user(email="noreminder@example.com", password="testpass123")
    admin_headers = _make_admin_headers(client, make_user)

    resp = client.post("/admin/shopping-list/send-weekly-reminders", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json() == {"sent": 0}


def test_admin_send_weekly_reminders_requires_admin(client, db_session, make_user):
    make_user(email="notadmin2@example.com", password="testpass123")
    headers = _login(client, "notadmin2@example.com")
    resp = client.post("/admin/shopping-list/send-weekly-reminders", headers=headers)
    assert resp.status_code == 403


def test_cron_shopping_list_reminders_requires_cron_secret(client, db_session, monkeypatch):
    monkeypatch.setenv("CRON_SECRET", "test-secret-456")

    resp = client.post("/api/shopping-list/send-weekly-reminders")
    assert resp.status_code == 401

    resp = client.post(
        "/api/shopping-list/send-weekly-reminders",
        headers={"Authorization": "Bearer wrong-secret"},
    )
    assert resp.status_code == 401

    resp = client.post(
        "/api/shopping-list/send-weekly-reminders",
        headers={"Authorization": "Bearer test-secret-456"},
    )
    assert resp.status_code == 200
    assert resp.json() == {"sent": 0}


def test_weekly_reminder_uses_the_real_world_name_and_recipient_locale(client, db_session, make_user):
    """Regression test: the reminder text must never hardcode a specific world's name (this
    feature is generic across any enables_shopping_list world, not just Kiddush), and must use
    the recipient's own preferred language's label, not always Hebrew."""
    vertical = models.Vertical(
        slug="catering", label_he="קייטרינג", label_en="Catering", enables_shopping_list=True
    )
    db_session.add(vertical)
    db_session.commit()
    product = _make_product(db_session, "catering")
    member = make_user(email="englishgabbai@example.com", password="testpass123", preferred_language="en")
    member_headers = _login(client, "englishgabbai@example.com")
    admin_headers = _make_admin_headers(client, make_user, email="worldnameadmin@example.com")
    list_id = _solo_list(client, member_headers, "catering")["id"]

    client.post(f"/shopping-lists/{list_id}/items", json={"product_id": product.id, "quantity": 1}, headers=member_headers)
    resp = client.post("/admin/shopping-list/send-weekly-reminders", headers=admin_headers)
    assert resp.json() == {"sent": 1}

    notif = (
        db_session.query(models.Notification)
        .filter(models.Notification.user_id == member.id, models.Notification.type == "shopping_list_reminder")
        .first()
    )
    assert notif is not None
    assert notif.locale == "en"
    assert "Catering" in notif.title  # the real world name, in the recipient's own language
    assert "Kiddush" not in notif.title  # never hardcoded to a specific world


def test_weekly_reminder_skips_a_deactivated_gabbais_list_in_a_gabbai_only_world(client, db_session, make_user):
    """A user who has since turned off is_gabbai can no longer check out from a requires_gabbai
    world at all — nudging them to "order this week" for a leftover list there would be actively
    misleading. An active gabbai's list in the same world must still send normally."""
    _make_vertical(db_session, "kiddush", requires_gabbai=True)
    product = _make_product(db_session, "kiddush")
    admin_headers = _make_admin_headers(client, make_user, email="gatedreminderadmin@example.com")

    active = make_user(email="activegabbaireminder@example.com", password="testpass123", is_gabbai=True)
    active_headers = _login(client, "activegabbaireminder@example.com")
    active_list_id = _solo_list(client, active_headers, "kiddush")["id"]
    client.post(f"/shopping-lists/{active_list_id}/items", json={"product_id": product.id, "quantity": 1}, headers=active_headers)

    deactivated = make_user(email="deactivatedgabbaireminder@example.com", password="testpass123", is_gabbai=False)
    deactivated_headers = _login(client, "deactivatedgabbaireminder@example.com")
    deactivated_list_id = _solo_list(client, deactivated_headers, "kiddush")["id"]
    client.post(f"/shopping-lists/{deactivated_list_id}/items", json={"product_id": product.id, "quantity": 1}, headers=deactivated_headers)

    resp = client.post("/admin/shopping-list/send-weekly-reminders", headers=admin_headers)
    assert resp.json() == {"sent": 1}

    assert db_session.query(models.Notification).filter(
        models.Notification.user_id == active.id, models.Notification.type == "shopping_list_reminder"
    ).first() is not None
    assert db_session.query(models.Notification).filter(
        models.Notification.user_id == deactivated.id, models.Notification.type == "shopping_list_reminder"
    ).first() is None
