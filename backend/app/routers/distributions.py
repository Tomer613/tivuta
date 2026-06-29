from datetime import datetime
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import SessionLocal
from ..security import get_current_admin, get_db
from ..services import get_email_sender, get_whatsapp_sender

router = APIRouter(tags=["distributions"])


@router.get("/admin/distributions", response_model=List[schemas.DistributionRead], dependencies=[Depends(get_current_admin)])
def admin_list_distributions(db: Session = Depends(get_db)):
    return db.query(models.Distribution).order_by(models.Distribution.created_at.desc()).all()


@router.post("/admin/distributions", response_model=schemas.DistributionRead, dependencies=[Depends(get_current_admin)])
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
        created_by=current_user.id,
    )
    db.add(distribution)
    db.commit()
    db.refresh(distribution)
    return distribution


def _send_distribution(distribution_id: int):
    """Runs in a background task: fans the distribution out to every user on the requested channels."""
    db = SessionLocal()
    try:
        distribution = db.query(models.Distribution).filter(models.Distribution.id == distribution_id).first()
        if not distribution:
            return

        distribution.status = "sending"
        db.commit()

        users = db.query(models.User).all()
        email_sender = get_email_sender()
        whatsapp_sender = get_whatsapp_sender()
        subject = distribution.title_he or "TIVUTA"
        message = distribution.message_he or ""

        had_failure = False
        for user in users:
            for channel in distribution.channels:
                log = models.DistributionSendLog(distribution_id=distribution.id, user_id=user.id, channel=channel)
                try:
                    if channel == "email":
                        result = email_sender.send(to=user.email, subject=subject, html_body=f"<p>{message}</p>")
                    elif channel == "whatsapp" and user.phone:
                        result = whatsapp_sender.send(to_phone=user.phone, text=f"{subject}\n{message}")
                    else:
                        result = None

                    if result is None:
                        log.status = "failed"
                        log.error = "No contact info for channel"
                        had_failure = True
                    elif result.success:
                        log.status = "sent"
                        log.provider_message_id = result.provider_message_id
                        log.sent_at = datetime.utcnow()
                    else:
                        log.status = "failed"
                        log.error = result.error
                        had_failure = True
                except Exception as e:
                    log.status = "failed"
                    log.error = str(e)
                    had_failure = True

                db.add(log)

        distribution.status = "failed" if had_failure else "sent"
        distribution.sent_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()


@router.post("/admin/distributions/{distribution_id}/send", dependencies=[Depends(get_current_admin)])
def admin_send_distribution(distribution_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    distribution = db.query(models.Distribution).filter(models.Distribution.id == distribution_id).first()
    if not distribution:
        raise HTTPException(status_code=404, detail="Distribution not found")

    background_tasks.add_task(_send_distribution, distribution_id)
    return {"message": "Distribution send started"}
