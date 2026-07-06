import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import SessionLocal
from ..security import get_current_admin, get_db
from ..services import get_email_sender, get_whatsapp_sender

router = APIRouter(tags=["distributions"])

APP_BASE_URL = os.environ.get("APP_BASE_URL", "https://tivuta.co.il")


# ─── Rich email builders ───────────────────────────────────────────────────────

def _email_wrapper(inner_html: str) -> str:
    return f"""<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111a2f;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <p style="color:#d4af37;font-weight:900;font-size:22px;margin:0 0 24px 0;letter-spacing:2px;">TIVUTA</p>
    <div style="background:#0e1628;border-radius:24px;padding:36px;border:1px solid rgba(212,175,55,0.25);">
      {inner_html}
    </div>
    <p style="color:#f0e6d3;opacity:0.3;font-size:11px;text-align:center;margin-top:24px;">
      הודעה זו נשלחה מ-Tivuta. לביטול הרשמה פנה אלינו.
    </p>
  </div>
</body>
</html>"""


def _build_survey_email(survey: models.Survey, survey_url: str, product_image_url: Optional[str]) -> str:
    img_block = (
        f'<div style="margin:0 0 28px 0;border-radius:16px;overflow:hidden;">'
        f'<img src="{product_image_url}" alt="מוצר" style="width:100%;display:block;" /></div>'
    ) if product_image_url else ''

    options_html = ''.join(
        f'<div style="background:#111a2f;border-radius:12px;padding:12px 16px;margin:8px 0;">'
        f'<span style="color:#f0e6d3;font-size:15px;">{opt.label_override_he or f"אפשרות {i + 1}"}</span>'
        f'</div>'
        for i, opt in enumerate(survey.options)
    )

    inner = f"""
    <p style="color:#d4af37;font-size:13px;margin:0 0 12px 0;font-weight:700;">סקר חדש מחכה לך 🗳️</p>
    {img_block}
    <h2 style="color:#f0e6d3;font-size:20px;line-height:1.5;margin:0 0 20px 0;">{survey.question_he}</h2>
    <div style="margin:0 0 28px 0;">{options_html}</div>
    <div style="text-align:center;">
      <a href="{survey_url}"
         style="display:inline-block;background:#d4af37;color:#080d1f;padding:14px 36px;
                border-radius:50px;text-decoration:none;font-weight:900;font-size:16px;">
        לחץ להצביע
      </a>
    </div>
    <p style="color:#f0e6d3;opacity:0.35;font-size:11px;text-align:center;margin:20px 0 0 0;">
      {survey_url}
    </p>"""
    return _email_wrapper(inner)


def _build_deal_email(product: models.Product, product_url: str) -> str:
    img_block = (
        f'<div style="margin:0 0 28px 0;border-radius:16px;overflow:hidden;">'
        f'<img src="{APP_BASE_URL}/images/products/{product.image_url}" alt="{product.title_he}"'
        f' style="width:100%;display:block;" /></div>'
    ) if product.image_url else ''

    price_text = f'₪{int(product.price):,}' if product.price else 'לפי בקשה'

    inner = f"""
    <p style="color:#d4af37;font-size:13px;margin:0 0 12px 0;font-weight:700;">דיל מיוחד עבורך ✨</p>
    {img_block}
    <h2 style="color:#f0e6d3;font-size:20px;line-height:1.5;margin:0 0 8px 0;">{product.title_he}</h2>
    <p style="color:#d4af37;font-size:28px;font-weight:900;margin:0 0 28px 0;">{price_text}</p>
    <div style="text-align:center;">
      <a href="{product_url}"
         style="display:inline-block;background:#d4af37;color:#080d1f;padding:14px 36px;
                border-radius:50px;text-decoration:none;font-weight:900;font-size:16px;">
        לפרטים ורכישה
      </a>
    </div>"""
    return _email_wrapper(inner)


def _build_fallback_email(subject: str, message: str) -> str:
    inner = f"""
    <h2 style="color:#f0e6d3;font-size:20px;margin:0 0 16px 0;">{subject}</h2>
    <p style="color:#f0e6d3;opacity:0.8;font-size:15px;line-height:1.7;">{message}</p>
    <p style="margin-top:24px;">
      <a href="{APP_BASE_URL}" style="color:#d4af37;font-weight:700;">לאתר Tivuta</a>
    </p>"""
    return _email_wrapper(inner)


# ─── Background send task ──────────────────────────────────────────────────────

