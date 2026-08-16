from app import models


def _make_admin_headers(client, make_user, email="deleteadmin@example.com"):
    make_user(email=email, password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": email, "password": "adminpass123"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _make_product(db_session, title="מוצר למחיקה"):
    product = models.Product(vertical="diamonds", title_he=title, description_he="תיאור", price=100.0)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def test_delete_unreferenced_product_actually_removes_it(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    product = _make_product(db_session)

    member = make_user(email="deletemember@example.com", password="testpass123")
    favorite = models.Favorite(user_id=member.id, product_id=product.id)
    db_session.add(favorite)
    db_session.commit()

    resp = client.delete(f"/admin/products/{product.id}", headers=headers)
    assert resp.status_code == 200

    assert db_session.query(models.Product).filter(models.Product.id == product.id).first() is None
    assert db_session.query(models.Favorite).filter(models.Favorite.product_id == product.id).first() is None


def test_delete_blocked_when_product_has_a_lead(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    product = _make_product(db_session)
    member = make_user(email="deletemember2@example.com", password="testpass123")

    lead = models.Lead(user_id=member.id, product_id=product.id, lead_type="contact_request", status="new")
    db_session.add(lead)
    db_session.commit()

    resp = client.delete(f"/admin/products/{product.id}", headers=headers)
    assert resp.status_code == 409

    still_there = db_session.query(models.Product).filter(models.Product.id == product.id).first()
    assert still_there is not None
    assert still_there.is_active is True


def test_delete_blocked_when_product_has_a_promotion_entry(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    product = _make_product(db_session)
    member = make_user(email="deletemember3@example.com", password="testpass123")

    promotion = models.Promotion(name_he="הגרלה", type="raffle", channel="online")
    db_session.add(promotion)
    db_session.commit()
    db_session.refresh(promotion)

    entry = models.PromotionEntry(user_id=member.id, promotion_id=promotion.id, product_id=product.id)
    db_session.add(entry)
    db_session.commit()

    resp = client.delete(f"/admin/products/{product.id}", headers=headers)
    assert resp.status_code == 409

    assert db_session.query(models.Product).filter(models.Product.id == product.id).first() is not None


def test_delete_blocked_when_product_has_a_survey_option(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    product = _make_product(db_session)

    survey = models.Survey(question_he="איזה מוצר הכי מוצא חן בעיניך?")
    db_session.add(survey)
    db_session.commit()
    db_session.refresh(survey)

    option = models.SurveyOption(survey_id=survey.id, product_id=product.id)
    db_session.add(option)
    db_session.commit()

    resp = client.delete(f"/admin/products/{product.id}", headers=headers)
    assert resp.status_code == 409
    assert db_session.query(models.Product).filter(models.Product.id == product.id).first() is not None


def test_delete_blocked_when_product_has_a_distribution(client, db_session, make_user):
    headers = _make_admin_headers(client, make_user)
    product = _make_product(db_session)

    distribution = models.Distribution(distribution_type="daily_deal", product_id=product.id, channels=["email"])
    db_session.add(distribution)
    db_session.commit()

    resp = client.delete(f"/admin/products/{product.id}", headers=headers)
    assert resp.status_code == 409
    assert db_session.query(models.Product).filter(models.Product.id == product.id).first() is not None


def test_delete_blocked_when_product_has_a_sale_transaction(client, db_session, make_user, make_vendor):
    headers = _make_admin_headers(client, make_user)
    product = _make_product(db_session)
    vendor = make_vendor()
    customer = make_user(email="deletemember4@example.com", password="testpass123")

    sale = models.SaleTransaction(
        vendor_id=vendor.id,
        customer_id=customer.id,
        product_id=product.id,
        amount_ils=100.0,
        idempotency_key="delete-test-key-1",
        commission_rate_percent_snapshot=5.0,
        commission_owed_ils=5.0,
    )
    db_session.add(sale)
    db_session.commit()

    resp = client.delete(f"/admin/products/{product.id}", headers=headers)
    assert resp.status_code == 409
    assert db_session.query(models.Product).filter(models.Product.id == product.id).first() is not None


def test_delete_cleans_up_reviews_and_promotion_assignment_without_deleting_the_promotion(client, db_session, make_user):
    """Verifies the ORM-cascade claim rather than assuming it: Product.reviews has
    cascade='all, delete-orphan' declared, and the product_promotions secondary table is
    auto-managed by SQLAlchemy on delete of either side — neither should leave an orphaned row,
    and the Promotion itself (not cascade-configured to be deleted) must survive."""
    headers = _make_admin_headers(client, make_user)
    product = _make_product(db_session)
    member = make_user(email="deletemember5@example.com", password="testpass123")

    review = models.Review(user_id=member.id, product_id=product.id, rating=5, comment="מעולה")
    db_session.add(review)

    promotion = models.Promotion(name_he="מבצע", type="percentage_discount", channel="online", config={"percentage": 10})
    db_session.add(promotion)
    db_session.commit()
    db_session.refresh(promotion)
    db_session.refresh(product)

    promotion.products.append(product)
    db_session.commit()
    promotion_id = promotion.id

    resp = client.delete(f"/admin/products/{product.id}", headers=headers)
    assert resp.status_code == 200

    assert db_session.query(models.Product).filter(models.Product.id == product.id).first() is None
    assert db_session.query(models.Review).filter(models.Review.product_id == product.id).first() is None
    assoc_count = db_session.execute(
        models.product_promotions_table.select().where(models.product_promotions_table.c.product_id == product.id)
    ).first()
    assert assoc_count is None

    # The promotion itself must survive — only the association row and the product are gone.
    assert db_session.query(models.Promotion).filter(models.Promotion.id == promotion_id).first() is not None
