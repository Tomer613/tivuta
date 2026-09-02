import os
from html import escape as html_escape
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..security import get_current_admin, get_current_user, get_db, verify_cron_secret
from ..services import get_email_sender
from ..services.purchase_history import get_user_purchase_history
from .products import resolve_active_quantity_discount_fields

router = APIRouter(tags=["shopping_list"])

APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:3000")


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
    bundle_id, tiers = resolve_active_quantity_discount_fields(product)
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
        quantity_discount_bundle_id=bundle_id,
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
        # Two DIFFERENT causes land here, and only one of them is safe to silently swallow:
        # (a) two concurrent replace requests for the same user/vertical (e.g. the cart page open
        #     in two tabs) racing their delete+insert sequences into the unique constraint — both
        #     requests wanted "replace with my current cart," so there's no correct ordering to
        #     enforce and returning whatever the other one left in place is a fine resolution;
        # (b) a genuine failure — a product referenced in `payload.items` was hard-deleted between
        #     the validation query above and this commit, tripping the product_id FK constraint —
        #     where the whole transaction rolled back to the PRE-request state, and silently
        #     returning 200 would tell the caller "saved" when nothing they asked for was saved.
        # Distinguish them by re-checking the requested products still exist post-rollback.
        db.rollback()
        still_valid_ids = {
            pid for (pid,) in db.query(models.Product.id).filter(models.Product.id.in_(merged_quantities.keys())).all()
        }
        missing = [pid for pid in merged_quantities if pid not in still_valid_ids]
        if missing:
            raise HTTPException(status_code=400, detail=f"Product(s) no longer available: {missing}")
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
        # This endpoint's own contract is "upsert — updates the quantity of one already on the
        # list" — losing the insert race doesn't change what THIS request actually asked for, so
        # apply its quantity to the winning row rather than silently discarding it in favor of
        # whatever the other request happened to submit.
        winner.quantity = payload.quantity
        db.commit()
        db.refresh(winner)
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


_REMINDER_SUBJECT = {
    "he": "זמן להזמין קידוש? 🥂",
    "en": "Time to order Kiddush? 🥂",
    "fr": "L'heure de commander le kiddouch ? 🥂",
    "yi": "צייט צו באשטעלן קידוש? 🥂",
}
_REMINDER_BODY = {
    "he": '<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;"><h2 style="color:#b8860b;">תזכורת שבועית — <span dir="ltr">TIVUTA</span></h2><p>שלום {name},</p><p>יש לך {count} פריטים ברשימת הקניות שלך ל{world}. זה הזמן לבדוק ולהזמין לשבת הקרובה.</p><p><a href="{link}" style="color:#b8860b;">פתח את רשימת הקניות שלי</a></p></div>',
    "en": '<p>Hi {name}, you have {count} items on your {world} shopping list. Now\'s a good time to review and order for this week.</p><p><a href="{link}">Open my shopping list</a></p>',
    "fr": '<p>Bonjour {name}, vous avez {count} articles dans votre liste de courses {world}. C\'est le bon moment pour vérifier et commander pour cette semaine.</p><p><a href="{link}">Ouvrir ma liste de courses</a></p>',
    "yi": '<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;"><p>שלום {name},</p><p>איר האט {count} פריטים אויף אייער {world} קוילע רשימה. איצט איז א גוטע צייט צו קוקן דורך און באשטעלן פאר די וואך.</p><p><a href="{link}" style="color:#b8860b;">עפֿן מיין קוילע רשימה</a></p></div>',
}
_REMINDER_NOTIF_TITLE = {
    "he": "זמן להזמין קידוש?",
    "en": "Time to order Kiddush?",
    "fr": "L'heure de commander le kiddouch ?",
    "yi": "צייט צו באשטעלן קידוש?",
}
_REMINDER_NOTIF_MESSAGE = {
    "he": "יש לך {count} פריטים ברשימת הקניות שלך ל{world}",
    "en": "You have {count} items on your {world} shopping list",
    "fr": "Vous avez {count} articles dans votre liste {world}",
    "yi": "איר האט {count} פריטים אויף אייער {world} רשימה",
}


