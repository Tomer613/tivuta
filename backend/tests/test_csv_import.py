import io

from app import models


def _make_admin_headers(client, make_user, email="csvadmin@example.com"):
    make_user(email=email, password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": email, "password": "adminpass123"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _upload(client, headers, csv_text: str):
    return client.post(
        "/admin/products/import-csv",
        headers=headers,
        files={"file": ("products.csv", io.BytesIO(csv_text.encode("utf-8-sig")), "text/csv")},
    )


def test_import_csv_with_new_optional_columns(client, db_session, make_user):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    headers = _make_admin_headers(client, make_user)

    vendor = models.Vendor(vertical="diamonds", name_he="ספק")
    category = models.ProductCategory(vertical="diamonds", label_he="טבעות")
    db_session.add_all([vendor, category])
    db_session.commit()
    db_session.refresh(vendor)
    db_session.refresh(category)

    bundle_resp = client.post(
        "/admin/quantity-discounts",
        json={"name_he": "מבצע", "tiers": [{"min_quantity": 3, "discount_percent": 10}]},
        headers=headers,
    )
    bundle_id = bundle_resp.json()["id"]

    csv_text = (
        "vertical,title_he,description_he,price,sale_price,vendor_id,category_id,quantity_discount_bundle_id\n"
        f"diamonds,טבעת מיובאת,תיאור,1000,800,{vendor.id},{category.id},{bundle_id}\n"
    )
    resp = _upload(client, headers, csv_text)
    assert resp.status_code == 200
    imported = resp.json()
    assert len(imported) == 1
    row = imported[0]
    assert row["sale_price"] == 800
    assert row["vendor_id"] == vendor.id
    assert row["category_id"] == category.id
    assert row["quantity_discount_bundle_id"] == bundle_id


def test_import_csv_skips_row_with_invalid_sale_price_but_keeps_others(client, db_session, make_user):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    headers = _make_admin_headers(client, make_user)

    csv_text = (
        "vertical,title_he,description_he,price,sale_price\n"
        "diamonds,מוצר עם מבצע לא תקין,תיאור,100,150\n"  # sale_price >= price, invalid
        "diamonds,מוצר תקין,תיאור,100,50\n"
    )
    resp = _upload(client, headers, csv_text)
    assert resp.status_code == 200
    imported = resp.json()
    assert len(imported) == 1
    assert imported[0]["title_he"] == "מוצר תקין"


def test_import_csv_skips_row_with_nonexistent_vendor(client, db_session, make_user):
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    headers = _make_admin_headers(client, make_user)

    csv_text = (
        "vertical,title_he,description_he,price,vendor_id\n"
        "diamonds,מוצר עם ספק לא קיים,תיאור,100,999999\n"
    )
    resp = _upload(client, headers, csv_text)
    assert resp.status_code == 400
    assert "999999" in resp.json()["detail"] or "Vendor" in resp.json()["detail"]


def test_import_csv_skips_row_with_non_numeric_id_gracefully(client, db_session, make_user):
    """A malformed numeric column must not crash the whole import batch."""
    db_session.add(models.Vertical(slug="diamonds", label_he="יהלומים", is_active=True))
    db_session.commit()
    headers = _make_admin_headers(client, make_user)

    csv_text = (
        "vertical,title_he,description_he,price,vendor_id\n"
        "diamonds,מוצר עם ספק שגוי,תיאור,100,abc\n"
        "diamonds,מוצר תקין שני,תיאור,100,\n"
    )
    resp = _upload(client, headers, csv_text)
    assert resp.status_code == 200
    imported = resp.json()
    assert len(imported) == 1
    assert imported[0]["title_he"] == "מוצר תקין שני"
