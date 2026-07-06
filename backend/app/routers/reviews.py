from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..security import get_current_admin, get_current_user, get_db

router = APIRouter(tags=["reviews"])


@router.post("/reviews/{product_id}", response_model=schemas.ReviewRead)
def submit_review(
    product_id: int,
    payload: schemas.ReviewCreate,
    lead_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not 1 <= payload.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Upsert: if review exists, update it
    existing = db.query(models.Review).filter(
        models.Review.user_id == current_user.id,
        models.Review.product_id == product_id,
    ).first()
    if existing:
        existing.rating = payload.rating
        existing.comment = payload.comment
        db.commit()
        db.refresh(existing)
        review = existing
    else:
        review = models.Review(
            user_id=current_user.id,
            product_id=product_id,
            lead_id=lead_id,
            rating=payload.rating,
            comment=payload.comment,
        )
        db.add(review)
        db.commit()
        db.refresh(review)

    return schemas.ReviewRead(
        id=review.id,
        user_id=review.user_id,
        product_id=review.product_id,
        lead_id=review.lead_id,
        rating=review.rating,
        comment=review.comment,
        is_approved=review.is_approved,
        created_at=review.created_at,
        user_name=f"{current_user.first_name} {current_user.last_name}".strip(),
    )


@router.get("/products/{product_id}/reviews", response_model=List[schemas.ReviewRead])
def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    reviews = (
        db.query(models.Review)
        .options(selectinload(models.Review.user))
        .filter(models.Review.product_id == product_id, models.Review.is_approved == True)
        .order_by(models.Review.created_at.desc())
        .all()
    )
    return [
        schemas.ReviewRead(
            id=r.id,
            user_id=r.user_id,
            product_id=r.product_id,
            lead_id=r.lead_id,
            rating=r.rating,
            comment=r.comment,
            is_approved=r.is_approved,
            created_at=r.created_at,
            user_name=f"{r.user.first_name} {r.user.last_name}".strip() if r.user else None,
        )
        for r in reviews
    ]


@router.get("/admin/reviews", response_model=List[schemas.ReviewRead], dependencies=[Depends(get_current_admin)])
def admin_list_reviews(db: Session = Depends(get_db)):
    reviews = (
        db.query(models.Review)
        .options(selectinload(models.Review.user))
        .order_by(models.Review.created_at.desc())
        .all()
    )
    return [
        schemas.ReviewRead(
            id=r.id,
            user_id=r.user_id,
            product_id=r.product_id,
            lead_id=r.lead_id,
            rating=r.rating,
            comment=r.comment,
            is_approved=r.is_approved,
            created_at=r.created_at,
            user_name=f"{r.user.first_name} {r.user.last_name}".strip() if r.user else None,
        )
        for r in reviews
    ]


@router.patch("/admin/reviews/{review_id}/approve", dependencies=[Depends(get_current_admin)])
def admin_approve_review(review_id: int, approved: bool, db: Session = Depends(get_db)):
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.is_approved = approved
    db.commit()
    return {"ok": True}
