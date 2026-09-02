from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
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
    # Same "active bundle only" rule as _active_quantity_discount() in routers/products.py — a
    # deactivated bundle's discount must never resurface here.
    bundle = product.quantity_discount_bundle
    has_active_bundle = bundle is not None and bundle.is_active
    tiers = (
        [schemas.QuantityDiscountTierBase(min_quantity=t.min_quantity, discount_percent=t.discount_percent) for t in bundle.tiers]
        if has_active_bundle else None
    )
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
        quantity_discount_bundle_id=bundle.id if has_active_bundle else None,
        quantity_discount_tiers=tiers,
        product_is_active=product.is_active,
        quantity=item.quantity,
        created_at=item.created_at,
    )


def _list_query(db: Session, user_id: int, vertical: str):
    return (
        db.query(models.ShoppingListItem)
        .join(models.Product, models.ShoppingListItem.product_id == models.Product.id)
        .filter(models.ShoppingListItem.user_id == user_id, models.Product.vertical == vertical)
        .options(
            selectinload(models.ShoppingListItem.product)
            .selectinload(models.Product.quantity_discount_bundle)
            .selectinload(models.QuantityDiscountBundle.tiers)
        )
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


@router.get("/shopping-list/ids")
def get_shopping_list_ids(
    vertical: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lightweight companion to GET /shopping-list — mirrors GET /favorites/ids exactly (bare id
    list, no nested product objects), for cheaply marking "already on my list" badges on product
    tiles while browsing a world. Deliberately does NOT auto-seed like the full GET does — this is
    a frequent, passive read called on every listing-page load, not a "the user is opening their
    list" moment, so it should never have the side effect of creating rows."""
    _validate_shopping_list_vertical(db, vertical)
    rows = (
        db.query(models.ShoppingListItem.product_id)
        .join(models.Product, models.ShoppingListItem.product_id == models.Product.id)
        .filter(models.ShoppingListItem.user_id == current_user.id, models.Product.vertical == vertical)
        .all()
    )
    return [r[0] for r in rows]


@router.put("/shopping-list", response_model=List[schemas.ShoppingListItemRead])
def replace_shopping_list(
    vertical: str,
    payload: schemas.ShoppingListReplaceRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Wholesale replace — the cart page's "save current cart as my shopping list" action. Unlike
    every other endpoint here (which only ever adds/edits one row at a time), this discards the
    user's existing list for this vertical and rebuilds it from the given items, so "what's in my
    cart right now" can become "my new normal" in one step instead of manually re-adding each item."""
    _validate_shopping_list_vertical(db, vertical)
    merged_quantities: dict[int, int] = {}
    for item in payload.items:
        merged_quantities[item.product_id] = merged_quantities.get(item.product_id, 0) + item.quantity

    if merged_quantities:
        products = db.query(models.Product).filter(models.Product.id.in_(merged_quantities.keys())).all()
        products_by_id = {p.id: p for p in products}
        bad_ids = [
            pid for pid in merged_quantities
            if pid not in products_by_id or products_by_id[pid].vertical != vertical or not products_by_id[pid].is_active
        ]
        if bad_ids:
            raise HTTPException(status_code=400, detail=f"Invalid product(s) for this world: {bad_ids}")

    db.query(models.ShoppingListItem).filter(
        models.ShoppingListItem.user_id == current_user.id,
        models.ShoppingListItem.product_id.in_(
            db.query(models.Product.id).filter(models.Product.vertical == vertical)
        ),
    ).delete(synchronize_session=False)
    for product_id, quantity in merged_quantities.items():
        db.add(models.ShoppingListItem(user_id=current_user.id, product_id=product_id, quantity=min(quantity, 99)))
    try:
        db.commit()
    except IntegrityError:
        # Two concurrent replace requests for the same user/vertical (e.g. the cart page open in
        # two tabs) can race their delete+insert sequences into the uq_user_product_shopping_list_item
        # constraint. Both requests wanted "replace with my current cart" — there's no correct
        # ordering to enforce, so just roll back this one and return whatever the other request's
        # write left in place, rather than surfacing an unhandled 500.
        db.rollback()
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
    try:
        db.commit()
    except IntegrityError:
        # A concurrent add of the same product (e.g. a double-submit) can race past the `existing`
        # check above and both try to insert — same shape as the replace_shopping_list race. Fall
        # back to the row the other request just created instead of a raw 500.
        db.rollback()
        winner = (
            db.query(models.ShoppingListItem)
            .filter(models.ShoppingListItem.user_id == current_user.id, models.ShoppingListItem.product_id == payload.product_id)
            .first()
        )
        if winner is None:
            # Not a duplicate-add race after all — the FK constraint on product_id is what
            # actually fired (e.g. the product was hard-deleted concurrently with this request).
            # Nothing was left behind by "the other request" to fall back to, so this really is a
            # 404, not a race to recover from.
            raise HTTPException(status_code=404, detail="Product not found")
        return _item_read(winner)
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
