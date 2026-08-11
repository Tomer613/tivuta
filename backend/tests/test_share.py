from app import models


def _make_product(db_session, **kwargs):
    product = models.Product(
        vertical="diamonds",
        title_he=kwargs.pop("title_he", "טבעת יהלום"),
        description_he=kwargs.pop("description_he", "תיאור המוצר"),
        **kwargs,
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def test_share_product_returns_correct_title_and_image(client, db_session):
    product = _make_product(
        db_session,
        title_he="טבעת יהלום מיוחדת",
        image_url="https://xxx.supabase.co/storage/v1/object/public/product-images/abc.jpg",
        price=1500.0,
    )

    resp = client.get(f"/share/products/{product.id}?locale=he")
    assert resp.status_code == 200
    body = resp.text

    assert "טבעת יהלום מיוחדת" in body
    assert 'og:image" content="https://xxx.supabase.co/storage/v1/object/public/product-images/abc.jpg"' in body
    assert f"https://www.tivuta.co.il/he/products?id={product.id}" in body
    assert resp.headers["X-Robots-Tag"] == "noindex"
    assert "default-src 'self'" in resp.headers["Content-Security-Policy"]


def test_share_product_escapes_html_special_characters(client, db_session):
    product = _make_product(
        db_session,
        title_he='<script>alert("xss")</script>',
        description_he="תיאור & <b>מודגש</b>",
    )

    resp = client.get(f"/share/products/{product.id}?locale=he")
    assert resp.status_code == 200
    body = resp.text

    assert "<script>alert" not in body
    assert "&lt;script&gt;" in body
    assert "&amp;" in body


def test_share_nonexistent_product_still_returns_valid_redirect_page(client, db_session):
    resp = client.get("/share/products/999999?locale=he")
    assert resp.status_code == 200
    assert "https://www.tivuta.co.il/he/products?id=999999" in resp.text
    assert resp.headers["X-Robots-Tag"] == "noindex"


def test_share_product_falls_back_to_hebrew_for_invalid_locale(client, db_session):
    product = _make_product(db_session, title_he="מוצר בעברית")

    resp = client.get(f"/share/products/{product.id}?locale=xx")
    assert resp.status_code == 200
    assert 'lang="he"' in resp.text
    assert f"https://www.tivuta.co.il/he/products?id={product.id}" in resp.text
