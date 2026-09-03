import os
from typing import Dict, List, Optional, Set, Tuple

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..security import get_current_admin, get_db
from ..services import get_email_sender
from ..services.deploy_trigger import trigger_frontend_redeploy

router = APIRouter(tags=["verticals"])

ADMIN_NOTIFICATION_EMAIL = os.environ.get("ADMIN_NOTIFICATION_EMAIL", "support@tivuta.co.il")


def validate_vertical_slug(db: Session, slug: str) -> None:
    """Shared by products.py and vendors.py — a product/vendor's vertical must be an active,
    admin-defined world. Kept in one place so the two reporting-adjacent routers can't drift."""
    exists = (
        db.query(models.Vertical.id)
        .filter(models.Vertical.slug == slug, models.Vertical.is_active == True)
        .first()
    )
    if not exists:
        raise HTTPException(status_code=400, detail=f"Unknown or inactive vertical: {slug}")


def resolve_vertical_label(vertical: models.Vertical, locale: str) -> str:
    """Shared by leads.py and shopping_list.py's reminder emails — the recipient's own preferred
    language's label, falling back to Hebrew for a locale the vertical has no translation for.
    Kept in one place so the fallback rule can't drift between the two reminder features."""
    return getattr(vertical, f"label_{locale}", None) or vertical.label_he


def batch_users_and_verticals(
    db: Session, user_ids: Set[int], vertical_slugs: Set[str]
) -> Tuple[Dict[int, models.User], Dict[str, models.Vertical]]:
    """Shared by the two per-(user, vertical) reminder/nudge cron jobs (leads.py's
    _send_order_cadence_nudges, shopping_list.py's _send_weekly_shopping_list_reminders) — one
    batched fetch upfront instead of querying User/Vertical inside each candidate's loop iteration."""
    users_by_id = {u.id: u for u in db.query(models.User).filter(models.User.id.in_(user_ids)).all()}
    verticals_by_slug = {v.slug: v for v in db.query(models.Vertical).filter(models.Vertical.slug.in_(vertical_slugs)).all()}
    return users_by_id, verticals_by_slug


def user_can_use_gabbai_vertical(vertical: models.Vertical, user: models.User) -> bool:
    """A user is eligible to actively use a `requires_gabbai` world only while they're currently
    is_gabbai — a user who has since self-deactivated (see users.py's deactivate_gabbai) must never
    be treated as eligible just because their past orders/lists were placed while they still were.
    A non-`requires_gabbai` vertical is always fine regardless of gabbai status. Shared by both
    reminder/nudge crons (leads.py's _send_order_cadence_nudges, shopping_list.py's
    _send_weekly_shopping_list_reminders) so the eligibility rule can't drift between them — one of
    the two call sites only ever sees already-gabbai-only orders in practice, but stating the rule
    explicitly here means that stays true by construction, not by an unstated assumption at the
    call site."""
    return not vertical.requires_gabbai or user.is_gabbai


def _notify_and_redeploy(vertical: models.Vertical, action: str) -> None:
    """Fires the GitHub Actions redeploy + an admin confirmation email. Both are best-effort:
    a GitHub API hiccup or email-provider outage should never fail the admin's save."""
    try:
        trigger_frontend_redeploy()
    except Exception:
        pass
    try:
        get_email_sender().send(
            to=ADMIN_NOTIFICATION_EMAIL,
            subject=f"עולם {action} — דיפלוי הופעל אוטומטית: {vertical.label_he}",
            html_body=(
                f'<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;">'
                f'<h2 style="color:#b8860b;">עולם {action} 🌍</h2>'
                f'<p><strong>שם:</strong> {vertical.label_he} ({vertical.slug})</p>'
                f'<p>דיפלוי מחדש של הפרונט הופעל אוטומטית ב-GitHub Actions.</p>'
                f'</div>'
            ),
            locale="he",
        )
    except Exception:
        pass


@router.get("/verticals", response_model=List[schemas.VerticalRead])
def list_verticals(db: Session = Depends(get_db)):
    return (
        db.query(models.Vertical)
        .filter(models.Vertical.is_active == True)
        .order_by(models.Vertical.display_order.asc())
        .all()
    )


@router.get("/admin/verticals", response_model=List[schemas.VerticalRead], dependencies=[Depends(get_current_admin)])
def admin_list_verticals(db: Session = Depends(get_db)):
    return db.query(models.Vertical).order_by(models.Vertical.display_order.asc()).all()


@router.post("/admin/verticals", response_model=schemas.VerticalRead, dependencies=[Depends(get_current_admin)])
def admin_create_vertical(vertical_in: schemas.VerticalCreate, db: Session = Depends(get_db)):
    if db.query(models.Vertical.id).filter(models.Vertical.slug == vertical_in.slug).first():
        raise HTTPException(status_code=409, detail="A vertical with this slug already exists")
    new_vertical = models.Vertical(**vertical_in.model_dump())
    db.add(new_vertical)
    db.commit()
    db.refresh(new_vertical)
    _notify_and_redeploy(new_vertical, "חדש נוסף")
    return new_vertical


@router.patch("/admin/verticals/{vertical_id}", response_model=schemas.VerticalRead, dependencies=[Depends(get_current_admin)])
def admin_update_vertical(vertical_id: int, vertical_in: schemas.VerticalUpdate, db: Session = Depends(get_db)):
    vertical = db.query(models.Vertical).filter(models.Vertical.id == vertical_id).first()
    if not vertical:
        raise HTTPException(status_code=404, detail="Vertical not found")
    update_data = vertical_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vertical, key, value)
    db.commit()
    db.refresh(vertical)
    _notify_and_redeploy(vertical, "עודכן")
    return vertical
