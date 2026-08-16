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
