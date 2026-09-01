from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..security import get_current_user, get_db
from ..services.purchase_history import get_user_purchase_history

router = APIRouter(tags=["shopping_list"])


def _validate_shopping_list_vertical(db: Session, vertical: str) -> models.Vertical:
    """The admin per-world enables_shopping_list toggle is meant to actually gate the feature, not
    just hide its UI entry points — enforced here so a user can't reach it for an unrelated world
    by calling the API directly (e.g. a stale bookmark, or devtools) once it's been used for one
    real vertical."""
    v = db.query(models.Vertical).filter(models.Vertical.slug == vertical).first()
    if not v:
        raise HTTPException(status_code=404, detail="World not found")
    if not v.enables_shopping_list:
        raise HTTPException(status_code=400, detail="This world does not offer a shopping list")
    return v


def _item_read(item: models.ShoppingListItem) -> schemas.ShoppingListItemRead:
    product = item.product
    return schemas.ShoppingListItemRead(
        id=item.id,
        product_id=item.product_id,
        product_title_he=product.title_he,
        product_title_en=product.title_en,
        product_title_fr=product.title_fr,
        product_title_yi=product.title_yi,
        product_image_url=product.image_url,
        product_price=product.price,
        product_sale_price=product.sale_price,
        product_is_active=product.is_active,
        quantity=item.quantity,
        created_at=item.created_at,
    )


def _list_query(db: Session, user_id: int, vertical: str):
    return (
        db.query(models.ShoppingListItem)
        .join(models.Product, models.ShoppingListItem.product_id == models.Product.id)
        .filter(models.ShoppingListItem.user_id == user_id, models.Product.vertical == vertical)
        .options(selectinload(models.ShoppingListItem.product))
    )


@router.get("/shopping-list", response_model=List[schemas.ShoppingListItemRead])
def get_shopping_list(
    vertical: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Returns the user's saved shopping list for one world. If they have no items yet for this
    world, auto-seeds it once from their own purchase history (see services/purchase_history.py) —
    this is what makes the very first visit already populated with zero clicks. Subsequent visits
    never re-seed automatically, so a user's own edits (removed items, adjusted quantities) are
    never silently overwritten by a later purchase — see POST /shopping-list/refresh for the
    explicit opt-in version of that."""
    _validate_shopping_list_vertical(db, vertical)
    items = _list_query(db, current_user.id, vertical).order_by(models.ShoppingListItem.created_at.asc()).all()
    if not items:
        history = get_user_purchase_history(db, current_user.id, vertical)
        if history:
            for entry in history:
                db.add(
                    models.ShoppingListItem(
                        user_id=current_user.id,
                        product_id=entry["product"].id,
                        quantity=entry["last_quantity"],
                    )
                )
            db.commit()
            items = _list_query(db, current_user.id, vertical).order_by(models.ShoppingListItem.created_at.asc()).all()
    return [_item_read(i) for i in items]


@router.post("/shopping-list/refresh", response_model=List[schemas.ShoppingListItemRead])
def refresh_shopping_list(
    vertical: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Adds any purchase-history products for this world not already on the list, without
    touching existing rows/quantities — the explicit "add more from my history" action."""
    _validate_shopping_list_vertical(db, vertical)
    existing_product_ids = {
        pid for (pid,) in db.query(models.ShoppingListItem.product_id)
        .join(models.Product, models.ShoppingListItem.product_id == models.Product.id)
        .filter(models.ShoppingListItem.user_id == current_user.id, models.Product.vertical == vertical)
        .all()
    }
    history = get_user_purchase_history(db, current_user.id, vertical)
    for entry in history:
        if entry["product"].id not in existing_product_ids:
            db.add(
                models.ShoppingListItem(
                    user_id=current_user.id,
                    product_id=entry["product"].id,
                    quantity=entry["last_quantity"],
                )
            )
    db.commit()
    items = _list_query(db, current_user.id, vertical).order_by(models.ShoppingListItem.created_at.asc()).all()
    return [_item_read(i) for i in items]


@router.post("/shopping-list/items", response_model=schemas.ShoppingListItemRead)
def add_shopping_list_item(
    payload: schemas.ShoppingListItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Upsert — adds a new item, or updates the quantity of one already on the list. This is the
    "add others" action: any active product can be added regardless of purchase history."""
    product = db.query(models.Product).filter(models.Product.id == payload.product_id, models.Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    _validate_shopping_list_vertical(db, product.vertical)
    existing = (
        db.query(models.ShoppingListItem)
        .filter(models.ShoppingListItem.user_id == current_user.id, models.ShoppingListItem.product_id == payload.product_id)
        .first()
    )
    if existing:
        existing.quantity = payload.quantity
        db.commit()
        db.refresh(existing)
        return _item_read(existing)
    item = models.ShoppingListItem(user_id=current_user.id, product_id=payload.product_id, quantity=payload.quantity)
    db.add(item)
    db.commit()
    db.refresh(item)
    return _item_read(item)


@router.patch("/shopping-list/items/{item_id}", response_model=schemas.ShoppingListItemRead)
def update_shopping_list_item(
    item_id: int,
    payload: schemas.ShoppingListItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.ShoppingListItem)
        .filter(models.ShoppingListItem.id == item_id, models.ShoppingListItem.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.quantity = payload.quantity
    db.commit()
    db.refresh(item)
    return _item_read(item)


@router.delete("/shopping-list/items/{item_id}", status_code=204)
def remove_shopping_list_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.ShoppingListItem)
        .filter(models.ShoppingListItem.id == item_id, models.ShoppingListItem.user_id == current_user.id)
        .first()
    )
    if item:
        db.delete(item)
        db.commit()
