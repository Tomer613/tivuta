import os
from html import escape as html_escape
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..security import get_current_admin, get_current_user, get_current_user_optional, get_db
from ..services import get_email_sender, loyalty

router = APIRouter(tags=["surveys"])

ADMIN_NOTIFICATION_EMAIL = os.environ.get("ADMIN_NOTIFICATION_EMAIL", "support@tivuta.co.il")


def _serialize_survey(survey: models.Survey, db: Session = None, current_user: Optional[models.User] = None) -> schemas.SurveyRead:
    product_titles: dict = {}
    product_images: dict = {}
    if db is not None:
        ids = [opt.product_id for opt in survey.options if opt.product_id]
        if ids:
            products = db.query(models.Product).filter(models.Product.id.in_(ids)).all()
            product_titles = {p.id: p.title_he for p in products}
            product_images = {p.id: p.image_url for p in products}

    options = [
        schemas.SurveyOptionRead(
            id=opt.id,
            product_id=opt.product_id,
            label_override_he=opt.label_override_he,
            product_title_he=product_titles.get(opt.product_id),
            product_image_url=product_images.get(opt.product_id),
            vote_count=len(opt.votes),
        )
        for opt in survey.options
    ]

    has_voted = False
    my_option_ids: List[int] = []
    if db is not None and current_user is not None:
        my_votes = db.query(models.SurveyVote).filter(
            models.SurveyVote.survey_id == survey.id,
            models.SurveyVote.user_id == current_user.id,
        ).all()
        has_voted = len(my_votes) > 0
        my_option_ids = [v.survey_option_id for v in my_votes]

    return schemas.SurveyRead(
        id=survey.id,
        question_he=survey.question_he,
        question_en=survey.question_en,
        question_fr=survey.question_fr,
        question_yi=survey.question_yi,
        is_active=survey.is_active,
        max_choices=survey.max_choices,
        poll_type=survey.poll_type,
        image_url=survey.image_url,
        has_voted=has_voted,
        my_option_ids=my_option_ids,
        options=options,
    )


@router.get("/surveys", response_model=List[schemas.SurveyRead])
def list_surveys(db: Session = Depends(get_db), current_user: Optional[models.User] = Depends(get_current_user_optional)):
    surveys = db.query(models.Survey).filter(models.Survey.is_active == True).all()
    return [_serialize_survey(s, db, current_user) for s in surveys]


@router.get("/surveys/followup-questions", response_model=schemas.SurveyFollowupQuestionsRead)
def get_survey_followup_questions(db: Session = Depends(get_db)):
    """Public - the poll page itself is already publicly viewable, and this is just static-ish
    copy, not sensitive data. Reads through the generic settings mechanism (services/loyalty.py)
    so an admin can reword these two questions from /admin/loyalty without a code deploy.

    Must be registered BEFORE GET /surveys/{survey_id} below - FastAPI matches routes in
    registration order, so a literal path segment needs to come first or it gets swallowed as the
    {survey_id} int path param instead (which 422s on a non-numeric value like this one)."""
    return schemas.SurveyFollowupQuestionsRead(
        question1_he=loyalty.get_setting(db, "survey_followup_question1_he"),
        question2_he=loyalty.get_setting(db, "survey_followup_question2_he"),
    )


