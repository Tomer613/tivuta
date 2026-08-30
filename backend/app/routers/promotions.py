import random
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..security import get_current_admin, get_current_user, get_db
from ..services import get_email_sender

router = APIRouter(tags=["promotions"])

VALID_TYPES = ("first_n", "raffle", "percentage_discount", "fixed_discount", "flash_sale")
VALID_CHANNELS = ("online", "physical", "both")


def _get_promotion_or_404(promotion_id: int, db: Session) -> models.Promotion:
    promotion = (
        db.query(models.Promotion)
        .options(
            selectinload(models.Promotion.products)
            .selectinload(models.Product.promotions)
        )
        .filter(models.Promotion.id == promotion_id)
        .first()
    )
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    return promotion


@router.get("/admin/promotions", response_model=List[schemas.PromotionRead], dependencies=[Depends(get_current_admin)])
def list_promotions(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Promotion)
    if is_active is not None:
        query = query.filter(models.Promotion.is_active == is_active)
    promos = query.order_by(models.Promotion.created_at.desc()).all()

    entry_counts: dict = {}
    product_counts: dict = {}
    if promos:
        entry_counts = dict(
            db.query(models.PromotionEntry.promotion_id, func.count(models.PromotionEntry.id))
            .group_by(models.PromotionEntry.promotion_id)
            .all()
        )
        product_counts = dict(
            db.query(models.product_promotions_table.c.promotion_id, func.count(models.product_promotions_table.c.product_id))
            .group_by(models.product_promotions_table.c.promotion_id)
            .all()
        )

    return [
        schemas.PromotionRead.model_validate(p).model_copy(update={
            "entry_count": entry_counts.get(p.id, 0),
            "product_count": product_counts.get(p.id, 0),
        })
        for p in promos
    ]


@router.post("/admin/promotions", response_model=schemas.PromotionRead, dependencies=[Depends(get_current_admin)])
def create_promotion(promotion_in: schemas.PromotionCreate, db: Session = Depends(get_db)):
    if promotion_in.type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"type must be one of {VALID_TYPES}")
    if promotion_in.channel not in VALID_CHANNELS:
        raise HTTPException(status_code=400, detail=f"channel must be one of {VALID_CHANNELS}")
    promotion = models.Promotion(**promotion_in.model_dump())
    db.add(promotion)
    db.commit()
    db.refresh(promotion)
    return promotion


@router.put("/admin/promotions/{promotion_id}", response_model=schemas.PromotionRead, dependencies=[Depends(get_current_admin)])
def update_promotion(promotion_id: int, promotion_in: schemas.PromotionUpdate, db: Session = Depends(get_db)):
    promotion = db.query(models.Promotion).filter(models.Promotion.id == promotion_id).first()
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    update_data = promotion_in.model_dump(exclude_unset=True)
    if "type" in update_data and update_data["type"] not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"type must be one of {VALID_TYPES}")
    if "channel" in update_data and update_data["channel"] not in VALID_CHANNELS:
        raise HTTPException(status_code=400, detail=f"channel must be one of {VALID_CHANNELS}")
    for key, value in update_data.items():
        setattr(promotion, key, value)
    db.commit()
    db.refresh(promotion)
    return promotion


@router.delete("/admin/promotions/{promotion_id}", dependencies=[Depends(get_current_admin)])
def deactivate_promotion(promotion_id: int, db: Session = Depends(get_db)):
    promotion = db.query(models.Promotion).filter(models.Promotion.id == promotion_id).first()
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    promotion.is_active = False
    db.commit()
    return {"message": "Promotion deactivated"}


@router.get("/admin/promotions/{promotion_id}/products", response_model=List[schemas.ProductRead], dependencies=[Depends(get_current_admin)])
def list_promotion_products(promotion_id: int, db: Session = Depends(get_db)):
    promotion = _get_promotion_or_404(promotion_id, db)
    return promotion.products


