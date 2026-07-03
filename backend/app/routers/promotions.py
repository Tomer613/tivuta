from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..security import get_current_admin, get_db

router = APIRouter(tags=["promotions"])

VALID_TYPES = ("first_n", "raffle", "percentage_discount", "fixed_discount", "flash_sale")
VALID_CHANNELS = ("online", "physical", "both")


def _get_promotion_or_404(promotion_id: int, db: Session) -> models.Promotion:
    promotion = (
        db.query(models.Promotion)
        .options(selectinload(models.Promotion.products))
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
    return query.order_by(models.Promotion.created_at.desc()).all()


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