@router.get("/surveys/{survey_id}", response_model=schemas.SurveyRead)
def get_survey(survey_id: int, db: Session = Depends(get_db), current_user: Optional[models.User] = Depends(get_current_user_optional)):
    survey = db.query(models.Survey).filter(models.Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    return _serialize_survey(survey, db, current_user)


@router.get("/admin/surveys", response_model=List[schemas.SurveyRead], dependencies=[Depends(get_current_admin)])
def admin_list_surveys(db: Session = Depends(get_db)):
    surveys = db.query(models.Survey).order_by(models.Survey.id.desc()).all()
    return [_serialize_survey(s, db) for s in surveys]


@router.post("/surveys/{survey_id}/vote", response_model=schemas.SurveyRead)
def vote_survey(survey_id: int, payload: schemas.SurveyVoteCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    survey = db.query(models.Survey).filter(models.Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    option_ids = payload.survey_option_ids
    if not option_ids:
        raise HTTPException(status_code=400, detail="Select at least one option")

    matching_options = db.query(models.SurveyOption).filter(
        models.SurveyOption.id.in_(option_ids),
        models.SurveyOption.survey_id == survey_id,
    ).all()
    if len(matching_options) != len(set(option_ids)):
        raise HTTPException(status_code=404, detail="Survey option not found")

    if len(option_ids) > survey.max_choices:
        raise HTTPException(status_code=400, detail=f"You can select up to {survey.max_choices} options")

    existing = db.query(models.SurveyVote).filter(
        models.SurveyVote.survey_id == survey_id,
        models.SurveyVote.user_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already voted in this survey")

    for option in matching_options:
        db.add(models.SurveyVote(survey_id=survey_id, survey_option_id=option.id, user_id=current_user.id))
    db.commit()
    db.refresh(survey)
    return _serialize_survey(survey, db, current_user)


@router.post("/surveys/{survey_id}/followup")
def submit_survey_followup(
    survey_id: int,
    payload: schemas.SurveyFollowupCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Turns a post-vote follow-up response into a Lead (lead_type="survey_followup"), reusing the
    same "customer-initiated, needs admin follow-up" shape as POST /leads/contact - gets
    assignment/status/notes/search/CSV-export for free instead of a bespoke admin viewer. Only
    meaningful for a product poll - both questions presuppose the poll's options are products.
    Skips creating a lead entirely when the response carries no real signal, so the Leads queue
    doesn't fill with empty non-answers."""
    survey = db.query(models.Survey).filter(models.Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    if survey.poll_type != "product":
        raise HTTPException(status_code=400, detail="Follow-up is only available for product polls")

    my_votes = (
        db.query(models.SurveyVote)
        .filter(models.SurveyVote.survey_id == survey_id, models.SurveyVote.user_id == current_user.id)
        .all()
    )
    if not my_votes:
        raise HTTPException(status_code=400, detail="You haven't voted on this poll yet")

    note = (payload.additional_products_note or "").strip()
    if not payload.wants_followup and not note:
        return {"created": False}

    option_ids = [v.survey_option_id for v in my_votes]
    voted_options = db.query(models.SurveyOption).filter(models.SurveyOption.id.in_(option_ids)).all()
    voted_titles = [
        (opt.product.title_he if opt.product else opt.label_override_he) or f"#{opt.id}"
        for opt in voted_options
    ]
    products_text = ", ".join(voted_titles) if voted_titles else "—"

    message_lines = [
        f"מוצרים שנבחרו בסקר: {products_text}",
        f"מעוניין בהצעת מחיר מיוחדת: {'כן' if payload.wants_followup else 'לא'}",
    ]
    if note:
        message_lines.append(f"מוצרים נוספים מבוקשים: {note}")

    new_lead = models.Lead(
        user_id=current_user.id,
        product_id=None,
        customer_order_id=None,
        lead_type="survey_followup",
        status="new",
        channel="web",
        locale="he",
        subject=survey.question_he[:200],
        message="\n".join(message_lines),
    )
    db.add(new_lead)
    db.commit()

    try:
        get_email_sender().send(
            to=ADMIN_NOTIFICATION_EMAIL,
            subject=f"מעקב לאחר סקר — {current_user.first_name} {current_user.last_name}",
            html_body=f"""
            <div dir="rtl" style="font-family:Arial,sans-serif;color:#111;">
              <h2 style="color:#b8860b;">תגובת מעקב חדשה לאחר הצבעה בסקר</h2>
              <p><strong>לקוח:</strong> {current_user.first_name} {current_user.last_name} ({current_user.email})</p>
              <p><strong>סקר:</strong> {survey.question_he}</p>
              <p><strong>מוצרים שנבחרו:</strong> {products_text}</p>
              <p><strong>מעוניין בהצעת מחיר מיוחדת:</strong> {'כן' if payload.wants_followup else 'לא'}</p>
              {f'<p><strong>מוצרים נוספים מבוקשים:</strong> {html_escape(note)}</p>' if note else ''}
            </div>""",
            locale="he",
        )
    except Exception:
        pass

    return {"created": True}


@router.post("/admin/surveys", response_model=schemas.SurveyRead, dependencies=[Depends(get_current_admin)])
def admin_create_survey(payload: schemas.SurveyCreate, db: Session = Depends(get_db)):
    if payload.max_choices < 1:
        raise HTTPException(status_code=400, detail="max_choices must be at least 1")

    survey = models.Survey(
        question_he=payload.question_he,
        question_en=payload.question_en,
        question_fr=payload.question_fr,
        question_yi=payload.question_yi,
        max_choices=payload.max_choices,
        poll_type=payload.poll_type,
        image_url=payload.image_url,
    )
    db.add(survey)
    db.flush()

    for opt in payload.options:
        db.add(models.SurveyOption(survey_id=survey.id, product_id=opt.product_id, label_override_he=opt.label_override_he))

    db.commit()
    db.refresh(survey)
    return _serialize_survey(survey, db)


@router.patch("/admin/surveys/{survey_id}", response_model=schemas.SurveyRead, dependencies=[Depends(get_current_admin)])
def admin_update_survey(survey_id: int, payload: schemas.SurveyUpdate, db: Session = Depends(get_db)):
    survey = db.query(models.Survey).filter(models.Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    updates = payload.model_dump(exclude_unset=True, exclude={"options"})
    if "max_choices" in updates and updates["max_choices"] is not None and updates["max_choices"] < 1:
        raise HTTPException(status_code=400, detail="max_choices must be at least 1")

    for field, value in updates.items():
        setattr(survey, field, value)

    if payload.options is not None:
        if len(payload.options) < 2:
            raise HTTPException(status_code=400, detail="A survey needs at least 2 options")

        existing_by_id = {opt.id: opt for opt in survey.options}
        for incoming in payload.options:
            if incoming.id is not None and incoming.id not in existing_by_id:
                raise HTTPException(status_code=404, detail=f"Option {incoming.id} not found on this survey")
            if survey.poll_type == "product":
                if not incoming.product_id:
                    raise HTTPException(status_code=400, detail="Every option needs a product_id for a product poll")
            else:
                if incoming.product_id:
                    raise HTTPException(status_code=400, detail="Text polls can't have a product_id on an option")
                if not (incoming.label_override_he and incoming.label_override_he.strip()):
                    raise HTTPException(status_code=400, detail="Every option needs a label for a text poll")

        incoming_ids = {opt.id for opt in payload.options if opt.id is not None}
        to_remove_ids = set(existing_by_id) - incoming_ids
        blocked = [oid for oid in to_remove_ids if len(existing_by_id[oid].votes) > 0]
        if blocked:
            raise HTTPException(
                status_code=400,
                detail=f"Can't delete option(s) that already have votes: {sorted(blocked)}",
            )

        for oid in to_remove_ids:
            db.delete(existing_by_id[oid])
        for incoming in payload.options:
            if incoming.id is not None:
                option = existing_by_id[incoming.id]
                option.product_id = incoming.product_id
                option.label_override_he = incoming.label_override_he
            else:
                db.add(models.SurveyOption(survey_id=survey.id, product_id=incoming.product_id, label_override_he=incoming.label_override_he))

    db.commit()
    db.refresh(survey)
    return _serialize_survey(survey, db)


@router.delete("/admin/surveys/{survey_id}", dependencies=[Depends(get_current_admin)])
def admin_delete_survey(survey_id: int, db: Session = Depends(get_db)):
    survey = db.query(models.Survey).filter(models.Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    db.delete(survey)
    db.commit()
    return {"message": "deleted"}
