from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..security import get_current_admin, get_current_user, get_current_user_optional, get_db

router = APIRouter(tags=["surveys"])


def _serialize_survey(survey: models.Survey, db: Session = None, current_user: Optional[models.User] = None) -> schemas.SurveyRead:
    product_titles: dict = {}
    if db is not None:
        ids = [opt.product_id for opt in survey.options if opt.product_id]
        if ids:
            products = db.query(models.Product).filter(models.Product.id.in_(ids)).all()
            product_titles = {p.id: p.title_he for p in products}

    options = [
        schemas.SurveyOptionRead(
            id=opt.id,
            product_id=opt.product_id,
            label_override_he=opt.label_override_he,
            product_title_he=product_titles.get(opt.product_id),
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
