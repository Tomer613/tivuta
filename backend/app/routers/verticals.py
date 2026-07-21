import os
from typing import List, Optional

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
