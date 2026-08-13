from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..security import get_current_admin, get_db
from .verticals import validate_vertical_slug

router = APIRouter(tags=["product_categories"])


def validate_category(category_id: Optional[int], vertical: str, db: Session) -> None:
    """Shared by products.py — a product's category (if set) must be an active category
    belonging to the same vertical as the product itself."""
    if category_id is None:
        return
    category = db.query(models.ProductCategory).filter(models.ProductCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if not category.is_active:
        raise HTTPException(status_code=400, detail="Category is not active")
    if category.vertical != vertical:
        raise HTTPException(status_code=400, detail="Category vertical does not match product vertical")


@router.get("/product-categories", response_model=List[schemas.ProductCategoryRead])
def list_product_categories(vertical: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.ProductCategory).filter(models.ProductCategory.is_active == True)
    if vertical:
        query = query.filter(models.ProductCategory.vertical == vertical)
    return query.order_by(models.ProductCategory.display_order.asc()).all()


@router.get(
    "/admin/product-categories",
    response_model=List[schemas.ProductCategoryRead],
    dependencies=[Depends(get_current_admin)],
)
def admin_list_product_categories(vertical: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.ProductCategory)
    if vertical:
        query = query.filter(models.ProductCategory.vertical == vertical)
    return query.order_by(models.ProductCategory.display_order.asc()).all()


@router.post(
    "/admin/product-categories",
    response_model=schemas.ProductCategoryRead,
    dependencies=[Depends(get_current_admin)],
)
def admin_create_product_category(category_in: schemas.ProductCategoryCreate, db: Session = Depends(get_db)):
    validate_vertical_slug(db, category_in.vertical)
    new_category = models.ProductCategory(**category_in.model_dump())
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category


@router.patch(
    "/admin/product-categories/{category_id}",
    response_model=schemas.ProductCategoryRead,
    dependencies=[Depends(get_current_admin)],
)
def admin_update_product_category(
    category_id: int, category_in: schemas.ProductCategoryUpdate, db: Session = Depends(get_db)
):
    category = db.query(models.ProductCategory).filter(models.ProductCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    update_data = category_in.model_dump(exclude_unset=True)
    if "vertical" in update_data:
        validate_vertical_slug(db, update_data["vertical"])
    for key, value in update_data.items():
        setattr(category, key, value)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/admin/product-categories/{category_id}", dependencies=[Depends(get_current_admin)])
def admin_delete_product_category(category_id: int, db: Session = Depends(get_db)):
    """Soft-deactivate only, matching Vertical/Vendor's own 'delete' semantics — products already
    assigned to this category keep their category_id, it just drops out of the active list."""
    category = db.query(models.ProductCategory).filter(models.ProductCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    category.is_active = False
    db.commit()
    return {"message": "Category deactivated"}
