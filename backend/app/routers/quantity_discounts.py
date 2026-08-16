from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..security import get_current_admin, get_db

router = APIRouter(tags=["quantity_discounts"])


def validate_quantity_discount_bundle(bundle_id: Optional[int], db: Session) -> None:
    """Shared by products.py — a product's quantity-discount bundle (if set) must exist and be
    active. Unlike vendor/category, bundles aren't vertical-scoped, so there's no vertical check."""
    if bundle_id is None:
        return
    bundle = db.query(models.QuantityDiscountBundle).filter(models.QuantityDiscountBundle.id == bundle_id).first()
    if not bundle:
        raise HTTPException(status_code=404, detail="Quantity discount bundle not found")
    if not bundle.is_active:
        raise HTTPException(status_code=400, detail="Quantity discount bundle is not active")


def _validate_tiers(tiers: List[schemas.QuantityDiscountTierBase]) -> None:
    if not tiers:
        raise HTTPException(status_code=400, detail="At least one tier is required")
    quantities = [t.min_quantity for t in tiers]
    if len(quantities) != len(set(quantities)):
        raise HTTPException(status_code=400, detail="Tier quantities must be unique")
    ordered = sorted(tiers, key=lambda t: t.min_quantity)
    prev_percent = 0.0
    for tier in ordered:
        if tier.discount_percent < prev_percent:
            raise HTTPException(
                status_code=400,
                detail="Higher-quantity tiers must offer a discount percent >= lower-quantity tiers",
            )
        prev_percent = tier.discount_percent


def _bundle_read(bundle: models.QuantityDiscountBundle, db: Session) -> schemas.QuantityDiscountBundleRead:
    product_count = (
        db.query(func.count(models.Product.id))
        .filter(models.Product.quantity_discount_bundle_id == bundle.id)
        .scalar()
    )
    result = schemas.QuantityDiscountBundleRead.model_validate(bundle)
    result.product_count = product_count or 0
    return result


@router.get(
    "/admin/quantity-discounts",
    response_model=List[schemas.QuantityDiscountBundleRead],
    dependencies=[Depends(get_current_admin)],
)
def admin_list_quantity_discounts(db: Session = Depends(get_db)):
    bundles = (
        db.query(models.QuantityDiscountBundle)
        .options(selectinload(models.QuantityDiscountBundle.tiers))
        .order_by(models.QuantityDiscountBundle.created_at.desc())
        .all()
    )
    return [_bundle_read(b, db) for b in bundles]


@router.post(
    "/admin/quantity-discounts",
    response_model=schemas.QuantityDiscountBundleRead,
    dependencies=[Depends(get_current_admin)],
)
def admin_create_quantity_discount(payload: schemas.QuantityDiscountBundleCreate, db: Session = Depends(get_db)):
    _validate_tiers(payload.tiers)
    bundle = models.QuantityDiscountBundle(
        name_he=payload.name_he,
        name_en=payload.name_en,
        is_active=payload.is_active,
    )
    bundle.tiers = [
        models.QuantityDiscountTier(min_quantity=t.min_quantity, discount_percent=t.discount_percent)
        for t in payload.tiers
    ]
    db.add(bundle)
    db.commit()
    db.refresh(bundle)
    return _bundle_read(bundle, db)


@router.patch(
    "/admin/quantity-discounts/{bundle_id}",
    response_model=schemas.QuantityDiscountBundleRead,
    dependencies=[Depends(get_current_admin)],
)
def admin_update_quantity_discount(
    bundle_id: int, payload: schemas.QuantityDiscountBundleUpdate, db: Session = Depends(get_db)
):
    bundle = (
        db.query(models.QuantityDiscountBundle)
        .options(selectinload(models.QuantityDiscountBundle.tiers))
        .filter(models.QuantityDiscountBundle.id == bundle_id)
        .first()
    )
    if not bundle:
        raise HTTPException(status_code=404, detail="Quantity discount bundle not found")
    update_data = payload.model_dump(exclude_unset=True, exclude={"tiers"})
    for key, value in update_data.items():
        setattr(bundle, key, value)
    if payload.tiers is not None:
        _validate_tiers(payload.tiers)
        bundle.tiers = [
            models.QuantityDiscountTier(min_quantity=t.min_quantity, discount_percent=t.discount_percent)
            for t in payload.tiers
        ]
    db.commit()
    db.refresh(bundle)
    return _bundle_read(bundle, db)


@router.delete("/admin/quantity-discounts/{bundle_id}", dependencies=[Depends(get_current_admin)])
def admin_delete_quantity_discount(bundle_id: int, db: Session = Depends(get_db)):
    """Soft-deactivate only, matching Vertical/ProductCategory's own 'delete' semantics — products
    already assigned to this bundle keep their quantity_discount_bundle_id, it just drops out of
    the active list and stops applying at checkout."""
    bundle = db.query(models.QuantityDiscountBundle).filter(models.QuantityDiscountBundle.id == bundle_id).first()
    if not bundle:
        raise HTTPException(status_code=404, detail="Quantity discount bundle not found")
    bundle.is_active = False
    db.commit()
    return {"message": "Quantity discount bundle deactivated"}
