from app import models


def _make_admin_headers(client, make_user, email="surveyadmin@example.com"):
    make_user(email=email, password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": email, "password": "adminpass123"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _login(client, make_user, email="surveymember@example.com"):
    make_user(email=email, password="testpass123")
    login = client.post("/auth/login", data={"username": email, "password": "testpass123"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _make_product(db_session, title_he="מוצר"):
    product = models.Product(vertical="diamonds", title_he=title_he, description_he="תיאור", price=100.0)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def test_create_product_poll(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    p1, p2 = _make_product(db_session, "א"), _make_product(db_session, "ב")

    resp = client.post(
        "/admin/surveys",
        json={
            "question_he": "איזה טבעת יפה יותר?",
            "poll_type": "product",
            "options": [{"product_id": p1.id}, {"product_id": p2.id}],
        },
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["poll_type"] == "product"
    assert body["image_url"] is None
    assert {o["product_id"] for o in body["options"]} == {p1.id, p2.id}


def test_create_text_poll_with_image(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)

    resp = client.post(
        "/admin/surveys",
        json={
            "question_he": "מה דעתכם על השירות שלנו?",
            "poll_type": "text",
            "image_url": "poll-image.jpg",
            "options": [{"label_override_he": "מצוין"}, {"label_override_he": "טוב"}, {"label_override_he": "בינוני"}],
        },
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["poll_type"] == "text"
    assert body["image_url"] == "poll-image.jpg"
    assert len(body["options"]) == 3
    assert all(o["product_id"] is None for o in body["options"])
    assert {o["label_override_he"] for o in body["options"]} == {"מצוין", "טוב", "בינוני"}


def test_text_poll_option_rejects_product_id(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    product = _make_product(db_session)

    resp = client.post(
        "/admin/surveys",
        json={
            "question_he": "שאלה",
            "poll_type": "text",
            "options": [{"product_id": product.id}, {"label_override_he": "תשובה"}],
        },
        headers=headers,
    )
    assert resp.status_code == 422


def test_text_poll_option_requires_label(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)

    resp = client.post(
        "/admin/surveys",
        json={
            "question_he": "שאלה",
            "poll_type": "text",
            "options": [{"label_override_he": "תשובה"}, {"label_override_he": "  "}],
        },
        headers=headers,
    )
    assert resp.status_code == 422


def test_product_poll_option_requires_product_id(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)

    resp = client.post(
        "/admin/surveys",
        json={
            "question_he": "שאלה",
            "poll_type": "product",
            "options": [{"label_override_he": "תשובה בלי מוצר"}, {"label_override_he": "עוד תשובה"}],
        },
        headers=headers,
    )
    assert resp.status_code == 422


def test_survey_requires_at_least_two_options(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    product = _make_product(db_session)

    resp = client.post(
        "/admin/surveys",
        json={"question_he": "שאלה", "poll_type": "product", "options": [{"product_id": product.id}]},
        headers=headers,
    )
    assert resp.status_code == 422


def test_anonymous_user_can_read_survey(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    resp = client.post(
        "/admin/surveys",
        json={
            "question_he": "שאלה",
            "poll_type": "text",
            "options": [{"label_override_he": "כן"}, {"label_override_he": "לא"}],
        },
        headers=headers,
    )
    survey_id = resp.json()["id"]

    anon_resp = client.get(f"/surveys/{survey_id}")
    assert anon_resp.status_code == 200
    body = anon_resp.json()
    assert body["has_voted"] is False
    assert body["my_option_ids"] == []


def test_vote_on_text_poll(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    resp = client.post(
        "/admin/surveys",
        json={
            "question_he": "שאלה",
            "poll_type": "text",
            "options": [{"label_override_he": "כן"}, {"label_override_he": "לא"}],
        },
        headers=headers,
    )
    survey = resp.json()
    option_id = survey["options"][0]["id"]

    member_headers = _login(client, make_user)
    vote_resp = client.post(
        f"/surveys/{survey['id']}/vote",
        json={"survey_option_ids": [option_id]},
        headers=member_headers,
    )
    assert vote_resp.status_code == 200
    body = vote_resp.json()
    assert body["has_voted"] is True
    assert body["my_option_ids"] == [option_id]
    voted_option = next(o for o in body["options"] if o["id"] == option_id)
    assert voted_option["vote_count"] == 1


def test_admin_update_survey_image_url(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    p1, p2 = _make_product(db_session, "א"), _make_product(db_session, "ב")
    resp = client.post(
        "/admin/surveys",
        json={"question_he": "שאלה", "poll_type": "product", "options": [{"product_id": p1.id}, {"product_id": p2.id}]},
        headers=headers,
    )
    survey_id = resp.json()["id"]

    update_resp = client.patch(f"/admin/surveys/{survey_id}", json={"image_url": "new-image.jpg"}, headers=headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["image_url"] == "new-image.jpg"
    # poll_type is immutable - not part of SurveyUpdate at all, so it can't drift via this endpoint.
    assert update_resp.json()["poll_type"] == "product"
