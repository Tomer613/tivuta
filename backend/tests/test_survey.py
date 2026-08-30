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


def _make_product(db_session, title_he="מוצר", image_url=None):
    product = models.Product(vertical="diamonds", title_he=title_he, description_he="תיאור", price=100.0, image_url=image_url)
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


def test_admin_update_survey_question_text(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    p1, p2 = _make_product(db_session, "א"), _make_product(db_session, "ב")
    resp = client.post(
        "/admin/surveys",
        json={"question_he": "שאלה ישנה", "poll_type": "product", "options": [{"product_id": p1.id}, {"product_id": p2.id}]},
        headers=headers,
    )
    survey_id = resp.json()["id"]

    update_resp = client.patch(
        f"/admin/surveys/{survey_id}",
        json={"question_he": "שאלה מתוקנת", "question_en": "Fixed question"},
        headers=headers,
    )
    assert update_resp.status_code == 200
    body = update_resp.json()
    assert body["question_he"] == "שאלה מתוקנת"
    assert body["question_en"] == "Fixed question"


def test_admin_update_survey_relabel_option_and_add_new(client, db_session, make_user):
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
    opt1_id = survey["options"][0]["id"]
    opt2_id = survey["options"][1]["id"]

    update_resp = client.patch(
        f"/admin/surveys/{survey['id']}",
        json={
            "options": [
                {"id": opt1_id, "label_override_he": "כן, בהחלט"},
                {"id": opt2_id, "label_override_he": "לא"},
                {"label_override_he": "אולי"},
            ]
        },
        headers=headers,
    )
    assert update_resp.status_code == 200
    body = update_resp.json()
    assert len(body["options"]) == 3
    labels = {o["id"]: o["label_override_he"] for o in body["options"]}
    assert labels[opt1_id] == "כן, בהחלט"
    assert labels[opt2_id] == "לא"
    assert "אולי" in labels.values()


def test_admin_update_survey_reassign_product_option(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    p1, p2, p3 = _make_product(db_session, "א"), _make_product(db_session, "ב"), _make_product(db_session, "ג")
    resp = client.post(
        "/admin/surveys",
        json={"question_he": "שאלה", "poll_type": "product", "options": [{"product_id": p1.id}, {"product_id": p2.id}]},
        headers=headers,
    )
    survey = resp.json()
    opt1_id = survey["options"][0]["id"]
    opt2_id = survey["options"][1]["id"]

    update_resp = client.patch(
        f"/admin/surveys/{survey['id']}",
        json={"options": [{"id": opt1_id, "product_id": p3.id}, {"id": opt2_id, "product_id": p2.id}]},
        headers=headers,
    )
    assert update_resp.status_code == 200
    product_ids = {o["product_id"] for o in update_resp.json()["options"]}
    assert product_ids == {p3.id, p2.id}


def test_admin_update_survey_deletes_zero_vote_option(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    resp = client.post(
        "/admin/surveys",
        json={
            "question_he": "שאלה",
            "poll_type": "text",
            "options": [{"label_override_he": "כן"}, {"label_override_he": "לא"}, {"label_override_he": "אולי"}],
        },
        headers=headers,
    )
    survey = resp.json()
    keep_ids = [survey["options"][0]["id"], survey["options"][1]["id"]]

    update_resp = client.patch(
        f"/admin/surveys/{survey['id']}",
        json={"options": [{"id": keep_ids[0], "label_override_he": "כן"}, {"id": keep_ids[1], "label_override_he": "לא"}]},
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert {o["id"] for o in update_resp.json()["options"]} == set(keep_ids)


def test_admin_update_survey_blocks_deleting_voted_option(client, db_session, make_user):
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
    voted_id = survey["options"][0]["id"]
    other_id = survey["options"][1]["id"]

    member_headers = _login(client, make_user)
    vote_resp = client.post(f"/surveys/{survey['id']}/vote", json={"survey_option_ids": [voted_id]}, headers=member_headers)
    assert vote_resp.status_code == 200

    update_resp = client.patch(
        f"/admin/surveys/{survey['id']}",
        json={"options": [{"id": other_id, "label_override_he": "לא"}, {"label_override_he": "אולי"}]},
        headers=headers,
    )
    assert update_resp.status_code == 400
    assert "vote" in update_resp.json()["detail"].lower()

    # The survey must be completely unchanged - no partial application.
    get_resp = client.get(f"/admin/surveys", headers=headers)
    unchanged = next(s for s in get_resp.json() if s["id"] == survey["id"])
    assert {o["id"] for o in unchanged["options"]} == {voted_id, other_id}


def test_survey_option_includes_product_image_url(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    p1 = _make_product(db_session, "טבעת", image_url="ring.jpg")
    p2 = _make_product(db_session, "עגילים")  # no image
    resp = client.post(
        "/admin/surveys",
        json={"question_he": "שאלה", "poll_type": "product", "options": [{"product_id": p1.id}, {"product_id": p2.id}]},
        headers=headers,
    )
    assert resp.status_code == 200
    options = {o["product_id"]: o for o in resp.json()["options"]}
    assert options[p1.id]["product_image_url"] == "ring.jpg"
    assert options[p2.id]["product_image_url"] is None


def test_text_poll_option_has_no_product_image_url(client, db_session, make_user):
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
    assert resp.status_code == 200
    assert all(o["product_image_url"] is None for o in resp.json()["options"])


def test_followup_questions_endpoint_is_public_and_returns_defaults(client):
    resp = client.get("/surveys/followup-questions")
    assert resp.status_code == 200
    body = resp.json()
    assert body["question1_he"]
    assert body["question2_he"]


def test_followup_rejected_for_text_poll(client, db_session, make_user):
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
    client.post(f"/surveys/{survey['id']}/vote", json={"survey_option_ids": [option_id]}, headers=member_headers)

    followup_resp = client.post(
        f"/surveys/{survey['id']}/followup",
        json={"wants_followup": True, "additional_products_note": None},
        headers=member_headers,
    )
    assert followup_resp.status_code == 400


def test_followup_rejected_for_non_voter(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    p1, p2 = _make_product(db_session, "א"), _make_product(db_session, "ב")
    resp = client.post(
        "/admin/surveys",
        json={"question_he": "שאלה", "poll_type": "product", "options": [{"product_id": p1.id}, {"product_id": p2.id}]},
        headers=headers,
    )
    survey_id = resp.json()["id"]

    member_headers = _login(client, make_user)
    followup_resp = client.post(
        f"/surveys/{survey_id}/followup",
        json={"wants_followup": True, "additional_products_note": None},
        headers=member_headers,
    )
    assert followup_resp.status_code == 400


def test_followup_creates_lead_with_voted_products(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    p1, p2 = _make_product(db_session, "טבעת יהלום"), _make_product(db_session, "עגילי זהב")
    resp = client.post(
        "/admin/surveys",
        json={"question_he": "מה תרצו שנביא הפעם?", "poll_type": "product", "options": [{"product_id": p1.id}, {"product_id": p2.id}]},
        headers=headers,
    )
    survey = resp.json()
    option_id = survey["options"][0]["id"]

    member_headers = _login(client, make_user)
    client.post(f"/surveys/{survey['id']}/vote", json={"survey_option_ids": [option_id]}, headers=member_headers)

    followup_resp = client.post(
        f"/surveys/{survey['id']}/followup",
        json={"wants_followup": True, "additional_products_note": "הייתי רוצה גם שרשראות"},
        headers=member_headers,
    )
    assert followup_resp.status_code == 200
    assert followup_resp.json() == {"created": True}

    lead = db_session.query(models.Lead).filter(models.Lead.lead_type == "survey_followup").first()
    assert lead is not None
    assert lead.customer_order_id is None
    assert "טבעת יהלום" in lead.message
    assert "כן" in lead.message
    assert "הייתי רוצה גם שרשראות" in lead.message
    assert lead.subject == "מה תרצו שנביא הפעם?"


def test_followup_empty_response_creates_no_lead(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    p1, p2 = _make_product(db_session, "א"), _make_product(db_session, "ב")
    resp = client.post(
        "/admin/surveys",
        json={"question_he": "שאלה", "poll_type": "product", "options": [{"product_id": p1.id}, {"product_id": p2.id}]},
        headers=headers,
    )
    survey = resp.json()
    option_id = survey["options"][0]["id"]

    member_headers = _login(client, make_user)
    client.post(f"/surveys/{survey['id']}/vote", json={"survey_option_ids": [option_id]}, headers=member_headers)

    followup_resp = client.post(
        f"/surveys/{survey['id']}/followup",
        json={"wants_followup": False, "additional_products_note": "   "},
        headers=member_headers,
    )
    assert followup_resp.status_code == 200
    assert followup_resp.json() == {"created": False}
    assert db_session.query(models.Lead).filter(models.Lead.lead_type == "survey_followup").count() == 0


def test_admin_update_survey_options_requires_at_least_two(client, db_session, make_user):
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
    opt1_id = survey["options"][0]["id"]

    update_resp = client.patch(
        f"/admin/surveys/{survey['id']}",
        json={"options": [{"id": opt1_id}]},
        headers=headers,
    )
    assert update_resp.status_code == 400
