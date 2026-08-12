import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .. import models, schemas
from ..security import get_current_admin, get_db
from ..services import loyalty

router = APIRouter(tags=["analytics"])


@router.post("/analytics/pageview")
def track_pageview(payload: schemas.PageViewCreate, db: Session = Depends(get_db)):
    """First-party, anonymous pageview log — no auth, mirrors POST /products/{id}/view's
    fire-and-forget shape exactly. Never fails loudly: a malformed/missing field is the caller's
    problem, but there's nothing here worth 500ing a visitor's page load over."""
    db.add(models.PageView(
        path=payload.path,
        locale=payload.locale,
        visitor_id=payload.visitor_id,
        referrer=payload.referrer,
    ))
    db.commit()
    return {"ok": True}


@router.get("/admin/analytics/summary", dependencies=[Depends(get_current_admin)])
def admin_analytics_summary(days: int = 14, db: Session = Depends(get_db)):
    """One query, one response — loads every PageView row in the `days` window once and
    aggregates everything (trend/totals/top_pages/locale_breakdown) from that same result set in
    Python, matching the same shape as GET /admin/leads/stats rather than issuing several
    separate SQL GROUP BY queries."""
    now = datetime.utcnow()
    # The totals below always cover fixed 7d/30d windows regardless of `days` (the trend chart's
    # own length) — the row-loading window must cover whichever is larger, or a `days` value
    # smaller than 30 would silently exclude rows the 30-day totals still need to see.
    since = now - timedelta(days=max(days, 30))
    rows = db.query(models.PageView).filter(models.PageView.created_at >= since).all()

    trend_counts: dict = {}
    for i in range(days):
        d = (now - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        trend_counts[d] = 0

    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    d7_start = now - timedelta(days=7)
    d30_start = now - timedelta(days=30)

    pageviews_today = pageviews_7d = pageviews_30d = 0
    visitors_today: set = set()
    visitors_7d: set = set()
    visitors_30d: set = set()
    top_page_counts: dict = {}
    locale_counts: dict = {}

    for row in rows:
        d = row.created_at.strftime("%Y-%m-%d")
        if d in trend_counts:
            trend_counts[d] += 1

        if row.created_at >= today_start:
            pageviews_today += 1
            if row.visitor_id:
                visitors_today.add(row.visitor_id)
        if row.created_at >= d7_start:
            pageviews_7d += 1
            if row.visitor_id:
                visitors_7d.add(row.visitor_id)
        if row.created_at >= d30_start:
            pageviews_30d += 1
            if row.visitor_id:
                visitors_30d.add(row.visitor_id)

        # Grouped on the path with its query string stripped — an ungrouped top-pages list would
        # otherwise fragment into one row per individual product/vertical query param.
        base_path = row.path.split("?")[0]
        top_page_counts[base_path] = top_page_counts.get(base_path, 0) + 1

        if row.locale:
            locale_counts[row.locale] = locale_counts.get(row.locale, 0) + 1

    top_pages = sorted(top_page_counts.items(), key=lambda kv: kv[1], reverse=True)[:10]

    return {
        "trend": [{"date": k, "count": v} for k, v in sorted(trend_counts.items())],
        "totals": {
            "pageviews_today": pageviews_today,
            "pageviews_7d": pageviews_7d,
            "pageviews_30d": pageviews_30d,
            "unique_visitors_today": len(visitors_today),
            "unique_visitors_7d": len(visitors_7d),
            "unique_visitors_30d": len(visitors_30d),
        },
        "top_pages": [{"path": p, "count": c} for p, c in top_pages],
        "locale_breakdown": locale_counts,
    }


def _prune_old_pageviews(db: Session) -> tuple:
    """Deletes PageView rows older than the configurable page_view_retention_days setting.
    Single atomic bulk delete, no ORM per-row loop — same shape as every other bulk mutation in
    this codebase. Shared by both the admin-triggered and cron entry points below so pruning
    logic can't drift between them."""
    retention_days = loyalty.get_setting_float(db, "page_view_retention_days")
    cutoff = datetime.utcnow() - timedelta(days=retention_days)
    deleted = (
        db.query(models.PageView)
        .filter(models.PageView.created_at < cutoff)
        .delete(synchronize_session=False)
    )
    db.commit()
    return deleted, retention_days


@router.post("/admin/analytics/prune", dependencies=[Depends(get_current_admin)])
def admin_prune_analytics(db: Session = Depends(get_db)):
    """Manual "prune now" trigger — same effect as the daily cron, for an admin who just tuned
    the retention setting and doesn't want to wait for the next scheduled run."""
    deleted, retention_days = _prune_old_pageviews(db)
    return {"deleted": deleted, "retention_days": retention_days}


@router.post("/api/analytics/prune-old-pageviews")
def cron_prune_old_pageviews(request: Request, db: Session = Depends(get_db)):
    """Cron endpoint — called by GitHub Actions daily. Same Authorization: Bearer <CRON_SECRET>
    check as POST /api/distributions/process-scheduled (no admin JWT exists in a cron context)."""
    cron_secret = os.environ.get("CRON_SECRET", "")
    if not cron_secret:
        raise HTTPException(status_code=500, detail="CRON_SECRET is not configured on the server")
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer ") or auth[len("Bearer "):] != cron_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    deleted, retention_days = _prune_old_pageviews(db)
    return {"deleted": deleted, "retention_days": retention_days}