def _send_distribution(distribution_id: int) -> None:
    """Fans out to every member user on the requested channels. Runs in a background thread."""
    db = SessionLocal()
    try:
        distribution = db.query(models.Distribution).filter(models.Distribution.id == distribution_id).first()
        if not distribution:
            return

        distribution.status = "sending"
        db.commit()

        subject = distribution.title_he or "TIVUTA"
        message = distribution.message_he or ""
        email_html: Optional[str] = None
        whatsapp_text: str = f"{subject}\n{message}".strip() if message else subject

        # Build rich content
        if distribution.distribution_type == "survey" and distribution.survey_id:
            survey = db.query(models.Survey).filter(models.Survey.id == distribution.survey_id).first()
            if survey:
                survey_url = f"{APP_BASE_URL}/he/survey/{survey.id}"
                product_image_url: Optional[str] = None
                for opt in survey.options:
                    if opt.product_id:
                        p = db.query(models.Product).filter(models.Product.id == opt.product_id).first()
                        if p and p.image_url:
                            product_image_url = f"{APP_BASE_URL}/images/products/{p.image_url}"
                            break
                email_html = _build_survey_email(survey, survey_url, product_image_url)
                intro = f"{message}\n\n" if message else ""
                whatsapp_text = f"{intro}{subject}\n{survey.question_he}\n\nלחץ להצביע:\n{survey_url}"

        elif distribution.distribution_type == "daily_deal" and distribution.product_id:
            product = db.query(models.Product).filter(models.Product.id == distribution.product_id).first()
            if product:
                product_url = f"{APP_BASE_URL}/he/products/{product.id}"
                email_html = _build_deal_email(product, product_url)
                price_text = f'₪{int(product.price):,}' if product.price else 'לפי בקשה'
                intro = f"{message}\n\n" if message else ""
                whatsapp_text = f"{intro}{product.title_he} — {price_text}\n\nלפרטים:\n{product_url}"

        if not email_html:
            email_html = _build_fallback_email(subject, message)

        # Only send to member users (not admins); apply segmentation filters
        user_query = db.query(models.User).filter(models.User.role == "member")
        if distribution.filter_city:
            user_query = user_query.filter(models.User.city == distribution.filter_city)
        users = user_query.all()
        if distribution.filter_membership_track:
            track = distribution.filter_membership_track
            users = [u for u in users if u.membership_tracks and track in u.membership_tracks]
        email_sender = get_email_sender()
        whatsapp_sender = get_whatsapp_sender()

        actual_sends = 0
        actual_failures = 0

        for user in users:
            for channel in distribution.channels:
                log = models.DistributionSendLog(
                    distribution_id=distribution.id,
                    user_id=user.id,
                    channel=channel,
                )
                try:
                    if channel == "email":
                        result = email_sender.send(
                            to=user.email,
                            subject=subject,
                            html_body=email_html,
                            locale="he",
                        )
                    elif channel == "whatsapp":
                        if not user.phone:
                            log.status = "skipped"
                            log.error = "No phone number"
                            db.add(log)
                            continue
                        result = whatsapp_sender.send(to_phone=user.phone, text=whatsapp_text)
                    else:
                        log.status = "skipped"
                        db.add(log)
                        continue

                    if result.success:
                        log.status = "sent"
                        log.provider_message_id = result.provider_message_id
                        log.sent_at = datetime.utcnow()
                        actual_sends += 1
                    else:
                        log.status = "failed"
                        log.error = result.error
                        actual_failures += 1
                except Exception as e:
                    log.status = "failed"
                    log.error = str(e)
                    actual_failures += 1

                db.add(log)

        # Sent if at least one message went through, or if there was nothing to send.
        # Failed only when every actual send attempt returned an error.
        distribution.status = "sent" if actual_sends > 0 or actual_failures == 0 else "failed"
        distribution.sent_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()


# ─── Admin endpoints ───────────────────────────────────────────────────────────

