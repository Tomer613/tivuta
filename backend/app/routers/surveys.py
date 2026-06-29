from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..security import get_current_admin, get_current_user, get_db

router = APIRouter(tags=["surveys"])


def _serialize_survey(survey: models.Survey) -> schemas.SurveyRead:
    options = [
        schemas.SurveyOptionRead(
            id=opt.id,
            product_id=opt.product_id,
            label_override_he=opt.label_override_he,
            vote_count=len(opt.votes),
        )
        for opt in survey.options
    ]
    return schemas.SurveyRead(
        id=survey.id,
        question_he=survey.question_he,
        question_en=survey.question_en,
        question_fr=survey.question_fr,
        question_yi=survey.question_yi,
        is_active=survey.is_active,
        options=options,
    )


@router.get("/surveys", response_model=List[schemas.SurveyRead])
def list_surveys(db: Session = Depends(get_db)):
    surveys = db.query(models.Survey).filter(models.Survey.is_active == True).all()
    return [_serialize_survey(s) for s in surveys]


@router.get("/surveys/{survey_id}", response_model=schemas.SurveyRead)
def get_survey(survey_id: int, db: Session = Depends(get_db)):
    survey = db.query(models.Survey).filter(models.Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    return _serialize_survey(survey)


@router.post("/surveys/{survey_id}/vote")
def vote_survey(survey_id: int, payload: schemas.SurveyVoteCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    option = db.query(models.SurveyOption).filter(
        models.SurveyOption.id == payload.survey_option_id,
        models.SurveyOption.survey_id == survey_id,
    ).first()
    if not option:
        raise HTTPException(status_code=404, detail="Survey option not found")

    existing = db.query(models.SurveyVote).filter(
        models.SurveyVote.survey_id == survey_id,
        models.SurveyVote.user_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already voted in this survey")

    db.add(models.SurveyVote(survey_id=survey_id, survey_option_id=option.id, user_id=current_user.id))
    db.commit()
    return {"message": "Vote recorded"}


@router.post("/admin/surveys", response_model=schemas.SurveyRead, dependencies=[Depends(get_current_admin)])
def admin_create_survey(payload: schemas.SurveyCreate, db: Session = Depends(get_db)):
    survey = models.Survey(
        question_he=payload.question_he,
        question_en=payload.question_en,
        question_fr=payload.question_fr,
        question_yi=payload.question_yi,
    )
    db.add(survey)
    db.flush()

    for opt in payload.options:
        db.add(models.SurveyOption(survey_id=survey.id, product_id=opt.product_id, label_override_he=opt.label_override_he))

    db.commit()
    db.refresh(survey)
    return _serialize_survey(survey)


@router.patch("/admin/surveys/{survey_id}", response_model=schemas.SurveyRead, dependencies=[Depends(get_current_admin)])
def admin_set_survey_active(survey_id: int, is_active: bool, db: Session = Depends(get_db)):
    survey = db.query(models.Survey).filter(models.Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    survey.is_active = is_active
    db.commit()
    db.refresh(survey)
    return _serialize_survey(survey)