@router.post("/admin/promotions/{promotion_id}/products", dependencies=[Depends(get_current_admin)])
def assign_products(promotion_id: int, body: schemas.ProductAssignRequest, db: Session = Depends(get_db)):
    promotion = _get_promotion_or_404(promotion_id, db)
    existing_ids = {p.id for p in promotion.products}
    products_to_add = (
        db.query(models.Product)
        .filter(models.Product.id.in_(body.product_ids))
        .all()
    )
    if len(products_to_add) != len(body.product_ids):
        found_ids = {p.id for p in products_to_add}
        missing = set(body.product_ids) - found_ids
        raise HTTPException(status_code=404, detail=f"Products not found: {missing}")
    for product in products_to_add:
        if product.id not in existing_ids:
            promotion.products.append(product)
    db.commit()
    return {"message": f"Assigned {len(products_to_add)} product(s) to promotion"}


@router.delete("/admin/promotions/{promotion_id}/products/{product_id}", dependencies=[Depends(get_current_admin)])
def remove_product(promotion_id: int, product_id: int, db: Session = Depends(get_db)):
    promotion = _get_promotion_or_404(promotion_id, db)
    product = next((p for p in promotion.products if p.id == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not in this promotion")
    promotion.products.remove(product)
    db.commit()
    return {"message": "Product removed from promotion"}


# ─── Promotion Entries (raffle + first_n participation) ───────────────────────

def _winner_email_body(locale: str, promotion_name: str, user_first_name: str) -> str:
    if locale == "he":
        return (
            f'<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;text-align:right;">'
            f"<p>שלום {user_first_name},</p>"
            f"<p>ברכות! <strong>זכית בהגרלה: {promotion_name}</strong>.</p>"
            f"<p>נציג שלנו ייצור איתך קשר בקרוב עם פרטי הזכייה.</p>"
            f'<p>בברכה,<br/>צוות <span dir="ltr">Tivuta</span></p>'
            f"</div>"
        )
    # fr/yi fall back to the English copy below, matching the existing he-vs-English convention
    # already used by leads.py's _status_update_body/_confirmation_body.
    return (
        f'<div dir="ltr" style="font-family:Arial,sans-serif;color:#111;text-align:left;">'
        f"<p>Hi {user_first_name},</p>"
        f"<p>Congratulations! <strong>You won the raffle: {promotion_name}</strong>.</p>"
        f"<p>A representative will contact you shortly with the winning details.</p>"
        f"<p>Best regards,<br/>Team Tivuta</p>"
        f"</div>"
    )


def _do_draw(promotion: models.Promotion, db: Session) -> Optional[models.PromotionEntry]:
    """Pick a random winner, mark promotion closed, send winner email. Returns winning entry or None."""
    existing_winner = db.query(models.PromotionEntry).filter(
        models.PromotionEntry.promotion_id == promotion.id,
        models.PromotionEntry.is_winner == True,
    ).first()
    if existing_winner:
        return existing_winner

    entries = db.query(models.PromotionEntry).filter(
        models.PromotionEntry.promotion_id == promotion.id
    ).all()
    if not entries:
        return None
    winner_entry = random.choice(entries)
    winner_entry.is_winner = True
    promotion.is_active = False
    db.commit()
    db.refresh(winner_entry)
    winner_user = db.query(models.User).filter(models.User.id == winner_entry.user_id).first()
    if winner_user:
        locale = winner_user.preferred_language or "he"
        promotion_name = getattr(promotion, f"name_{locale}", None) or promotion.name_he
        subject = f"זכית בהגרלה — {promotion_name}" if locale == "he" else f"You won the raffle — {promotion_name}"
        get_email_sender().send(
            to=winner_user.email,
            subject=subject,
            html_body=_winner_email_body(locale, promotion_name, winner_user.first_name),
            locale=locale,
        )
    return winner_entry


@router.post("/promotions/{promotion_id}/enter", response_model=schemas.PromotionEntryRead)
def enter_promotion(
    promotion_id: int,
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    promotion = db.query(models.Promotion).filter(models.Promotion.id == promotion_id).first()
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    if not promotion.is_active:
        raise HTTPException(status_code=400, detail="המבצע אינו פעיל")

    # Verify the product actually belongs to this promotion
    from sqlalchemy import exists
    is_assigned = db.query(
        exists().where(
            (models.product_promotions_table.c.promotion_id == promotion_id) &
            (models.product_promotions_table.c.product_id == product_id)
        )
    ).scalar()
    if not is_assigned:
        raise HTTPException(status_code=400, detail="המוצר אינו משויך למבצע זה")

    # Check not already entered
    existing = db.query(models.PromotionEntry).filter(
        models.PromotionEntry.user_id == current_user.id,
        models.PromotionEntry.promotion_id == promotion_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="כבר נרשמת למבצע זה")

    now = datetime.utcnow()

    if promotion.type == "first_n":
        limit = (promotion.config or {}).get("limit", 0)
        count = db.query(models.PromotionEntry).filter(
            models.PromotionEntry.promotion_id == promotion_id
        ).count()
        if count >= limit:
            raise HTTPException(status_code=400, detail="המבצע מלא — כל המקומות אזלו")

    elif promotion.type == "raffle":
        if promotion.end_date and promotion.end_date < now:
            raise HTTPException(status_code=400, detail="ההגרלה הסתיימה")

    entry = models.PromotionEntry(
        user_id=current_user.id,
        promotion_id=promotion_id,
        product_id=product_id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/promotions/{promotion_id}/status", response_model=schemas.PromotionStatusRead)
def get_promotion_status(
    promotion_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    promotion = db.query(models.Promotion).filter(models.Promotion.id == promotion_id).first()
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")

    now = datetime.utcnow()

    # Lazy auto-draw for overdue raffles
    if promotion.type == "raffle" and promotion.end_date and promotion.end_date < now and promotion.is_active:
        existing_winner = db.query(models.PromotionEntry).filter(
            models.PromotionEntry.promotion_id == promotion_id,
            models.PromotionEntry.is_winner == True,
        ).first()
        if not existing_winner:
            _do_draw(promotion, db)
            db.refresh(promotion)

    count = db.query(models.PromotionEntry).filter(
        models.PromotionEntry.promotion_id == promotion_id
    ).count()

    winner_entry = db.query(models.PromotionEntry).filter(
        models.PromotionEntry.promotion_id == promotion_id,
        models.PromotionEntry.is_winner == True,
    ).first()

    winner_name: Optional[str] = None
    if winner_entry:
        wu = db.query(models.User).filter(models.User.id == winner_entry.user_id).first()
        if wu:
            winner_name = f"{wu.first_name} {wu.last_name}"

    my_entry = db.query(models.PromotionEntry).filter(
        models.PromotionEntry.user_id == current_user.id,
        models.PromotionEntry.promotion_id == promotion_id,
    ).first()

    config = promotion.config or {}
    limit = config.get("limit") if promotion.type == "first_n" else None
    remaining = max(0, limit - count) if limit is not None else None
    is_full = (remaining == 0) if remaining is not None else False
    is_closed = (winner_entry is not None) or (
        promotion.type == "raffle" and promotion.end_date and promotion.end_date < now and not promotion.is_active
    )

    return schemas.PromotionStatusRead(
        promotion_id=promotion_id,
        type=promotion.type,
        name_he=promotion.name_he,
        participants_count=count,
        limit=limit,
        remaining=remaining,
        is_full=is_full,
        is_closed=is_closed,
        end_date=promotion.end_date,
        winner_name=winner_name,
        has_entered=(my_entry is not None),
        is_current_user_winner=(my_entry is not None and my_entry.is_winner),
    )


@router.post("/admin/promotions/{promotion_id}/draw", dependencies=[Depends(get_current_admin)])
def admin_draw(promotion_id: int, db: Session = Depends(get_db)):
    promotion = db.query(models.Promotion).filter(models.Promotion.id == promotion_id).first()
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    if promotion.type != "raffle":
        raise HTTPException(status_code=400, detail="ניתן להגריל רק מבצעי הגרלה")
    existing_winner = db.query(models.PromotionEntry).filter(
        models.PromotionEntry.promotion_id == promotion_id,
        models.PromotionEntry.is_winner == True,
    ).first()
    if existing_winner:
        raise HTTPException(status_code=400, detail="ההגרלה כבר בוצעה")
    winner_entry = _do_draw(promotion, db)
    if not winner_entry:
        raise HTTPException(status_code=400, detail="אין משתתפים בהגרלה")
    wu = db.query(models.User).filter(models.User.id == winner_entry.user_id).first()
    return {"message": "הגרלה בוצעה", "winner": f"{wu.first_name} {wu.last_name}" if wu else "לא ידוע"}
