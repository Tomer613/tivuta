def _make_admin_headers(client, make_user, email="usersadmin@example.com"):
    make_user(email=email, password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": email, "password": "adminpass123"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_update_user_name_email_phone(client, make_user):
    headers = _make_admin_headers(client, make_user)
    target = make_user(email="target@example.com", first_name="ישן", last_name="שם")

    resp = client.patch(
        f"/admin/users/{target.id}",
        json={"first_name": "חדש", "last_name": "שם חדש", "email": "new-email@example.com", "phone": "0501234567"},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["first_name"] == "חדש"
    assert body["last_name"] == "שם חדש"
    assert body["email"] == "new-email@example.com"
    assert body["phone"] == "0501234567"


def test_admin_update_user_email_collision_with_another_user_rejected(client, make_user):
    headers = _make_admin_headers(client, make_user)
    make_user(email="taken@example.com")
    target = make_user(email="target2@example.com")

    resp = client.patch(f"/admin/users/{target.id}", json={"email": "taken@example.com"}, headers=headers)
    assert resp.status_code == 400


def test_admin_update_user_email_collision_with_vendor_login_email_rejected(client, make_user, make_vendor):
    headers = _make_admin_headers(client, make_user)
    make_vendor(login_email="vendor-login@example.com")
    target = make_user(email="target3@example.com")

    resp = client.patch(f"/admin/users/{target.id}", json={"email": "vendor-login@example.com"}, headers=headers)
    assert resp.status_code == 400


def test_admin_update_user_same_email_is_a_noop_not_a_collision(client, make_user):
    headers = _make_admin_headers(client, make_user)
    target = make_user(email="target4@example.com")

    resp = client.patch(f"/admin/users/{target.id}", json={"email": "target4@example.com", "phone": "050"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "target4@example.com"


def test_admin_update_user_requires_admin(client, make_user):
    member = make_user(email="plainmember@example.com", password="testpass123")
    login = client.post("/auth/login", data={"username": "plainmember@example.com", "password": "testpass123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    resp = client.patch(f"/admin/users/{member.id}", json={"first_name": "X"}, headers=headers)
    assert resp.status_code == 403


def test_admin_update_user_nonexistent_returns_404(client, make_user):
    headers = _make_admin_headers(client, make_user)
    resp = client.patch("/admin/users/999999", json={"first_name": "X"}, headers=headers)
    assert resp.status_code == 404
