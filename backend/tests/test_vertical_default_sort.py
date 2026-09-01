def _login(client, email, password="testpass123"):
    resp = client.post("/auth/login", data={"username": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_and_update_vertical_default_sort_round_trips(client, make_user):
    make_user(email="admin@example.com", role="admin")
    headers = _login(client, "admin@example.com")

    resp = client.post(
        "/admin/verticals",
        json={"slug": "kiddush", "label_he": "קידושים", "default_sort": "price_asc"},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["default_sort"] == "price_asc"
    vertical_id = body["id"]

    # Omitted on create — falls back to the schema default, matching every other vertical toggle.
    resp2 = client.post(
        "/admin/verticals",
        json={"slug": "diamonds2", "label_he": "יהלומים 2"},
        headers=headers,
    )
    assert resp2.status_code == 200, resp2.text
    assert resp2.json()["default_sort"] == "popularity"

    resp3 = client.patch(
        f"/admin/verticals/{vertical_id}",
        json={"default_sort": "newest"},
        headers=headers,
    )
    assert resp3.status_code == 200, resp3.text
    assert resp3.json()["default_sort"] == "newest"

    # Read-back via the public list endpoint confirms it persisted, not just echoed in the response.
    resp4 = client.get("/verticals")
    assert resp4.status_code == 200
    match = next(v for v in resp4.json() if v["slug"] == "kiddush")
    assert match["default_sort"] == "newest"


def test_invalid_default_sort_rejected_on_create_and_update(client, make_user):
    make_user(email="admin@example.com", role="admin")
    headers = _login(client, "admin@example.com")

    resp = client.post(
        "/admin/verticals",
        json={"slug": "kiddush", "label_he": "קידושים", "default_sort": "foo"},
        headers=headers,
    )
    assert resp.status_code == 422

    resp2 = client.post(
        "/admin/verticals",
        json={"slug": "kiddush", "label_he": "קידושים", "default_sort": "popularity"},
        headers=headers,
    )
    vertical_id = resp2.json()["id"]

    resp3 = client.patch(
        f"/admin/verticals/{vertical_id}",
        json={"default_sort": "foo"},
        headers=headers,
    )
    assert resp3.status_code == 422
