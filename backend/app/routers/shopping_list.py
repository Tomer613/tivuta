import os
from html import escape as html_escape
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..security import get_current_admin, get_current_user, get_db, verify_cron_secret
from ..services import get_email_sender
from ..services.purchase_history import get_user_purchase_history
from .products import resolve_active_quantity_discount_fields
from .verticals import batch_users_and_verticals, resolve_vertical_label

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


def _get_owned_list(db: Session, list_id: int, user_id: int) -> models.ShoppingList:
    lst = (
        db.query(models.ShoppingList)
        .filter(models.ShoppingList.id == list_id, models.ShoppingList.user_id == user_id)
        .first()
    )
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    return lst


def _item_read(item: models.ShoppingListItem) -> schemas.ShoppingListItemRead:
    product = item.product
    bundle_id, tiers = resolve_active_quantity_discount_fields(product)
    return schemas.ShoppingListItemRead(
        id=item.id,
        shopping_list_id=item.shopping_list_id,
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


def _items_query(db: Session, list_id: int):
    return (
        db.query(models.ShoppingListItem)
        .filter(models.ShoppingListItem.shopping_list_id == list_id)
        .options(
            selectinload(models.ShoppingListItem.product)
            .selectinload(models.Product.quantity_discount_bundle)
            .selectinload(models.QuantityDiscountBundle.tiers)
        )
        .order_by(models.ShoppingListItem.created_at.asc())
    )


def _seed_items_from_history(db: Session, list_id: int, user_id: int, vertical: str) -> None:
    history = get_user_purchase_history(db, user_id, vertical)
    for entry in history:
        db.add(
            models.ShoppingListItem(
                shopping_list_id=list_id,
                product_id=entry["product"].id,
                quantity=entry["last_quantity"],
            )
        )


def _list_summary(db: Session, lst: models.ShoppingList) -> schemas.ShoppingListSummary:
    count = db.query(models.ShoppingListItem).filter(models.ShoppingListItem.shopping_list_id == lst.id).count()
    return schemas.ShoppingListSummary(id=lst.id, name=lst.name, item_count=count, created_at=lst.created_at)


def _list_detail(db: Session, lst: models.ShoppingList) -> schemas.ShoppingListDetail:
    items = _items_query(db, lst.id).all()
    return schemas.ShoppingListDetail(
        id=lst.id, name=lst.name, vertical=lst.vertical, items=[_item_read(i) for i in items]
    )


@router.get("/shopping-lists", response_model=List[schemas.ShoppingListSummary])
def get_shopping_lists(
    vertical: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Returns the user's saved shopping lists for one world. If they have none yet, auto-creates
    and seeds ONE from their own purchase history (see services/purchase_history.py) — this is
    what makes the very first visit already populated with zero clicks. A list created afterwards
    via POST /shopping-lists always starts empty — a deliberately separate list (e.g. a holiday
    variant) should never be pre-filled with the regular weekly items."""
    vert = _validate_shopping_list_vertical(db, vertical)
    lists = (
        db.query(models.ShoppingList)
        .filter(models.ShoppingList.user_id == current_user.id, models.ShoppingList.vertical == vertical)
        .order_by(models.ShoppingList.created_at.asc())
        .all()
    )
    if not lists:
        lst = models.ShoppingList(user_id=current_user.id, vertical=vertical, name=vert.label_he)
        db.add(lst)
        db.flush()
        _seed_items_from_history(db, lst.id, current_user.id, vertical)
        db.commit()
        lists = [lst]
    return [_list_summary(db, lst) for lst in lists]


@router.post("/shopping-lists", response_model=schemas.ShoppingListSummary)
def create_shopping_list(
    vertical: str,
    payload: schemas.ShoppingListCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _validate_shopping_list_vertical(db, vertical)
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    lst = models.ShoppingList(user_id=current_user.id, vertical=vertical, name=name)
    db.add(lst)
    db.commit()
    db.refresh(lst)
    return _list_summary(db, lst)


@router.get("/shopping-lists/{list_id}", response_model=schemas.ShoppingListDetail)
def get_shopping_list_detail(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    lst = _get_owned_list(db, list_id, current_user.id)
    return _list_detail(db, lst)


@router.patch("/shopping-lists/{list_id}", response_model=schemas.ShoppingListSummary)
def rename_shopping_list(
    list_id: int,
    payload: schemas.ShoppingListRename,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    lst = _get_owned_list(db, list_id, current_user.id)
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    lst.name = name
    db.commit()
    db.refresh(lst)
    return _list_summary(db, lst)


@router.delete("/shopping-lists/{list_id}", status_code=204)
def delete_shopping_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    lst = _get_owned_list(db, list_id, current_user.id)
    db.delete(lst)
    db.commit()


@router.get("/shopping-list/ids")
def get_shopping_list_ids(
    vertical: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lightweight companion for "already on my list" badges on product tiles — mirrors
    GET /favorites/ids exactly (bare id list). Deliberately kept as the old singular
    /shopping-list/ids path/shape: a badge doesn't care which specific list a product is on, only
    whether it's on ANY of the user's lists for this world, so this is a union across all of them.
    Never auto-seeds — this is a frequent, passive read on every listing-page load, not a "the user
    is opening their list" moment."""
    _validate_shopping_list_vertical(db, vertical)
    rows = (
        db.query(models.ShoppingListItem.product_id)
        .join(models.ShoppingList, models.ShoppingListItem.shopping_list_id == models.ShoppingList.id)
        .filter(models.ShoppingList.user_id == current_user.id, models.ShoppingList.vertical == vertical)
        .distinct()
        .all()
    )
    return [r[0] for r in rows]


@router.put("/shopping-lists/{list_id}", response_model=schemas.ShoppingListDetail)
def replace_shopping_list(
    list_id: int,
    payload: schemas.ShoppingListReplaceRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Wholesale replace — the cart page's "save current cart as my shopping list" action. Unlike
    every other endpoint here (which only ever adds/edits one row at a time), this discards this
    ONE list's existing items and rebuilds it from the given items."""
    lst = _get_owned_list(db, list_id, current_user.id)
    merged_quantities: dict[int, int] = {}
    for item in payload.items:
        merged_quantities[item.product_id] = merged_quantities.get(item.product_id, 0) + item.quantity

    if merged_quantities:
        products = db.query(models.Product).filter(models.Product.id.in_(merged_quantities.keys())).all()
        products_by_id = {p.id: p for p in products}
        bad_ids = [
            pid for pid in merged_quantities
            if pid not in products_by_id or products_by_id[pid].vertical != lst.vertical or not products_by_id[pid].is_active
        ]
        if bad_ids:
            raise HTTPException(status_code=400, detail=f"Invalid product(s) for this world: {bad_ids}")

    db.query(models.ShoppingListItem).filter(models.ShoppingListItem.shopping_list_id == list_id).delete(
        synchronize_session=False
    )
    for product_id, quantity in merged_quantities.items():
        db.add(models.ShoppingListItem(shopping_list_id=list_id, product_id=product_id, quantity=min(quantity, 99)))
    try:
        db.commit()
    except IntegrityError:
        # Two DIFFERENT causes land here, and only one of them is safe to silently swallow:
        # (a) two concurrent replace requests for the same list (e.g. the cart page open in two
        #     tabs) racing their delete+insert sequences into the unique constraint — both
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
    return _list_detail(db, lst)


@router.post("/shopping-lists/{list_id}/refresh", response_model=schemas.ShoppingListDetail)
def refresh_shopping_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Adds any purchase-history products for this world not already on THIS list, without
    touching existing rows/quantities — the explicit "add more from my history" action."""
    lst = _get_owned_list(db, list_id, current_user.id)
    existing_product_ids = {
        pid for (pid,) in db.query(models.ShoppingListItem.product_id)
        .filter(models.ShoppingListItem.shopping_list_id == list_id)
        .all()
    }
    history = get_user_purchase_history(db, current_user.id, lst.vertical)
    for entry in history:
        if entry["product"].id not in existing_product_ids:
            db.add(
                models.ShoppingListItem(
                    shopping_list_id=list_id,
                    product_id=entry["product"].id,
                    quantity=entry["last_quantity"],
                )
            )
    db.commit()
    return _list_detail(db, lst)


@router.post("/shopping-lists/{list_id}/items", response_model=schemas.ShoppingListItemRead)
def add_shopping_list_item(
    list_id: int,
    payload: schemas.ShoppingListItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Upsert — adds a new item, or updates the quantity of one already on this list. Any active
    product from the same world can be added regardless of purchase history."""
    lst = _get_owned_list(db, list_id, current_user.id)
    product = db.query(models.Product).filter(models.Product.id == payload.product_id, models.Product.is_active == True).first()
    if not product or product.vertical != lst.vertical:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = (
        db.query(models.ShoppingListItem)
        .filter(models.ShoppingListItem.shopping_list_id == list_id, models.ShoppingListItem.product_id == payload.product_id)
        .first()
    )
    if existing:
        existing.quantity = payload.quantity
        db.commit()
        db.refresh(existing)
        return _item_read(existing)
    item = models.ShoppingListItem(shopping_list_id=list_id, product_id=payload.product_id, quantity=payload.quantity)
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
            .filter(models.ShoppingListItem.shopping_list_id == list_id, models.ShoppingListItem.product_id == payload.product_id)
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


@router.patch("/shopping-list-items/{item_id}", response_model=schemas.ShoppingListItemRead)
def update_shopping_list_item(
    item_id: int,
    payload: schemas.ShoppingListItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.ShoppingListItem)
        .join(models.ShoppingList, models.ShoppingListItem.shopping_list_id == models.ShoppingList.id)
        .filter(models.ShoppingListItem.id == item_id, models.ShoppingList.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.quantity = payload.quantity
    db.commit()
    db.refresh(item)
    return _item_read(item)


@router.delete("/shopping-list-items/{item_id}", status_code=204)
def remove_shopping_list_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.ShoppingListItem)
        .join(models.ShoppingList, models.ShoppingListItem.shopping_list_id == models.ShoppingList.id)
        .filter(models.ShoppingListItem.id == item_id, models.ShoppingList.user_id == current_user.id)
        .first()
    )
    if item:
        db.delete(item)
        db.commit()


_REMINDER_SUBJECT = {
    "he": "זמן להזמין {world}? 🛒",
    "en": "Time to order {world}? 🛒",
    "fr": "L'heure de commander {world} ? 🛒",
    "yi": "צייט צו באשטעלן {world}? 🛒",
}
_REMINDER_BODY = {
    "he": '<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;"><h2 style="color:#b8860b;">תזכורת שבועית — <span dir="ltr">TIVUTA</span></h2><p>שלום {name},</p><p>יש לך {count} פריטים ברשימה "{list_name}" שלך ל{world}. זה הזמן לבדוק ולהזמין לשבוע הקרוב.</p><p><a href="{link}" style="color:#b8860b;">פתח את רשימת הקניות שלי</a></p></div>',
    "en": '<p>Hi {name}, you have {count} items on your "{list_name}" ({world}) shopping list. Now\'s a good time to review and order for this week.</p><p><a href="{link}">Open my shopping list</a></p>',
    "fr": '<p>Bonjour {name}, vous avez {count} articles dans votre liste « {list_name} » ({world}). C\'est le bon moment pour vérifier et commander pour cette semaine.</p><p><a href="{link}">Ouvrir ma liste de courses</a></p>',
    "yi": '<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;"><p>שלום {name},</p><p>איר האט {count} פריטים אויף אייער "{list_name}" ({world}) קוילע רשימה. איצט איז א גוטע צייט צו קוקן דורך און באשטעלן פאר די וואך.</p><p><a href="{link}" style="color:#b8860b;">עפֿן מיין קוילע רשימה</a></p></div>',
}
_REMINDER_NOTIF_TITLE = {
    "he": "זמן להזמין {world}?",
    "en": "Time to order {world}?",
    "fr": "L'heure de commander {world} ?",
    "yi": "צייט צו באשטעלן {world}?",
}
_REMINDER_NOTIF_MESSAGE = {
    "he": 'יש לך {count} פריטים ברשימה "{list_name}"',
    "en": 'You have {count} items on your "{list_name}" list',
    "fr": 'Vous avez {count} articles dans votre liste « {list_name} »',
    "yi": 'איר האט {count} פריטים אויף אייער "{list_name}" רשימה',
}


def _send_weekly_shopping_list_reminders(db: Session) -> int:
    """Sends one reminder (email + in-app notification) per non-empty ShoppingList in an
    enables_shopping_list world — the "subscription-style weekly order" nudge: a gabbai's saved
    list sits there passively otherwise, with nothing prompting them to actually revisit and check
    out before Shabbat. One email per LIST (not per user/vertical) so a gabbai juggling several
    named lists gets a reminder naming each one specifically. Shared by the admin manual-trigger
    and the weekly cron entry points below so the two can't drift. No de-duplication/throttling
    beyond the weekly cron cadence itself — same "an admin can re-trigger and re-send" trade-off
    already accepted by the existing send_followup_reminders endpoint."""
    lists = (
        db.query(models.ShoppingList)
        .join(models.Vertical, models.Vertical.slug == models.ShoppingList.vertical)
        .filter(models.Vertical.enables_shopping_list == True)
        .all()
    )
    if not lists:
        return 0

    counts_by_list_id = dict(
        db.query(models.ShoppingListItem.shopping_list_id, func.count(models.ShoppingListItem.id))
        .group_by(models.ShoppingListItem.shopping_list_id)
        .all()
    )
    non_empty_lists = [lst for lst in lists if counts_by_list_id.get(lst.id)]
    if not non_empty_lists:
        return 0

    user_ids = {lst.user_id for lst in non_empty_lists}
    vertical_slugs = {lst.vertical for lst in non_empty_lists}
    users_by_id, verticals_by_slug = batch_users_and_verticals(db, user_ids, vertical_slugs)
    email_sender = get_email_sender()
    sent = 0
    for lst in non_empty_lists:
        user = users_by_id.get(lst.user_id)
        vertical = verticals_by_slug.get(lst.vertical)
        if not user or not vertical:
            continue
        locale = user.preferred_language or "he"
        count = counts_by_list_id[lst.id]
        link = f"{APP_BASE_URL}/{locale}/shopping-list?vertical={lst.vertical}&list={lst.id}"
        safe_name = html_escape(user.first_name)
        safe_list_name = html_escape(lst.name)
        # This feature is generic — any enables_shopping_list world, not just Kiddush — so the
        # world's own name is always interpolated in rather than assuming which world it is.
        safe_world = html_escape(resolve_vertical_label(vertical, locale))
        try:
            email_sender.send(
                to=user.email,
                subject=_REMINDER_SUBJECT.get(locale, _REMINDER_SUBJECT["he"]).format(world=safe_world),
                html_body=_REMINDER_BODY.get(locale, _REMINDER_BODY["he"]).format(
                    name=safe_name, count=count, world=safe_world, list_name=safe_list_name, link=link
                ),
                locale=locale,
            )
        except Exception:
            pass
        db.add(models.Notification(
            user_id=lst.user_id,
            type="shopping_list_reminder",
            title=_REMINDER_NOTIF_TITLE.get(locale, _REMINDER_NOTIF_TITLE["he"]).format(world=safe_world),
            message=_REMINDER_NOTIF_MESSAGE.get(locale, _REMINDER_NOTIF_MESSAGE["he"]).format(
                count=count, list_name=safe_list_name
            ),
            locale=locale,
            link=f"/shopping-list?vertical={lst.vertical}&list={lst.id}",
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
