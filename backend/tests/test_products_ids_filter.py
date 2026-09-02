from app import models


def _make_product(db_session, vertical="diamonds", title="מוצר", price=100.0, is_active=True):
    product = models.Product(vertical=vertical, title_he=title, description_he="תיאור", price=price, is_active=is_active)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def test_products_ids_filter_returns_only_requested_products(client, db_session):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    a = _make_product(db_session, title="א")
    b = _make_product(db_session, title="ב")
    _make_product(db_session, title="לא נבחר")  # never requested — must not appear

    resp = client.get(f"/products?ids={a.id},{b.id}")
    assert resp.status_code == 200
    ids = {p["id"] for p in resp.json()}
    assert ids == {a.id, b.id}


def test_products_ids_filter_excludes_inactive_products(client, db_session):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    active = _make_product(db_session, title="פעיל")
    inactive = _make_product(db_session, title="לא פעיל", is_active=False)

    resp = client.get(f"/products?ids={active.id},{inactive.id}")
    ids = {p["id"] for p in resp.json()}
    assert ids == {active.id}


def test_products_ids_filter_rejects_non_numeric_ids(client, db_session):
    resp = client.get("/products?ids=abc,1")
    assert resp.status_code == 400