def _send_weekly_shopping_list_reminders(db: Session) -> int:
    """Sends one reminder (email + in-app notification) per (user, world) that currently has a
    non-empty shopping list in an enables_shopping_list world — the "subscription-style weekly
    order" nudge: a gabbai's saved list sits there passively otherwise, with nothing prompting
    them to actually revisit and check out before Shabbat. Shared by the admin manual-trigger and
    the weekly cron entry points below so the two can't drift. No de-duplication/throttling beyond
    the weekly cron cadence itself — same "an admin can re-trigger and re-send" trade-off already
    accepted by the existing send_followup_reminders endpoint."""
    rows = (
        db.query(models.ShoppingListItem.user_id, models.Product.vertical, models.Vertical.label_he)
        .join(models.Product, models.ShoppingListItem.product_id == models.Product.id)
        .join(models.Vertical, models.Vertical.slug == models.Product.vertical)
        .filter(models.Vertical.enables_shopping_list == True)
        .group_by(models.ShoppingListItem.user_id, models.Product.vertical, models.Vertical.label_he)
        .all()
    )
    if not rows:
        return 0

    user_ids = {r[0] for r in rows}
    users_by_id = {u.id: u for u in db.query(models.User).filter(models.User.id.in_(user_ids)).all()}
    email_sender = get_email_sender()
    sent = 0
    for user_id, vertical_slug, vertical_label in rows:
        user = users_by_id.get(user_id)
        if not user:
            continue
        locale = user.preferred_language or "he"
        count = (
            db.query(models.ShoppingListItem)
            .join(models.Product, models.ShoppingListItem.product_id == models.Product.id)
            .filter(models.ShoppingListItem.user_id == user_id, models.Product.vertical == vertical_slug)
            .count()
        )
        link = f"{APP_BASE_URL}/{locale}/shopping-list?vertical={vertical_slug}"
        safe_name = html_escape(user.first_name)
        safe_world = html_escape(vertical_label)
        try:
            email_sender.send(
                to=user.email,
                subject=_REMINDER_SUBJECT.get(locale, _REMINDER_SUBJECT["he"]),
                html_body=_REMINDER_BODY.get(locale, _REMINDER_BODY["he"]).format(
                    name=safe_name, count=count, world=safe_world, link=link
                ),
                locale=locale,
            )
        except Exception:
            pass
        db.add(models.Notification(
            user_id=user_id,
            type="shopping_list_reminder",
            title=_REMINDER_NOTIF_TITLE.get(locale, _REMINDER_NOTIF_TITLE["he"]),
            message=_REMINDER_NOTIF_MESSAGE.get(locale, _REMINDER_NOTIF_MESSAGE["he"]).format(count=count, world=safe_world),
            locale=locale,
            link=f"/shopping-list?vertical={vertical_slug}",
        ))
        sent += 1
    db.commit()
    return sent


@router.post("/admin/shopping-list/send-weekly-reminders", dependencies=[Depends(get_current_admin)])
def admin_send_weekly_shopping_list_reminders(db: Session = Depends(get_db)):
    """Manual "send reminders now" trigger — same effect as the weekly cron, for an admin who
    wants to nudge everyone without waiting for the scheduled run."""
    sent = _send_weekly_shopping_list_reminders(db)
    return {"sent": sent}


@router.post("/api/shopping-list/send-weekly-reminders")
def cron_send_weekly_shopping_list_reminders(request: Request, db: Session = Depends(get_db)):
    """Cron endpoint — called by GitHub Actions weekly. Same Authorization: Bearer <CRON_SECRET>
    check as every other cron-triggered endpoint (no admin JWT exists in a cron context)."""
    verify_cron_secret(request)
    sent = _send_weekly_shopping_list_reminders(db)
    return {"sent": sent}
