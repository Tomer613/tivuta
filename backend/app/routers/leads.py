import os
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..security import get_current_admin, get_current_user, get_db
from ..services import get_email_sender

router = APIRouter(tags=["leads"])

# ── Change this env-var in production to redirect admin notifications ──────────
ADMIN_NOTIFICATION_EMAIL = os.environ.get("ADMIN_NOTIFICATION_EMAIL", "support@tivuta.co.il")

CONFIRMATION_SUBJECT = {
    "he": "אישור פנייה - TIVUTA",
    "en": "Request confirmation - TIVUTA",
    "fr": "Confirmation de demande - TIVUTA",
    "yi": "באשטעטיגונג - TIVUTA",
}


def _admin_notification_body(user: models.User, product_title: str, lead_type: str, scheduled_at) -> str:
    type_label = "פגישה" if lead_type == "appointment" else "פנייה"
    scheduled_line = f"<p><strong>מועד פגישה:</strong> {scheduled_at}</p>" if scheduled_at else ""
    return f"""
    <div dir="rtl" style="font-family:Arial,sans-serif;color:#111;">
      <h2 style="color:#b8860b;">פנייה חדשה ב-TIVUTA 🔔</h2>
      <p><strong>סוג:</strong> {type_label}</p>
      <p><strong>מוצר:</strong> {product_title}</p>
      <hr/>
      <p><strong>שם:</strong> {user.first_name} {user.last_name}</p>
      <p><strong>מייל:</strong> <a href="mailto:{user.email}">{user.email}</a></p>
      <p><strong>טלפון:</strong> {user.phone or '—'}</p>
      {scheduled_line}
    </div>"""


STATUS_EMAIL_SUBJECT: dict[str, dict[str, str]] = {
    "confirmed": {"he": "הפנייה שלך אושרה — TIVUTA", "en": "Your request confirmed — TIVUTA", "fr": "Votre demande confirmée — TIVUTA", "yi": "אייער פנייה איז באשטעטיגט — TIVUTA"},
    "contacted": {"he": "הפנייה שלך טופלה — TIVUTA", "en": "Your request handled — TIVUTA", "fr": "Votre demande traitée — TIVUTA", "yi": "אייער פנייה איז באהאנדלט — TIVUTA"},
}


def _status_update_body(locale: str, product_title: str, status: str) -> str:
    if status == "confirmed":
        if locale == "he":
            return f'<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;"><p>שמחים לבשר שהפנייה שלך לגבי <strong>{product_title}</strong> אושרה.</p><p>נציג שלנו ייצור איתך קשר בקרוב לתיאום הפרטים.</p></div>'
        return f"<p>Your request regarding <strong>{product_title}</strong> has been confirmed. Our representative will contact you soon.</p>"
    if status == "contacted":
        if locale == "he":
            return f'<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;"><p>הפנייה שלך לגבי <strong>{product_title}</strong> טופלה.</p><p>אנו מקווים שהשירות עמד בציפיותיך. לשאלות נוספות, פנה אלינו בכל עת.</p></div>'
        return f"<p>Your request regarding <strong>{product_title}</strong> has been handled. We hope the service met your expectations.</p>"
    return ""


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
    email_sender = get_email_sender()

    # Confirmation to the user
    email_sender.send(
        to=current_user.email,
        subject=CONFIRMATION_SUBJECT.get(locale, CONFIRMATION_SUBJECT["he"]),
        html_body=_confirmation_body(locale, product_title, payload.scheduled_at),
        locale=locale,
    )

    # Notification to admin
    lead_type_label = "appointment" if (product.vertical == "diamonds" and payload.scheduled_at) else "contact_request"
    email_sender.send(
        to=ADMIN_NOTIFICATION_EMAIL,
        subject=f"פנייה חדשה: {product_title} — {current_user.first_name} {current_user.last_name}",
        html_body=_admin_notification_body(current_user, product_title, lead_type_label, payload.scheduled_at),
        locale="he",
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


@router.get("/admin/leads", response_model=List[schemas.AdminLeadRead], dependencies=[Depends(get_current_admin)])
def admin_list_leads(db: Session = Depends(get_db)):
    leads = (
        db.query(models.Lead)
        .options(selectinload(models.Lead.product), selectinload(models.Lead.user))
        .order_by(models.Lead.created_at.desc())
        .all()
    )
    result = []
    for lead in leads:
        user = lead.user
        product = lead.product
        result.append(schemas.AdminLeadRead(
            id=lead.id,
            lead_type=lead.lead_type,
            scheduled_at=lead.scheduled_at,
            status=lead.status,
            channel=lead.channel,
            notes=lead.notes,
            created_at=lead.created_at,
            user_id=lead.user_id,
            user_name=f"{user.first_name} {user.last_name}".strip() if user else None,
            user_email=user.email if user else None,
            user_phone=user.phone if user else None,
            product_id=lead.product_id,
            product_title_he=product.title_he if product else None,
            product_vertical=product.vertical if product else None,
        ))
    return result


@router.patch("/admin/leads/{lead_id}/notes", response_model=schemas.LeadRead, dependencies=[Depends(get_current_admin)])
def admin_update_lead_notes(lead_id: int, payload: schemas.LeadNotesUpdate, db: Session = Depends(get_db)):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.notes = payload.notes
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/admin/leads/stats", dependencies=[Depends(get_current_admin)])
def admin_lead_stats(days: int = 14, db: Session = Depends(get_db)):
    from datetime import timedelta
    since = datetime.utcnow() - timedelta(days=days)
    leads = db.query(models.Lead).filter(models.Lead.created_at >= since).all()
    counts: dict = {}
    for i in range(days):
        d = (datetime.utcnow() - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        counts[d] = 0
    for lead in leads:
        d = lead.created_at.strftime("%Y-%m-%d")
        if d in counts:
            counts[d] += 1
    return [{"date": k, "count": v} for k, v in sorted(counts.items())]


@router.patch("/admin/leads/{lead_id}/status", response_model=schemas.LeadRead, dependencies=[Depends(get_current_admin)])
def admin_update_lead_status(lead_id: int, status: str, db: Session = Depends(get_db)):
    valid = {"new", "confirmed", "contacted", "closed"}
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid}")
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    old_status = lead.status
    lead.status = status
    db.commit()
    db.refresh(lead)

    if status in ("confirmed", "contacted") and old_status != status:
        user = db.query(models.User).filter(models.User.id == lead.user_id).first()
        product = db.query(models.Product).filter(models.Product.id == lead.product_id).first()
        if user and product:
            locale = lead.locale or "he"
            product_title = getattr(product, f"title_{locale}", None) or product.title_he
            body = _status_update_body(locale, product_title, status)
            if body:
                subject = STATUS_EMAIL_SUBJECT[status].get(locale, STATUS_EMAIL_SUBJECT[status]["he"])
                try:
                    get_email_sender().send(to=user.email, subject=subject, html_body=body, locale=locale)
                except Exception:
                    pass  # don't fail the status update if email fails

    return lead
