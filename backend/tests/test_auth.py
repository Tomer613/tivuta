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


def test_account_locks_after_max_failed_attempts_and_rejects_correct_password(client, make_user):
    from app.rate_limit import limiter

    make_user(email="lockout1@example.com", password="correcthorse")
    for _ in range(5):  # default max_failed_login_attempts
        resp = client.post("/auth/login", data={"username": "lockout1@example.com", "password": "wrong"})
        assert resp.status_code == 401

    # The per-IP rate limit (also 5/minute) is a separate concern from account lockout — reset
    # it so this next request is evaluated by the lockout check, not blocked upstream by it.
    limiter.reset()
    resp = client.post("/auth/login", data={"username": "lockout1@example.com", "password": "correcthorse"})
    assert resp.status_code == 423


def test_successful_login_resets_failed_attempt_counter(client, make_user, db_session):
    from app.rate_limit import limiter

    user = make_user(email="lockout2@example.com", password="correcthorse")
    for _ in range(3):  # fewer than the threshold — should not lock
        resp = client.post("/auth/login", data={"username": "lockout2@example.com", "password": "wrong"})
        assert resp.status_code == 401

    limiter.reset()
    resp = client.post("/auth/login", data={"username": "lockout2@example.com", "password": "correcthorse"})
    assert resp.status_code == 200

    db_session.refresh(user)
    assert user.failed_login_attempts == 0
    assert user.locked_until is None


def test_expired_lockout_allows_login_again(client, make_user, db_session):
    from datetime import datetime, timedelta

    user = make_user(email="lockout3@example.com", password="correcthorse")
    user.locked_until = datetime.utcnow() - timedelta(minutes=1)  # already expired
    db_session.commit()

    resp = client.post("/auth/login", data={"username": "lockout3@example.com", "password": "correcthorse"})
    assert resp.status_code == 200


def test_reset_password_clears_lockout(client, make_user, db_session):
    from datetime import datetime, timedelta

    user = make_user(email="lockout4@example.com", password="correcthorse")
    user.locked_until = datetime.utcnow() + timedelta(minutes=15)
    user.failed_login_attempts = 5
    user.reset_token = "test-reset-token"
    user.reset_token_expires = datetime.utcnow() + timedelta(minutes=30)
    db_session.commit()

    resp = client.post(
        "/auth/reset-password",
        json={"token": "test-reset-token", "new_password": "brandnewpass123"},
    )
    assert resp.status_code == 200

    db_session.refresh(user)
    assert user.locked_until is None
    assert user.failed_login_attempts == 0

    login_resp = client.post("/auth/login", data={"username": "lockout4@example.com", "password": "brandnewpass123"})
    assert login_resp.status_code == 200


def test_admin_unlock_clears_lockout(client, make_user, db_session):
    from datetime import datetime, timedelta

    admin = make_user(email="lockoutadmin@example.com", password="adminpass123", role="admin")
    user = make_user(email="lockout5@example.com", password="correcthorse")
    user.locked_until = datetime.utcnow() + timedelta(minutes=15)
    user.failed_login_attempts = 5
    db_session.commit()

    login = client.post("/auth/login", data={"username": "lockoutadmin@example.com", "password": "adminpass123"})
    token = login.json()["access_token"]

    resp = client.patch(f"/admin/users/{user.id}/unlock", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["locked_until"] is None

    db_session.refresh(user)
    assert user.locked_until is None
    assert user.failed_login_attempts == 0
