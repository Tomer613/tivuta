from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..security import get_current_admin, get_db

router = APIRouter(tags=["products"])

VALID_VERTICALS = ("diamonds", "cars", "insurance")


def _active_promotions(product: models.Product) -> List[schemas.PromotionBrief]:
    now = datetime.utcnow()
    return [
        schemas.PromotionBrief.model_validate(p)
        for p in product.promotions
        if p.is_active and (p.end_date is None or p.end_date > now)
    ]


def _product_read(product: models.Product) -> schemas.ProductRead:
    result = schemas.ProductRead.model_validate(product)
    result.promotions = _active_promotions(product)
    return result


@router.get("/products", response_model=List[schemas.ProductRead])
def list_products(
    vertical: Optional[str] = None,
    sort: Optional[str] = None,  # 'price_asc' | 'price_desc' | 'newest'
    promotion_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    query = (
        db.query(models.Product)
        .filter(models.Product.is_active == True)
        .options(selectinload(models.Product.promotions))
    )
    if vertical:
        query = query.filter(models.Product.vertical == vertical)
    if promotion_type:
        promo_product_ids = (
            db.query(models.product_promotions_table.c.product_id)
            .join(models.Promotion, models.Promotion.id == models.product_promotions_table.c.promotion_id)
            .filter(
                models.Promotion.type == promotion_type,
                models.Promotion.is_active == True,
                or_(models.Promotion.end_date == None, models.Promotion.end_date > now),
            )
            .subquery()
        )
        query = query.filter(models.Product.id.in_(promo_product_ids))
    if sort == "price_asc":
        query = query.order_by(models.Product.price.asc())
    elif sort == "price_desc":
        query = query.order_by(models.Product.price.desc())
    else:
        query = query.order_by(models.Product.created_at.desc())

    return [_product_read(p) for p in query.all()]


@router.get("/products/{product_id}", response_model=schemas.ProductRead)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = (
        db.query(models.Product)
        .filter(models.Product.id == product_id)
        .options(selectinload(models.Product.promotions))
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _product_read(product)


def _validate_vertical(vertical: str):
    if vertical not in VALID_VERTICALS:
        raise HTTPException(status_code=400, detail=f"vertical must be one of {VALID_VERTICALS}")


@router.post("/admin/products", response_model=schemas.ProductRead, dependencies=[Depends(get_current_admin)])
def admin_create_product(product_in: schemas.ProductCreate, db: Session = Depends(get_db)):
    _validate_vertical(product_in.vertical)
    new_product = models.Product(**product_in.model_dump())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product


@router.post("/admin/products/batch", response_model=List[schemas.ProductRead], dependencies=[Depends(get_current_admin)])
def admin_create_products_batch(products_in: List[schemas.ProductCreate], db: Session = Depends(get_db)):
    new_products = []
    for product_in in products_in:
        _validate_vertical(product_in.vertical)
        new_product = models.Product(**product_in.model_dump())
        db.add(new_product)
        new_products.append(new_product)
    db.commit()
    for p in new_products:
        db.refresh(p)
    return new_products


@router.put("/admin/products/{product_id}", response_model=schemas.ProductRead, dependencies=[Depends(get_current_admin)])
def admin_update_product(product_id: int, product_in: schemas.ProductUpdate, db: Session = Depends(get_db)):
    product = (
        db.query(models.Product)
        .filter(models.Product.id == product_id)
        .options(selectinload(models.Product.promotions))
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    update_data = product_in.model_dump(exclude_unset=True)
    if "vertical" in update_data:
        _validate_vertical(update_data["vertical"])
    for key, value in update_data.items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return _product_read(product)


@router.get("/admin/products", response_model=List[schemas.ProductRead], dependencies=[Depends(get_current_admin)])
def admin_list_all_products(db: Session = Depends(get_db)):
    """Returns all products including inactive ones — for admin management."""
    products = (
        db.query(models.Product)
        .options(selectinload(models.Product.promotions))
        .order_by(models.Product.created_at.desc())
        .all()
    )
    return [_product_read(p) for p in products]


@router.delete("/admin/products/{product_id}", dependencies=[Depends(get_current_admin)])
def admin_delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = False
    db.commit()
    return {"message": "Product deactivated"}
