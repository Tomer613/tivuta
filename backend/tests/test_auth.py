def test_signup_creates_user(client):
    resp = client.post(
        "/auth/signup",
        json={
            "email": "newuser@example.com",
            "first_name": "New",
            "last_name": "User",
            "password": "testpass123",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "newuser@example.com"
    assert body["role"] == "member"


def test_signup_duplicate_email_rejected(client, make_user):
    make_user(email="dupe@example.com")
    resp = client.post(
        "/auth/signup",
        json={
            "email": "dupe@example.com",
            "first_name": "Another",
            "last_name": "Person",
            "password": "testpass123",
        },
    )
    assert resp.status_code == 400


def test_login_success(client, make_user):
    make_user(email="loginok@example.com", password="correcthorse")
    resp = client.post("/auth/login", data={"username": "loginok@example.com", "password": "correcthorse"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password_rejected(client, make_user):
    make_user(email="loginbad@example.com", password="correcthorse")
    resp = client.post("/auth/login", data={"username": "loginbad@example.com", "password": "wrong"})
    assert resp.status_code == 401


def test_login_rate_limit_blocks_after_five_attempts(client, make_user):
    make_user(email="ratelimited@example.com", password="correcthorse")
    for _ in range(5):
        resp = client.post("/auth/login", data={"username": "ratelimited@example.com", "password": "wrong"})
        assert resp.status_code == 401
    resp = client.post("/auth/login", data={"username": "ratelimited@example.com", "password": "wrong"})
    assert resp.status_code == 429
