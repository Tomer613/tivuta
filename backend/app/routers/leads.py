from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..security import get_current_admin, get_current_user, get_db
from ..services import get_email_sender

router = APIRouter(tags=["leads"])

CONFIRMATION_SUBJECT = {
    "he": "אישור פנייה - TIVUTA",
    "en": "Request confirmation - TIVUTA",
    "fr": "Confirmation de demande - TIVUTA",
    "yi": "באשטעטיגונג - TIVUTA",
}


def _confirmation_body(locale: str, product_title: str, scheduled_at):
    if scheduled_at:
        if locale == "he":
            return f"<p>תודה שקבעת פגישה להתרשמות עבור <strong>{product_title}</strong>.</p><p>נציג שלנו ייצור איתך קשר לאישור הפרטים.</p>"
        return f"<p>Thank you for scheduling an appointment for <strong>{product_title}</strong>.</p><p>Our representative will contact you to confirm the details.</p>"
    if locale == "he":
        return f"<p>תודה על פנייתך בנושא <strong>{product_title}</strong>.</p><p>נציג שלנו ייצור איתך קשר בהקדם.</p>"
    return f"<p>Thank you for your interest in <strong>{product_title}</strong>.</p><p>Our representative will reach out to you shortly.</p>"


@router.post("/leads", response_model=schemas.LeadRead)
def create_lead(payload: schemas.LeadCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    locale = payload.locale or "he"
    lead_type = "appointment" if (product.vertical == "diamonds" and payload.scheduled_at) else "contact_request"

    new_lead = models.Lead(
        user_id=current_user.id,
        product_id=product.id,
        lead_type=lead_type,
        scheduled_at=payload.scheduled_at,
        status="new",
        channel="web",
        notes=payload.notes,
        locale=locale,
    )
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)

    product_title = getattr(product, f"title_{locale}", None) or product.title_he
    get_email_sender().send(
        to=current_user.email,
        subject=CONFIRMATION_SUBJECT.get(locale, CONFIRMATION_SUBJECT["he"]),
        html_body=_confirmation_body(locale, product_title, payload.scheduled_at),
        locale=locale,
    )

    return new_lead


@router.get("/leads/me", response_model=List[schemas.LeadRead])
def my_leads(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Lead).filter(models.Lead.user_id == current_user.id).order_by(models.Lead.created_at.desc()).all()


@router.get("/users/me/activity", response_model=List[schemas.LeadHistoryRead])
def my_activity(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    leads = (
        db.query(models.Lead)
        .options(selectinload(models.Lead.product))
        .filter(models.Lead.user_id == current_user.id)
        .order_by(models.Lead.created_at.desc())
        .all()
    )
    result = []
    for lead in leads:
        result.append(schemas.LeadHistoryRead(
            id=lead.id,
            lead_type=lead.lead_type,
            scheduled_at=lead.scheduled_at,
            status=lead.status,
            created_at=lead.created_at,
            product_id=lead.product_id,
            product_title_he=lead.product.title_he if lead.product else None,
            product_vertical=lead.product.vertical if lead.product else None,
            product_image_url=lead.product.image_url if lead.product else None,
            product_price=lead.product.price if lead.product else None,
        ))
    return result


@router.get("/admin/leads", response_model=List[schemas.LeadRead], dependencies=[Depends(get_current_admin)])
def admin_list_leads(db: Session = Depends(get_db)):
    return db.query(models.Lead).order_by(models.Lead.created_at.desc()).all()