@router.get("/admin/distributions", response_model=List[schemas.DistributionRead], dependencies=[Depends(get_current_admin)])
def admin_list_distributions(db: Session = Depends(get_db)):
    distributions = (
        db.query(models.Distribution)
        .options(
            selectinload(models.Distribution.send_logs),
            selectinload(models.Distribution.survey),
            selectinload(models.Distribution.product),
        )
        .order_by(models.Distribution.created_at.desc())
        .all()
    )

    result = []
    for dist in distributions:
        sent_count = sum(1 for log in dist.send_logs if log.status == "sent")
        failed_count = sum(1 for log in dist.send_logs if log.status == "failed")
        skipped_count = sum(1 for log in dist.send_logs if log.status == "skipped")
        survey_title = (dist.survey.question_he[:60] if dist.survey and dist.survey.question_he else None)
        product_title = dist.product.title_he if dist.product else None
        result.append(
            schemas.DistributionRead.model_validate(dist).model_copy(update={
                "sent_count": sent_count,
                "failed_count": failed_count,
                "skipped_count": skipped_count,
                "survey_title": survey_title,
                "product_title": product_title,
            })
        )
    return result


@router.post("/admin/distributions", response_model=schemas.DistributionRead)
def admin_create_distribution(
    payload: schemas.DistributionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin),
):
    if payload.distribution_type not in ("survey", "daily_deal"):
        raise HTTPException(status_code=400, detail="distribution_type must be 'survey' or 'daily_deal'")

    distribution = models.Distribution(
        distribution_type=payload.distribution_type,
        survey_id=payload.survey_id,
        product_id=payload.product_id,
        title_he=payload.title_he,
        message_he=payload.message_he,
        channels=payload.channels,
        scheduled_at=payload.scheduled_at,
        filter_membership_track=payload.filter_membership_track,
        filter_city=payload.filter_city,
        created_by=current_user.id,
    )
    db.add(distribution)
    db.commit()
    db.refresh(distribution)
    return distribution


@router.post("/admin/distributions/{distribution_id}/send", dependencies=[Depends(get_current_admin)])
def admin_send_distribution(distribution_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    distribution = db.query(models.Distribution).filter(models.Distribution.id == distribution_id).first()
    if not distribution:
        raise HTTPException(status_code=404, detail="Distribution not found")
    if distribution.status != "draft":
        raise HTTPException(status_code=400, detail="ניתן לשלוח רק הפצות במצב טיוטה")
    background_tasks.add_task(_send_distribution, distribution_id)
    return {"message": "Distribution send started"}


@router.get("/admin/distributions/{distribution_id}/preview", dependencies=[Depends(get_current_admin)])
def admin_preview_distribution(distribution_id: int, db: Session = Depends(get_db)):
    distribution = (
        db.query(models.Distribution)
        .options(selectinload(models.Distribution.survey), selectinload(models.Distribution.product))
        .filter(models.Distribution.id == distribution_id)
        .first()
    )
    if not distribution:
        raise HTTPException(status_code=404, detail="Distribution not found")

    subject = distribution.title_he or "TIVUTA"
    message = distribution.message_he or ""
    html = None

    if distribution.distribution_type == "survey" and distribution.survey_id and distribution.survey:
        survey = distribution.survey
        survey_url = f"{APP_BASE_URL}/he/survey/{survey.id}"
        product_image_url: Optional[str] = None
        for opt in survey.options:
            if opt.product_id:
                p = db.query(models.Product).filter(models.Product.id == opt.product_id).first()
                if p and p.image_url:
                    product_image_url = f"{APP_BASE_URL}/images/products/{p.image_url}"
                    break
        html = _build_survey_email(survey, survey_url, product_image_url)
    elif distribution.distribution_type == "daily_deal" and distribution.product_id and distribution.product:
        product = distribution.product
        product_url = f"{APP_BASE_URL}/he/{product.vertical}?product={product.id}"
        html = _build_deal_email(product, product_url)

    if not html:
        html = _build_fallback_email(subject, message)

    # Count target audience
    user_query = db.query(models.User).filter(models.User.role == "member")
    if distribution.filter_city:
        user_query = user_query.filter(models.User.city == distribution.filter_city)
    users = user_query.all()
    if distribution.filter_membership_track:
        track = distribution.filter_membership_track
        users = [u for u in users if u.membership_tracks and track in u.membership_tracks]

    return {"html": html, "subject": subject, "recipient_count": len(users)}


@router.delete("/admin/distributions/{distribution_id}", dependencies=[Depends(get_current_admin)])
def admin_delete_distribution(distribution_id: int, db: Session = Depends(get_db)):
    distribution = db.query(models.Distribution).filter(models.Distribution.id == distribution_id).first()
    if not distribution:
        raise HTTPException(status_code=404, detail="Distribution not found")
    if distribution.status != "draft":
        raise HTTPException(status_code=400, detail="ניתן למחוק רק טיוטות")
    db.delete(distribution)
    db.commit()
    return {"message": "deleted"}
