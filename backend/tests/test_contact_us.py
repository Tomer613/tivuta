from app import models


def test_contact_us_creates_order_less_lead_visible_to_admin(client, db_session, make_user):
    """The whole point of POST /leads/contact: unlike every other lead-creating path (appointments,
    cart checkout, card orders), it must NOT wrap the lead in a CustomerOrder — so it shows up in
    GET /admin/leads (the previously-empty Leads/Inquiries tab) instead of GET /admin/orders."""
    make_user(email="contactuser@example.com", password="testpass123")
    make_user(email="contactadmin@example.com", password="adminpass123", role="admin")

    login = client.post("/auth/login", data={"username": "contactuser@example.com", "password": "testpass123"})
    token = login.json()["access_token"]

    resp = client.post(
        "/leads/contact",
        json={"subject": "שאלה על מוצר", "message": "יש לי שאלה כללית, לא קשורה למוצר ספציפי."},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    lead = resp.json()
    assert lead["lead_type"] == "general_inquiry"
    assert lead["customer_order_id"] is None
    assert lead["product_id"] is None

    db_lead = db_session.query(models.Lead).filter(models.Lead.id == lead["id"]).first()
    assert db_lead.subject == "שאלה על מוצר"
    assert db_lead.message == "יש לי שאלה כללית, לא קשורה למוצר ספציפי."

    admin_login = client.post("/auth/login", data={"username": "contactadmin@example.com", "password": "adminpass123"})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    leads_resp = client.get("/admin/leads", headers=admin_headers)
    assert leads_resp.status_code == 200
    admin_leads = leads_resp.json()
    assert any(l["id"] == lead["id"] and l["subject"] == "שאלה על מוצר" for l in admin_leads)

    orders_resp = client.get("/admin/orders", headers=admin_headers)
    assert orders_resp.status_code == 200
    order_lead_ids = {item["id"] for order in orders_resp.json() for item in order["items"]}
    assert lead["id"] not in order_lead_ids
