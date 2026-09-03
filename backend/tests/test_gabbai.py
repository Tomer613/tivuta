from app import models


def _login(client, email, password="testpass123"):
    resp = client.post("/auth/login", data={"username": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _make_vertical(db_session, slug, requires_gabbai=False, allows_custom_items_note=False):
    vertical = models.Vertical(
        slug=slug,
        label_he=slug,
        requires_gabbai=requires_gabbai,
        allows_custom_items_note=allows_custom_items_note,
    )
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


def test_register_gabbai_sets_flag_and_stores_fields_without_touching_role(client, db_session, make_user):
    """is_gabbai is independent of role — registering as gabbai must never change a member's
    role value (and, per test_admin_can_register_as_gabbai_too below, must work identically for
    an admin without demoting them)."""
    make_user(email="gabbai1@example.com", password="testpass123")
    headers = _login(client, "gabbai1@example.com")

    resp = client.post(
        "/users/me/register-gabbai",
        json={
            "community_name": "קהילת בדיקה",
            "synagogue_address": "רחוב הדוגמה 1, ירושלים",
            "contact_name": "משה כהן",
            "contact_phone": "0501234567",
        },
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "member"
    assert data["is_gabbai"] is True
    assert data["gabbai_community_name"] == "קהילת בדיקה"
    assert data["gabbai_synagogue_address"] == "רחוב הדוגמה 1, ירושלים"

    # Calling again (editing details) updates the fields but keeps is_gabbai == True and role
    # unchanged — an upsert, not a second promotion.
    resp2 = client.post(
        "/users/me/register-gabbai",
        json={"community_name": "קהילה חדשה", "synagogue_address": "כתובת חדשה"},
        headers=headers,
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["role"] == "member"
    assert data2["is_gabbai"] is True
    assert data2["gabbai_community_name"] == "קהילה חדשה"
    assert data2["gabbai_contact_name"] is None  # not resent, so cleared per the upsert schema


def test_deactivate_gabbai_clears_flag_but_preserves_fields_and_past_orders(client, db_session, make_user):
    """The user's explicit concern: turning off is_gabbai must never touch order history. Verified
    directly — a past order's snapshot fields are read straight from CustomerOrder, which is
    captured once at checkout time and never re-derived from the live User row."""
    _make_vertical(db_session, "kiddush", requires_gabbai=True)
    product = _make_product(db_session, "kiddush")
    make_user(email="willdeactivate@example.com", password="testpass123")
    headers = _login(client, "willdeactivate@example.com")

    client.post(
        "/users/me/register-gabbai",
        json={"community_name": "קהילת הבדיקה", "synagogue_address": "כתובת הבדיקה"},
        headers=headers,
    )
    checkout = client.post(
        "/leads/cart-checkout",
        json={"items": [{"product_id": product.id, "quantity": 1}]},
        headers=headers,
    )
    order_id = checkout.json()[0]["customer_order_id"]

    resp = client.delete("/users/me/register-gabbai", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_gabbai"] is False
    # Fields are deliberately left in place, not wiped, so re-registering later pre-fills them.
    assert data["gabbai_community_name"] == "קהילת הבדיקה"

    my_orders = client.get("/users/me/orders", headers=headers).json()
    order = next(o for o in my_orders if o["id"] == order_id)
    assert order["orderer_role"] == "gabbai"
    assert order["gabbai_community_name_snapshot"] == "קהילת הבדיקה"

    # No longer gabbai-eligible — a fresh checkout attempt from the same vertical is rejected.
    blocked = client.post(
        "/leads/cart-checkout",
        json={"items": [{"product_id": product.id, "quantity": 1}]},
        headers=headers,
    )
    assert blocked.status_code == 400


def test_reregister_after_deactivating_prefills_the_old_community_name(client, db_session, make_user):
    make_user(email="reregisterer@example.com", password="testpass123")
    headers = _login(client, "reregisterer@example.com")

    client.post(
        "/users/me/register-gabbai",
        json={"community_name": "קהילה ראשונה", "synagogue_address": "כתובת"},
        headers=headers,
    )
    client.delete("/users/me/register-gabbai", headers=headers)

    # Re-registering with the same details "succeeds" trivially, but the real point is that the
    # field was never cleared in between — confirmed by reading it back before re-posting.
    me = client.get("/users/me", headers=headers).json()
    assert me["is_gabbai"] is False
    assert me["gabbai_community_name"] == "קהילה ראשונה"

    resp = client.post(
        "/users/me/register-gabbai",
        json={"community_name": "קהילה ראשונה", "synagogue_address": "כתובת"},
        headers=headers,
    )
    assert resp.json()["is_gabbai"] is True


def test_gabbai_community_suggestions_only_includes_currently_active_gabbaim(client, db_session, make_user):
    make_user(email="activegabbai@example.com", password="testpass123")
    active_headers = _login(client, "activegabbai@example.com")
    client.post(
        "/users/me/register-gabbai",
        json={"community_name": "קהילה פעילה", "synagogue_address": "כתובת א"},
        headers=active_headers,
    )

    make_user(email="deactivatedgabbai@example.com", password="testpass123")
    deactivated_headers = _login(client, "deactivatedgabbai@example.com")
    client.post(
        "/users/me/register-gabbai",
        json={"community_name": "קהילה לא פעילה", "synagogue_address": "כתובת ב"},
        headers=deactivated_headers,
    )
    client.delete("/users/me/register-gabbai", headers=deactivated_headers)

    resp = client.get("/users/me/gabbai-community-suggestions", headers=active_headers)
    assert resp.status_code == 200
    assert "קהילה פעילה" in resp.json()
    assert "קהילה לא פעילה" not in resp.json()


def test_admin_can_register_as_gabbai_too(client, db_session, make_user):
    """Regression test for the reported bug: an admin self-registering as gabbai used to silently
    no-op (role stayed "admin", is_gabbai never existed) because the old logic only promoted role
    from exactly "member". is_gabbai is now fully independent of role, so an admin keeps admin
    access AND becomes gabbai-eligible — including being able to actually check out from a
    requires_gabbai vertical, which used to 400 even after "registering"."""
    _make_vertical(db_session, "kiddush", requires_gabbai=True)
    product = _make_product(db_session, "kiddush")
    make_user(email="adminwhoisgabbai@example.com", password="testpass123", role="admin")
    headers = _login(client, "adminwhoisgabbai@example.com")

    resp = client.post(
        "/users/me/register-gabbai",
        json={"community_name": "קהילת המנהל", "synagogue_address": "כתובת המנהל"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "admin"  # unchanged — did not lose admin access
    assert data["is_gabbai"] is True

    checkout = client.post(
        "/leads/cart-checkout",
        json={"items": [{"product_id": product.id, "quantity": 1}]},
        headers=headers,
    )
    assert checkout.status_code == 200  # used to 400 even after "registering"


def test_checkout_from_gabbai_vertical_requires_registration(client, db_session, make_user):
    _make_vertical(db_session, "kiddush", requires_gabbai=True)
    product = _make_product(db_session, "kiddush")
    make_user(email="notgabbai@example.com", password="testpass123")
    headers = _login(client, "notgabbai@example.com")

    resp = client.post(
        "/leads/cart-checkout",
        json={"items": [{"product_id": product.id, "quantity": 1}]},
        headers=headers,
    )
    assert resp.status_code == 400


def test_checkout_from_gabbai_vertical_tags_order_and_snapshots(client, db_session, make_user):
    _make_vertical(db_session, "kiddush", requires_gabbai=True, allows_custom_items_note=True)
    product = _make_product(db_session, "kiddush")
    make_user(email="realgabbai@example.com", password="testpass123")
    headers = _login(client, "realgabbai@example.com")

    client.post(
        "/users/me/register-gabbai",
        json={"community_name": "בית הכנסת הגדול", "synagogue_address": "רחוב הרב 5"},
        headers=headers,
    )

    resp = client.post(
        "/leads/cart-checkout",
        json={
            "items": [{"product_id": product.id, "quantity": 2}],
            "custom_items_note": "צריך גם יין נוסף",
        },
        headers=headers,
    )
    assert resp.status_code == 200
    order_id = resp.json()[0]["customer_order_id"]

    my_orders = client.get("/users/me/orders", headers=headers).json()
    order = next(o for o in my_orders if o["id"] == order_id)
    assert order["orderer_role"] == "gabbai"
    assert order["gabbai_community_name_snapshot"] == "בית הכנסת הגדול"
    assert order["custom_items_note"] == "צריך גם יין נוסף"

    # Editing the profile afterward must NOT rewrite the already-placed order's snapshot.
    client.post(
        "/users/me/register-gabbai",
        json={"community_name": "שם אחר לגמרי", "synagogue_address": "כתובת אחרת"},
        headers=headers,
    )
    my_orders_after = client.get("/users/me/orders", headers=headers).json()
    order_after = next(o for o in my_orders_after if o["id"] == order_id)
    assert order_after["gabbai_community_name_snapshot"] == "בית הכנסת הגדול"


def test_custom_items_note_dropped_when_vertical_does_not_allow_it(client, db_session, make_user):
    _make_vertical(db_session, "diamonds", requires_gabbai=False, allows_custom_items_note=False)
    product = _make_product(db_session, "diamonds")
    make_user(email="notenote@example.com", password="testpass123")
    headers = _login(client, "notenote@example.com")

    resp = client.post(
        "/leads/cart-checkout",
        json={
            "items": [{"product_id": product.id, "quantity": 1}],
            "custom_items_note": "should not be stored",
        },
        headers=headers,
    )
    assert resp.status_code == 200
    order_id = resp.json()[0]["customer_order_id"]

    my_orders = client.get("/users/me/orders", headers=headers).json()
    order = next(o for o in my_orders if o["id"] == order_id)
    assert order["custom_items_note"] is None


def test_mixed_gabbai_and_ordinary_vertical_checkout_blocked(client, db_session, make_user):
    _make_vertical(db_session, "kiddush", requires_gabbai=True)
    _make_vertical(db_session, "diamonds", requires_gabbai=False)
    kiddush_product = _make_product(db_session, "kiddush", title="יין קידוש")
    diamond_product = _make_product(db_session, "diamonds", title="טבעת")
    make_user(email="mixedcart@example.com", password="testpass123")
    headers = _login(client, "mixedcart@example.com")

    client.post(
        "/users/me/register-gabbai",
        json={"community_name": "קהילה", "synagogue_address": "כתובת"},
        headers=headers,
    )

    resp = client.post(
        "/leads/cart-checkout",
        json={
            "items": [
                {"product_id": kiddush_product.id, "quantity": 1},
                {"product_id": diamond_product.id, "quantity": 1},
            ]
        },
        headers=headers,
    )
    assert resp.status_code == 400


def test_admin_can_set_gabbai_status(client, db_session, make_user):
    make_user(email="plainmember@example.com", password="testpass123")
    make_user(email="realadmin@example.com", password="testpass123", role="admin")
    admin_headers = _login(client, "realadmin@example.com")

    target = db_session.query(models.User).filter(models.User.email == "plainmember@example.com").first()
    resp = client.patch(
        f"/admin/users/{target.id}/gabbai",
        json={"is_gabbai": True},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["is_gabbai"] is True
    assert resp.json()["role"] == "member"  # unaffected

    # Unsetting works the same way.
    resp2 = client.patch(
        f"/admin/users/{target.id}/gabbai",
        json={"is_gabbai": False},
        headers=admin_headers,
    )
    assert resp2.json()["is_gabbai"] is False


def test_admin_role_endpoint_rejects_gabbai_as_a_role_value(client, db_session, make_user):
    """"gabbai" is no longer a valid `role` — it's the independent is_gabbai flag now (see
    PATCH /admin/users/{id}/gabbai)."""
    make_user(email="plainmember2@example.com", password="testpass123")
    make_user(email="realadmin2@example.com", password="testpass123", role="admin")
    admin_headers = _login(client, "realadmin2@example.com")

    target = db_session.query(models.User).filter(models.User.email == "plainmember2@example.com").first()
    resp = client.patch(
        f"/admin/users/{target.id}/role",
        json={"role": "gabbai"},
        headers=admin_headers,
    )
    assert resp.status_code == 400


def test_admin_member_count_includes_gabbai_users(client, db_session, make_user):
    make_user(email="member2@example.com", password="testpass123")
    make_user(email="gabbai2@example.com", password="testpass123", is_gabbai=True)
    make_user(email="admin2@example.com", password="testpass123", role="admin")
    admin_headers = _login(client, "admin2@example.com")

    resp = client.get("/admin/users/member-count", headers=admin_headers)
    assert resp.status_code == 200
    # 2 non-admin users (member + gabbai) — the admin itself is excluded.
    assert resp.json()["count"] == 2
