from datetime import datetime, timedelta

from app import models


def test_track_pageview_creates_row_no_auth_required(client, db_session):
    resp = client.post("/analytics/pageview", json={
        "path": "/he/world?slug=diamonds",
        "locale": "he",
        "visitor_id": "abc-123",
        "referrer": "",
    })
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}

    row = db_session.query(models.PageView).first()
    assert row is not None
    assert row.path == "/he/world?slug=diamonds"
    assert row.locale == "he"
    assert row.visitor_id == "abc-123"


def test_admin_analytics_summary_aggregates_correctly(client, db_session, make_user):
    make_user(email="analyticsadmin@example.com", password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": "analyticsadmin@example.com", "password": "adminpass123"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    now = datetime.utcnow()
    rows = [
        # Today, two distinct visitors, two different products under the same base path.
        models.PageView(path="/he/products?id=1", locale="he", visitor_id="v1", created_at=now),
        models.PageView(path="/he/products?id=2", locale="he", visitor_id="v2", created_at=now),
        # 3 days ago (within 7d and 30d, not "today"), repeat visitor v1.
        models.PageView(path="/he/world?slug=diamonds", locale="en", visitor_id="v1", created_at=now - timedelta(days=3)),
        # 20 days ago (within 30d only).
        models.PageView(path="/he/products?id=1", locale="he", visitor_id="v3", created_at=now - timedelta(days=20)),
        # 40 days ago (outside every window) — must not be counted anywhere.
        models.PageView(path="/he/products?id=1", locale="he", visitor_id="v4", created_at=now - timedelta(days=40)),
    ]
    db_session.add_all(rows)
    db_session.commit()

    resp = client.get("/admin/analytics/summary?days=30", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["totals"]["pageviews_today"] == 2
    assert data["totals"]["unique_visitors_today"] == 2
    assert data["totals"]["pageviews_7d"] == 3
    assert data["totals"]["unique_visitors_7d"] == 2  # v1 counted once despite 2 hits
    assert data["totals"]["pageviews_30d"] == 4  # excludes the 40-day-old row
    assert data["totals"]["unique_visitors_30d"] == 3

    # Top pages grouped on the base path — the two /he/products?id=... hits collapse into one entry.
    top_pages = {p["path"]: p["count"] for p in data["top_pages"]}
    assert top_pages["/he/products"] == 3
    assert top_pages["/he/world"] == 1

    assert data["locale_breakdown"]["he"] == 3
    assert data["locale_breakdown"]["en"] == 1

    # Trend covers exactly `days` entries, zero-filled for days with no traffic.
    assert len(data["trend"]) == 30


def test_admin_analytics_summary_30d_totals_correct_even_with_shorter_trend_window(client, db_session, make_user):
    """Regression test: the 7d/30d totals must always cover their fixed windows regardless of the
    `days` query param (which only controls the trend chart's length, and defaults to 14 on the
    admin page) — the row-loading window has to cover whichever is larger, or a `days=14` request
    would silently exclude rows the 30-day totals still need to see."""
    make_user(email="analyticsadmin2@example.com", password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": "analyticsadmin2@example.com", "password": "adminpass123"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    now = datetime.utcnow()
    db_session.add_all([
        models.PageView(path="/he/", locale="he", visitor_id="v1", created_at=now),
        # 20 days ago — outside a 14-day trend window, but must still count toward pageviews_30d.
        models.PageView(path="/he/", locale="he", visitor_id="v2", created_at=now - timedelta(days=20)),
    ])
    db_session.commit()

    resp = client.get("/admin/analytics/summary?days=14", headers=headers)  # the frontend's actual default
    assert resp.status_code == 200
    data = resp.json()

    assert data["totals"]["pageviews_30d"] == 2
    assert data["totals"]["unique_visitors_30d"] == 2
    assert len(data["trend"]) == 14
