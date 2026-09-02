import os
import secrets
import uuid
from datetime import datetime, timedelta
from html import escape as html_escape
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..security import get_current_admin, get_current_user, get_db
from ..services import get_email_sender
from ..services.inventory import reserve_or_release_stock_for_lead
from ..services.orders import cancel_order
from ..services.pricing import compute_effective_unit_price
from ..services.purchase_history import get_user_purchase_history
from .products import resolve_active_quantity_discount_fields

router = APIRouter(tags=["leads"])

# ── Change this env-var in production to redirect admin notifications ──────────
ADMIN_NOTIFICATION_EMAIL = os.environ.get("ADMIN_NOTIFICATION_EMAIL", "support@tivuta.co.il")
APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:3000")
ORDER_CONFIRMATION_WINDOW_HOURS = 24

CONFIRMATION_SUBJECT = {
    "he": "אישור פנייה - TIVUTA",
    "en": "Request confirmation - TIVUTA",
    "fr": "Confirmation de demande - TIVUTA",
    "yi": "באשטעטיגונג - TIVUTA",
}


def _admin_notification_body(user: models.User, product_title: str, lead_type: str, scheduled_at) -> str:
    type_label = "פגישה" if lead_type == "appointment" else "פנייה"
    scheduled_line = f"<p><strong>מועד פגישה:</strong> {scheduled_at}</p>" if scheduled_at else ""
    return f"""
    <div dir="rtl" style="font-family:Arial,sans-serif;color:#111;">
      <h2 style="color:#b8860b;">פנייה חדשה ב-<span dir="ltr">TIVUTA</span> 🔔</h2>
      <p><strong>סוג:</strong> {type_label}</p>
      <p><strong>מוצר:</strong> {product_title}</p>
      <hr/>
      <p><strong>שם:</strong> {user.first_name} {user.last_name}</p>
      <p><strong>מייל:</strong> <a href="mailto:{user.email}">{user.email}</a></p>
      <p><strong>טלפון:</strong> {user.phone or '—'}</p>
      {scheduled_line}
    </div>"""


CONTACT_CONFIRMATION_BODY = {
    "he": "<p>תודה על פנייתך. קיבלנו את ההודעה שלך ונציג שלנו ייצור איתך קשר בהקדם.</p>",
    "en": "<p>Thank you for your message. We've received it and a representative will get back to you shortly.</p>",
    "fr": "<p>Merci pour votre message. Nous l'avons bien reçu et un représentant vous recontactera sous peu.</p>",
    "yi": "<p>אַ דאַנק פֿאַר אײַער מעלדונג. מיר האָבן עס באַקומען און וועלן זיך אײַך אָנרופֿן באַלד.</p>",
}


def _contact_admin_notification_body(user: models.User, subject: str, message: str) -> str:
    return f"""
    <div dir="rtl" style="font-family:Arial,sans-serif;color:#111;">
      <h2 style="color:#b8860b;">פנייה כללית חדשה ב-<span dir="ltr">TIVUTA</span> 📩</h2>
      <p><strong>נושא:</strong> {subject}</p>
      <p><strong>הודעה:</strong> {message}</p>
      <hr/>
      <p><strong>שם:</strong> {user.first_name} {user.last_name}</p>
      <p><strong>מייל:</strong> <a href="mailto:{user.email}">{user.email}</a></p>
      <p><strong>טלפון:</strong> {user.phone or '—'}</p>
    </div>"""


_CONFIRMATION_BODY_SCHEDULED = {
    "he": "<p>תודה שקבעת פגישה להתרשמות עבור <strong>{title}</strong>.</p><p>נציג שלנו ייצור איתך קשר לאישור הפרטים.</p>",
    "en": "<p>Thank you for scheduling an appointment for <strong>{title}</strong>.</p><p>Our representative will contact you to confirm the details.</p>",
    "fr": "<p>Merci d'avoir programmé un rendez-vous pour <strong>{title}</strong>.</p><p>Notre représentant vous contactera pour confirmer les détails.</p>",
    "yi": "<p>אַ דאַנק וואָס איר האָט פארטיילט אַ טרעפונג פאר <strong>{title}</strong>.</p><p>אונדזער פארשטייער וועט זיך מיט אײַך פארבינדן צו באַשטעטיגן די פרטים.</p>",
}
_CONFIRMATION_BODY_UNSCHEDULED = {
    "he": "<p>תודה על פנייתך בנושא <strong>{title}</strong>.</p><p>נציג שלנו ייצור איתך קשר בהקדם.</p>",
    "en": "<p>Thank you for your interest in <strong>{title}</strong>.</p><p>Our representative will reach out to you shortly.</p>",
    "fr": "<p>Merci pour votre intérêt concernant <strong>{title}</strong>.</p><p>Notre représentant vous contactera sous peu.</p>",
    "yi": "<p>אַ דאַנק פֿאַר אײַער אינטערעס אין <strong>{title}</strong>.</p><p>אונדזער פארשטייער וועט זיך באַלד מיט אײַך פארבינדן.</p>",
}


def _confirmation_body(locale: str, product_title: str, scheduled_at):
    template = _CONFIRMATION_BODY_SCHEDULED if scheduled_at else _CONFIRMATION_BODY_UNSCHEDULED
    return template.get(locale, template["he"]).format(title=product_title)


def _resolve_orderer_context(db: Session, user: models.User, products: List[models.Product]) -> tuple[str, dict, bool]:
    """Determines which "hat" (member vs gabbai) an order should be filed under, based on the
    vertical(s) of the products involved — see Vertical.requires_gabbai. Shared by create_lead
    (appointments) and cart_checkout so both order-creation paths agree on the same logic instead
    of drifting.

    Raises 400 if the products span both a gabbai-required vertical and an ordinary one (checkout
    must be split into two orders), or if a gabbai-required vertical is being ordered by a user
    who hasn't completed gabbai registration yet.

    Returns (orderer_role, snapshot_fields, allows_custom_note):
    - snapshot_fields is a dict of CustomerOrder kwargs, empty for a plain "member" order, or the
      4 gabbai_*_snapshot fields (copied from the user's *current* profile at this exact moment,
      never re-derived later) for a "gabbai" order.
    - allows_custom_note is True iff at least one product's vertical has
      Vertical.allows_custom_items_note=True — callers must not persist a client-supplied
      custom_items_note unless this is True (see Lead/CustomerOrder model docstring).
    """
    vertical_slugs = {p.vertical for p in products}
    verticals = db.query(models.Vertical).filter(models.Vertical.slug.in_(vertical_slugs)).all()
    requires_gabbai_flags = {v.requires_gabbai for v in verticals}
    allows_custom_note = any(v.allows_custom_items_note for v in verticals)
    if len(verticals) < len(vertical_slugs):
        # A product whose vertical slug has no matching Vertical row (shouldn't normally happen)
        # is treated as not requiring gabbai — same permissive default as the column itself.
        requires_gabbai_flags.add(False)

    if True in requires_gabbai_flags and False in requires_gabbai_flags:
        raise HTTPException(
            status_code=400,
            detail="לא ניתן להזמין פריטי קידושים יחד עם פריטים מעולם אחר באותה הזמנה — יש להזמין בנפרד",
        )

    if True in requires_gabbai_flags:
        if user.role != "gabbai":
            raise HTTPException(status_code=400, detail="יש להשלים רישום כגבאי באזור האישי לפני הזמנה מעולם זה")
        return "gabbai", {
            "gabbai_community_name_snapshot": user.gabbai_community_name,
            "gabbai_synagogue_address_snapshot": user.gabbai_synagogue_address,
            "gabbai_contact_name_snapshot": user.gabbai_contact_name,
            "gabbai_contact_phone_snapshot": user.gabbai_contact_phone,
        }, allows_custom_note

    return "member", {}, allows_custom_note


@router.post("/leads", response_model=schemas.LeadRead)
def create_lead(payload: schemas.LeadCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Creates an appointment lead. Plain product-interest requests (no scheduled_at) are no
    longer accepted here — they go through /leads/cart-checkout instead, so there is exactly one
    code path that creates a product order, whether it came from the cart or a single-click
    "contact me now" button."""
    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    locale = schemas.normalize_locale(current_user.preferred_language or payload.locale)
    vertical = db.query(models.Vertical).filter(models.Vertical.slug == product.vertical).first()
    supports_appointments = bool(vertical and vertical.supports_appointments)
    if not (supports_appointments and payload.scheduled_at):
        raise HTTPException(status_code=400, detail="Use /leads/cart-checkout for product interest requests")
    lead_type = "appointment"

    orderer_role, gabbai_snapshot, _ = _resolve_orderer_context(db, current_user, [product])
    order = models.CustomerOrder(user_id=current_user.id, orderer_role=orderer_role, **gabbai_snapshot)
    db.add(order)
    db.flush()

    new_lead = models.Lead(
        user_id=current_user.id,
        product_id=product.id,
        lead_type=lead_type,
        scheduled_at=payload.scheduled_at,
        status="new",
        channel="web",
        notes=payload.notes,
        locale=locale,
        customer_order_id=order.id,
    )
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)

    product_title = getattr(product, f"title_{locale}", None) or product.title_he
    email_sender = get_email_sender()

    # Confirmation to the user
    email_sender.send(
        to=current_user.email,
        subject=CONFIRMATION_SUBJECT.get(locale, CONFIRMATION_SUBJECT["he"]),
        html_body=_confirmation_body(locale, product_title, payload.scheduled_at),
        locale=locale,
    )

    # Notification to admin
    email_sender.send(
        to=ADMIN_NOTIFICATION_EMAIL,
        subject=f"פנייה חדשה: {product_title} — {current_user.first_name} {current_user.last_name}",
        html_body=_admin_notification_body(current_user, product_title, lead_type, payload.scheduled_at),
        locale="he",
    )

    return new_lead


_CART_CONFIRMATION_BODY = {
    "he": '<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;"><p>תודה על פנייתך. ריכזנו את הבקשה שלך (הזמנה <strong>{order_number}</strong>) עבור {count} מוצרים:</p><ul>{rows}</ul><p>נציג שלנו ייצור איתך קשר בהקדם.</p></div>',
    "en": "<p>Thank you for your interest. We received your request (order <strong>{order_number}</strong>) for {count} products:</p><ul>{rows}</ul><p>Our representative will reach out to you shortly.</p>",
    "fr": "<p>Merci pour votre intérêt. Nous avons bien reçu votre demande (commande <strong>{order_number}</strong>) pour {count} produits :</p><ul>{rows}</ul><p>Notre représentant vous contactera sous peu.</p>",
    "yi": '<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;"><p>אַ דאַנק פֿאַר אײַער אינטערעס. מיר האָבן באַקומען אײַער פארלאנג (בעשטעלונג <strong>{order_number}</strong>) פאר {count} פראָדוקטן:</p><ul>{rows}</ul><p>אונדזער פארשטייער וועט זיך באַלד מיט אײַך פארבינדן.</p></div>',
}


def _cart_confirmation_body(locale: str, items: list, order_number: str) -> str:
    rows = "".join(f"<li>{title} × {qty}</li>" for title, qty in items)
    template = _CART_CONFIRMATION_BODY.get(locale, _CART_CONFIRMATION_BODY["he"])
    return template.format(order_number=order_number, count=len(items), rows=rows)


def _cart_admin_notification_body(user: models.User, items: list, order_number: str, order: "models.CustomerOrder") -> str:
    rows = "".join(f"<li>{title} × {qty}</li>" for title, qty in items)
    gabbai_lines = ""
    if order.orderer_role == "gabbai":
        # community/address are free text the user self-entered via /users/me/register-gabbai —
        # escaped before landing in this raw HTML email string, same reasoning as the custom note.
        community = html_escape(order.gabbai_community_name_snapshot) if order.gabbai_community_name_snapshot else "—"
        address = html_escape(order.gabbai_synagogue_address_snapshot) if order.gabbai_synagogue_address_snapshot else "—"
        gabbai_lines = f"""
      <p><strong>תפקיד מזמין:</strong> גבאי</p>
      <p><strong>קהילה:</strong> {community}</p>
      <p><strong>כתובת בית הכנסת:</strong> {address}</p>"""
    note_line = f"<p><strong>בקשות/מוצרים נוספים:</strong> {html_escape(order.custom_items_note)}</p>" if order.custom_items_note else ""
    return f"""
    <div dir="rtl" style="font-family:Arial,sans-serif;color:#111;">
      <h2 style="color:#b8860b;">בקשת קשר מרוכזת מהסל — הזמנה {order_number} ({len(items)} מוצרים) 🛒</h2>
      <ul>{rows}</ul>
      {note_line}
      <hr/>
      <p><strong>שם:</strong> {user.first_name} {user.last_name}</p>
      <p><strong>מייל:</strong> <a href="mailto:{user.email}">{user.email}</a></p>
      <p><strong>טלפון:</strong> {user.phone or '—'}</p>
      {gabbai_lines}
    </div>"""


@router.post("/leads/cart-checkout", response_model=List[schemas.LeadRead])
def cart_checkout(payload: schemas.CartCheckoutCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Submits every item in the user's cart as one contact_request lead per product, all
    sharing one CustomerOrder, but sends a single consolidated email to the user and to
    admin instead of one per product — the whole point of "checking out" a cart. This is also
    the single code path for "contact me now" on a single product (the frontend just checks out
    a one-item cart), so every product order — batched or single — gets an order number."""
    # Merge quantities for repeated product_ids (e.g. a client-side race adding the same
    # product twice) so checkout never creates two leads for what was one cart line.
    merged_quantities: dict[int, int] = {}
    for item in payload.items:
        merged_quantities[item.product_id] = merged_quantities.get(item.product_id, 0) + item.quantity

    product_ids = list(merged_quantities.keys())
    products = (
        db.query(models.Product)
        .filter(models.Product.id.in_(product_ids))
        .options(selectinload(models.Product.quantity_discount_bundle).selectinload(models.QuantityDiscountBundle.tiers))
        .all()
    )
    products_by_id = {p.id: p for p in products}
    missing = [pid for pid in product_ids if pid not in products_by_id]
    if missing:
        raise HTTPException(status_code=404, detail=f"Product(s) not found: {missing}")

    locale = schemas.normalize_locale(current_user.preferred_language or payload.locale)
    cart_group_id = uuid.uuid4().hex

    # Combined quantity per quantity-discount bundle across this one checkout call — the
    # "cumulative across the bundle's items in the cart" scope decided for this feature. A
    # separate checkout call (e.g. two single-item "contact me now" clicks) does not combine.
    bundle_aggregates: dict[int, int] = {}
    for product_id, quantity in merged_quantities.items():
        bundle_id = products_by_id[product_id].quantity_discount_bundle_id
        if bundle_id is not None:
            bundle_aggregates[bundle_id] = bundle_aggregates.get(bundle_id, 0) + quantity

    orderer_role, gabbai_snapshot, allows_custom_note = _resolve_orderer_context(db, current_user, products)
    # A client-supplied note is only ever persisted when at least one product's vertical actually
    # opted into it (Vertical.allows_custom_items_note) — dropped silently otherwise rather than
    # rejecting the whole checkout over an extraneous field.
    custom_items_note = (payload.custom_items_note or "").strip() or None
    if not allows_custom_note:
        custom_items_note = None
    order = models.CustomerOrder(
        user_id=current_user.id,
        orderer_role=orderer_role,
        custom_items_note=custom_items_note,
        **gabbai_snapshot,
    )
    db.add(order)
    db.flush()

    new_leads = []
    email_items = []
    for product_id, quantity in merged_quantities.items():
        product = products_by_id[product_id]
        product_title = getattr(product, f"title_{locale}", None) or product.title_he
        unit_price, list_price, discount_percent = compute_effective_unit_price(
            product, bundle_aggregates.get(product.quantity_discount_bundle_id, 0)
        )
        lead = models.Lead(
            user_id=current_user.id,
            product_id=product.id,
            lead_type="contact_request",
            status="new",
            channel="web",
            locale=locale,
            quantity=quantity,
            cart_group_id=cart_group_id,
            customer_order_id=order.id,
            unit_price_snapshot=unit_price,
            list_price_snapshot=list_price,
            quantity_discount_percent_snapshot=discount_percent,
        )
        db.add(lead)
        new_leads.append(lead)
        email_items.append((product_title, quantity))

    db.commit()
    for lead in new_leads:
        db.refresh(lead)

    email_sender = get_email_sender()
    try:
        email_sender.send(
            to=current_user.email,
            subject=CONFIRMATION_SUBJECT.get(locale, CONFIRMATION_SUBJECT["he"]),
            html_body=_cart_confirmation_body(locale, email_items, order.order_number),
            locale=locale,
        )
    except Exception:
        pass
    try:
        email_sender.send(
            to=ADMIN_NOTIFICATION_EMAIL,
            subject=f"בקשת קשר מהסל — הזמנה {order.order_number} ({len(email_items)} מוצרים) — {current_user.first_name} {current_user.last_name}",
            html_body=_cart_admin_notification_body(current_user, email_items, order.order_number, order),
            locale="he",
        )
    except Exception:
        pass

    return new_leads


@router.get("/leads/me", response_model=List[schemas.LeadRead])
def my_leads(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Lead).filter(models.Lead.user_id == current_user.id).order_by(models.Lead.created_at.desc()).all()


def _my_order_line_from_lead(lead: models.Lead) -> schemas.MyOrderLineRead:
    product = lead.product
    return schemas.MyOrderLineRead(
        id=lead.id,
        lead_type=lead.lead_type,
        scheduled_at=lead.scheduled_at,
        status=lead.status,
        product_id=lead.product_id,
        product_title_he=product.title_he if product else None,
        product_vertical=product.vertical if product else None,
        product_image_url=product.image_url if product else None,
        product_price=product.price if product else None,
        shipping_address=lead.shipping_address,
        quantity=lead.quantity,
        unit_price_snapshot=lead.unit_price_snapshot,
        list_price_snapshot=lead.list_price_snapshot,
        quantity_discount_percent_snapshot=lead.quantity_discount_percent_snapshot,
        created_at=lead.created_at,
    )


@router.get("/users/me/orders", response_model=List[schemas.MyOrderRead])
def my_orders(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    orders = (
        db.query(models.CustomerOrder)
        .options(selectinload(models.CustomerOrder.leads).selectinload(models.Lead.product))
        .filter(models.CustomerOrder.user_id == current_user.id)
        .order_by(models.CustomerOrder.created_at.desc())
        .all()
    )
    return [
        schemas.MyOrderRead(
            id=order.id,
            order_number=order.order_number,
            status=order.status,
            orderer_role=order.orderer_role,
            gabbai_community_name_snapshot=order.gabbai_community_name_snapshot,
            gabbai_synagogue_address_snapshot=order.gabbai_synagogue_address_snapshot,
            custom_items_note=order.custom_items_note,
            created_at=order.created_at,
            items=[_my_order_line_from_lead(lead) for lead in order.leads if lead.lead_type != "general_inquiry"],
        )
        for order in orders
    ]


@router.get("/users/me/purchase-history", response_model=List[schemas.PurchaseHistoryItem])
def my_purchase_history(
    vertical: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Feeds the cart page's "bought before" strip, the world listing's "my taste" sort and
    "reorder my usual" action — all pure frontend/client-side consumers of this one list, no
    separate backend sort/filter branch needed on GET /products itself (which stays fully
    public/unauthenticated)."""
    history = get_user_purchase_history(db, current_user.id, vertical)
    result = []
    for entry in history:
        product = entry["product"]
        bundle_id, tiers = resolve_active_quantity_discount_fields(product)
        result.append(
            schemas.PurchaseHistoryItem(
                product_id=product.id,
                product_title_he=product.title_he,
                product_title_en=product.title_en,
                product_title_fr=product.title_fr,
                product_title_yi=product.title_yi,
                product_vertical=product.vertical,
                product_image_url=product.image_url,
                product_price=product.price,
                product_sale_price=product.sale_price,
                quantity_discount_bundle_id=bundle_id,
                quantity_discount_tiers=tiers,
                last_quantity=entry["last_quantity"],
                times_purchased=entry["times_purchased"],
                last_purchased_at=entry["last_purchased_at"],
            )
        )
    return result


@router.post("/leads/card-order", response_model=schemas.LeadRead)
def create_card_order(
    payload: schemas.CardOrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Requests a physical loyalty card. The card itself (QR + printing + mailing) is produced
    entirely outside the website — this just creates a fulfillable lead in the existing admin
    queue. Idempotent-ish: a still-open request is returned as-is instead of creating a duplicate,
    so a customer re-clicking "order card" doesn't spam the admin queue."""
    existing = (
        db.query(models.Lead)
        .filter(
            models.Lead.user_id == current_user.id,
            models.Lead.lead_type == "card_order",
            models.Lead.status.in_(["new", "confirmed", "contacted"]),
        )
        .first()
    )
    if existing:
        return existing

    locale = schemas.normalize_locale(current_user.preferred_language or payload.locale)

    order = models.CustomerOrder(user_id=current_user.id)
    db.add(order)
    db.flush()

    new_lead = models.Lead(
        user_id=current_user.id,
        product_id=None,
        lead_type="card_order",
        status="new",
        channel="web",
        locale=locale,
        shipping_address=payload.shipping_address.model_dump(),
        customer_order_id=order.id,
    )
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)

    try:
        get_email_sender().send(
            to=ADMIN_NOTIFICATION_EMAIL,
            subject=f"בקשת כרטיס פיזי — {current_user.first_name} {current_user.last_name}",
            html_body=f"""
            <div dir="rtl" style="font-family:Arial,sans-serif;color:#111;">
              <h2 style="color:#b8860b;">בקשה חדשה לכרטיס טיבותא פיזי 💳</h2>
              <p><strong>לקוח:</strong> {current_user.first_name} {current_user.last_name} ({current_user.email})</p>
              <p><strong>מספר לקוח:</strong> {current_user.customer_number or '—'}</p>
              <p><strong>שם למשלוח:</strong> {payload.shipping_address.full_name}</p>
              <p><strong>כתובת:</strong> {payload.shipping_address.street}, {payload.shipping_address.city} {payload.shipping_address.zip_code or ''}</p>
              <p><strong>טלפון:</strong> {payload.shipping_address.phone}</p>
            </div>""",
            locale="he",
        )
    except Exception:
        pass

    return new_lead


@router.post("/leads/contact", response_model=schemas.LeadRead)
def create_contact_us_lead(
    payload: schemas.ContactUsCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Creates a general inquiry. By default it's NOT wrapped in a CustomerOrder (unlike every
    other lead-creating path here), so it surfaces in GET /admin/leads instead of /admin/orders —
    it isn't "an order" in any sense. The one exception: `payload.order_id`, letting a customer
    explicitly tie a question to one of their own existing orders (verified to belong to them
    below) — such an inquiry is linked via customer_order_id instead, which routes it to show up
    on that order's card in /admin/orders rather than the general "פניות" tab (GET /admin/leads
    filters customer_order_id IS NULL, unchanged)."""
    locale = schemas.normalize_locale(current_user.preferred_language or payload.locale)

    customer_order_id = None
    if payload.order_id is not None:
        order = (
            db.query(models.CustomerOrder)
            .filter(models.CustomerOrder.id == payload.order_id, models.CustomerOrder.user_id == current_user.id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        customer_order_id = order.id

    new_lead = models.Lead(
        user_id=current_user.id,
        product_id=None,
        customer_order_id=customer_order_id,
        lead_type="general_inquiry",
        status="new",
        channel="web",
        locale=locale,
        subject=payload.subject,
        message=payload.message,
    )
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)

    email_sender = get_email_sender()
    try:
        email_sender.send(
            to=current_user.email,
            subject=CONFIRMATION_SUBJECT.get(locale, CONFIRMATION_SUBJECT["he"]),
            html_body=CONTACT_CONFIRMATION_BODY.get(locale, CONTACT_CONFIRMATION_BODY["he"]),
            locale=locale,
        )
    except Exception:
        pass
    try:
        email_sender.send(
            to=ADMIN_NOTIFICATION_EMAIL,
            subject=f"פנייה כללית: {payload.subject} — {current_user.first_name} {current_user.last_name}",
            html_body=_contact_admin_notification_body(current_user, payload.subject, payload.message),
            locale="he",
        )
    except Exception:
        pass

    return new_lead


@router.get("/users/me/activity", response_model=List[schemas.LeadHistoryRead])
def my_activity(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    leads = (
        db.query(models.Lead)
        .options(selectinload(models.Lead.product))
        .filter(models.Lead.user_id == current_user.id)
        .order_by(models.Lead.created_at.desc())
        .all()
    )
    result = []
    for lead in leads:
        result.append(schemas.LeadHistoryRead(
            id=lead.id,
            lead_type=lead.lead_type,
            scheduled_at=lead.scheduled_at,
            status=lead.status,
            created_at=lead.created_at,
            product_id=lead.product_id,
            product_title_he=lead.product.title_he if lead.product else None,
            product_vertical=lead.product.vertical if lead.product else None,
            product_image_url=lead.product.image_url if lead.product else None,
            product_price=lead.product.price if lead.product else None,
        ))
    return result


@router.get("/admin/leads", response_model=List[schemas.AdminLeadRead], dependencies=[Depends(get_current_admin)])
def admin_list_leads(db: Session = Depends(get_db)):
    """Every order-like lead-creating path wraps its lead(s) in a CustomerOrder (see /admin/orders);
    this returns only the ones that aren't — today, exclusively `general_inquiry` leads from
    POST /leads/contact."""
    leads = (
        db.query(models.Lead)
        .options(
            selectinload(models.Lead.product),
            selectinload(models.Lead.user),
            selectinload(models.Lead.assignee),
        )
        .filter(models.Lead.customer_order_id.is_(None))
        .order_by(models.Lead.created_at.desc())
        .all()
    )
    result = []
    for lead in leads:
        user = lead.user
        product = lead.product
        assignee = lead.assignee
        result.append(schemas.AdminLeadRead(
            id=lead.id,
            lead_type=lead.lead_type,
            scheduled_at=lead.scheduled_at,
            status=lead.status,
            channel=lead.channel,
            notes=lead.notes,
            assigned_to=lead.assigned_to,
            assigned_to_name=f"{assignee.first_name} {assignee.last_name}".strip() if assignee else None,
            history=lead.history or [],
            created_at=lead.created_at,
            user_id=lead.user_id,
            user_name=f"{user.first_name} {user.last_name}".strip() if user else None,
            user_email=user.email if user else None,
            user_phone=user.phone if user else None,
            product_id=lead.product_id,
            product_title_he=product.title_he if product else None,
            product_vertical=product.vertical if product else None,
            shipping_address=lead.shipping_address,
            quantity=lead.quantity,
            cart_group_id=lead.cart_group_id,
            subject=lead.subject,
            message=lead.message,
        ))
    return result


def _order_line_from_lead(lead: models.Lead) -> schemas.CustomerOrderLineRead:
    product = lead.product
    vendor = product.vendor if product else None
    assignee = lead.assignee
    return schemas.CustomerOrderLineRead(
        id=lead.id,
        lead_type=lead.lead_type,
        scheduled_at=lead.scheduled_at,
        status=lead.status,
        channel=lead.channel,
        notes=lead.notes,
        assigned_to=lead.assigned_to,
        assigned_to_name=f"{assignee.first_name} {assignee.last_name}".strip() if assignee else None,
        history=lead.history or [],
        created_at=lead.created_at,
        product_id=lead.product_id,
        product_title_he=product.title_he if product else None,
        product_vertical=product.vertical if product else None,
        vendor_id=vendor.id if vendor else None,
        vendor_name_he=vendor.name_he if vendor else None,
        shipping_address=lead.shipping_address,
        quantity=lead.quantity,
        vendor_batch_id=lead.vendor_batch_id,
        unit_price_snapshot=lead.unit_price_snapshot,
        list_price_snapshot=lead.list_price_snapshot,
        quantity_discount_percent_snapshot=lead.quantity_discount_percent_snapshot,
    )


def _customer_order_read(order: models.CustomerOrder) -> schemas.CustomerOrderRead:
    """Builds the full admin-facing CustomerOrderRead from an ORM CustomerOrder — shared by
    admin_list_orders, admin_finalize_order and admin_cancel_order (the latter two return the
    order they just acted on) so all three stay byte-for-byte consistent. Requires order.user and
    order.leads (with .product/.assignee) already eager-loaded by the caller."""
    user = order.user
    return schemas.CustomerOrderRead(
        id=order.id,
        order_number=order.order_number,
        user_id=order.user_id,
        user_name=f"{user.first_name} {user.last_name}".strip() if user else None,
        user_email=user.email if user else None,
        user_phone=user.phone if user else None,
        notes=order.notes,
        status=order.status,
        confirmation_deadline=order.confirmation_deadline,
        reminder_sent_at=order.reminder_sent_at,
        confirmed_at=order.confirmed_at,
        cancelled_at=order.cancelled_at,
        history=order.history or [],
        orderer_role=order.orderer_role,
        gabbai_community_name_snapshot=order.gabbai_community_name_snapshot,
        gabbai_synagogue_address_snapshot=order.gabbai_synagogue_address_snapshot,
        gabbai_contact_name_snapshot=order.gabbai_contact_name_snapshot,
        gabbai_contact_phone_snapshot=order.gabbai_contact_phone_snapshot,
        custom_items_note=order.custom_items_note,
        created_at=order.created_at,
        items=[_order_line_from_lead(lead) for lead in order.leads if lead.lead_type != "general_inquiry"],
        inquiries=[schemas.OrderInquiryRead.model_validate(lead) for lead in order.leads if lead.lead_type == "general_inquiry"],
    )


@router.get("/admin/orders", response_model=List[schemas.CustomerOrderRead], dependencies=[Depends(get_current_admin)])
def admin_list_orders(db: Session = Depends(get_db)):
    orders = (
        db.query(models.CustomerOrder)
        .options(
            selectinload(models.CustomerOrder.user),
            selectinload(models.CustomerOrder.leads).selectinload(models.Lead.product).selectinload(models.Product.vendor),
            selectinload(models.CustomerOrder.leads).selectinload(models.Lead.assignee),
        )
        .order_by(models.CustomerOrder.created_at.desc())
        .all()
    )
    return [_customer_order_read(order) for order in orders]


@router.patch("/admin/orders/{order_id}/notes", dependencies=[Depends(get_current_admin)])
def admin_update_order_notes(order_id: int, payload: schemas.OrderNotesUpdate, db: Session = Depends(get_db)):
    order = db.query(models.CustomerOrder).filter(models.CustomerOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.notes = payload.notes
    db.commit()
    return {"id": order.id, "notes": order.notes}


_LEAD_STATUS_LABEL: dict[str, dict[str, str]] = {
    "new": {"he": "חדשה", "en": "New", "fr": "Nouvelle", "yi": "נײַ"},
    "confirmed": {"he": "מאושרת", "en": "Confirmed", "fr": "Confirmée", "yi": "באשטעטיגט"},
    "contacted": {"he": "טופלה", "en": "Handled", "fr": "Traitée", "yi": "באהאנדלט"},
    "closed": {"he": "סגורה", "en": "Closed", "fr": "Fermée", "yi": "פארמאכט"},
    "cancelled": {"he": "בוטלה", "en": "Cancelled", "fr": "Annulée", "yi": "אָפּגעזאָגט"},
}


def _lead_status_label(status: str, locale: str) -> str:
    entry = _LEAD_STATUS_LABEL.get(status, {})
    return entry.get(locale, entry.get("he", status))


_CARD_ORDER_FALLBACK_TITLE = {"he": "הזמנת כרטיס", "en": "Card order", "fr": "Commande de carte", "yi": "קארטל בעשטעלונג"}

_FINALIZE_EMAIL_SUBJECT = {
    "he": "סיכום ההזמנה שלך מוכן — יש לאשר, TIVUTA",
    "en": "Your order summary is ready — please confirm, TIVUTA",
    "fr": "Le résumé de votre commande est prêt — merci de confirmer, TIVUTA",
    "yi": "אײַער בעשטעלונג-סיכום איז גרייט — ביטע באשטעטיקט, TIVUTA",
}
_FINALIZE_INTRO = {
    "he": "עברנו על ההזמנה שלך (<strong>{order_number}</strong>) — הנה הסיכום:",
    "en": "We've reviewed your order (<strong>{order_number}</strong>) — here's the summary:",
    "fr": "Nous avons examiné votre commande (<strong>{order_number}</strong>) — voici le résumé :",
    "yi": "מיר האָבן דורכגעקוקט אײַער בעשטעלונג (<strong>{order_number}</strong>) — דאָ איז דער סיכום:",
}
_FINALIZE_CTA = {
    "he": f"לאישור סופי של ההזמנה (בתוך {ORDER_CONFIRMATION_WINDOW_HOURS} שעות), יש ללחוץ על הכפתור:",
    "en": f"To finalize your order (within {ORDER_CONFIRMATION_WINDOW_HOURS} hours), click the button below:",
    "fr": f"Pour finaliser votre commande (sous {ORDER_CONFIRMATION_WINDOW_HOURS} heures), cliquez sur le bouton :",
    "yi": f"צו סוף-באשטעטיקן אײַער בעשטעלונג (אינערהאלב {ORDER_CONFIRMATION_WINDOW_HOURS} שעה), דריקט אויפן קנעפּל:",
}
_FINALIZE_BUTTON_LABEL = {
    "he": "אישור סופי של ההזמנה", "en": "Confirm my order",
    "fr": "Confirmer ma commande", "yi": "באשטעטיקן מיין בעשטעלונג",
}


def _finalize_email_body(locale: str, order_number: str, items: list, confirm_url: str) -> str:
    rows = "".join(
        f"<li><strong>{it['title']}</strong> × {it['quantity']} — {it['status_label']}"
        + (f'<br/><span style="color:#666;font-size:13px;">{it["notes"]}</span>' if it.get("notes") else "")
        + "</li>"
        for it in items
    )
    intro = _FINALIZE_INTRO.get(locale, _FINALIZE_INTRO["he"]).format(order_number=order_number)
    cta = _FINALIZE_CTA.get(locale, _FINALIZE_CTA["he"])
    button_label = _FINALIZE_BUTTON_LABEL.get(locale, _FINALIZE_BUTTON_LABEL["he"])
    dir_attr = "rtl" if locale in ("he", "yi") else "ltr"
    return f"""
    <div dir="{dir_attr}" style="font-family:Arial,sans-serif;color:#111;">
      <p>{intro}</p>
      <ul>{rows}</ul>
      <p>{cta}</p>
      <p><a href="{confirm_url}" style="background:#d4af37;color:#080d1f;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">{button_label}</a></p>
    </div>"""


@router.post("/admin/orders/{order_id}/finalize", response_model=schemas.CustomerOrderRead, dependencies=[Depends(get_current_admin)])
def admin_finalize_order(order_id: int, db: Session = Depends(get_db)):
    """The "סיימתי, שלח ללקוח" button: sends exactly ONE consolidated email summarizing every
    line item's current status plus the admin's own notes on it (Lead.notes — never emailed to
    the customer before this point, see its docstring), plus a link to the public
    order-confirmation page. Re-clicking while still "awaiting_customer" is the supported way to
    correct a mistake — it resends a fresh email and resets the 24h deadline."""
    order = (
        db.query(models.CustomerOrder)
        .options(
            selectinload(models.CustomerOrder.user),
            selectinload(models.CustomerOrder.leads).selectinload(models.Lead.product),
        )
        .filter(models.CustomerOrder.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in ("new", "awaiting_customer"):
        raise HTTPException(status_code=400, detail="Order already confirmed or cancelled")
    # This whole mechanism (confirmation link, 24h deadline, auto-cancel) is about confirming a
    # *price* before payment — it was never meant for appointment/card_order orders, which have
    # nothing to "confirm" price-wise and already have their own separate flows (appointment
    # reminders, manual card fulfillment). In practice every order is homogeneous in lead_type
    # (cart_checkout only ever creates contact_request leads; create_lead/create_card_order each
    # create a single-lead order of their own type) — so this check is really "is this a product
    # order at all," not a per-line filter.
    if not any(lead.lead_type == "contact_request" for lead in order.leads):
        raise HTTPException(status_code=400, detail="הזמנה מסוג זה אינה דורשת אישור סופי מהלקוח")
    user = order.user
    if not user:
        raise HTTPException(status_code=404, detail="Order has no associated user")

    old_status = order.status
    order.confirmation_token = secrets.token_urlsafe(32)
    order.confirmation_deadline = datetime.utcnow() + timedelta(hours=ORDER_CONFIRMATION_WINDOW_HOURS)
    order.reminder_sent_at = None
    order.status = "awaiting_customer"
    history = list(order.history or [])
    history.append({"ts": datetime.utcnow().isoformat(), "action": "finalized", "from_val": old_status, "to_val": "awaiting_customer"})
    order.history = history
    db.commit()
    db.refresh(order)

    locale = user.preferred_language or "he"
    items_info = []
    for lead in order.leads:
        if lead.lead_type == "general_inquiry":
            continue
        product = lead.product
        if product:
            title = getattr(product, f"title_{locale}", None) or product.title_he
        else:
            title = _CARD_ORDER_FALLBACK_TITLE.get(locale, _CARD_ORDER_FALLBACK_TITLE["he"])
        items_info.append({
            "title": html_escape(title),
            "quantity": lead.quantity or 1,
            "status_label": _lead_status_label(lead.status, locale),
            "notes": html_escape(lead.notes) if lead.notes else None,
        })

    confirm_url = f"{APP_BASE_URL}/{locale}/order-confirm?token={order.confirmation_token}"
    subject = _FINALIZE_EMAIL_SUBJECT.get(locale, _FINALIZE_EMAIL_SUBJECT["he"])
    body = _finalize_email_body(locale, order.order_number, items_info, confirm_url)
    try:
        get_email_sender().send(to=user.email, subject=subject, html_body=body, locale=locale)
    except Exception:
        pass
    db.add(models.Notification(
        user_id=user.id,
        type="system",
        title=subject,
        message=None,
        locale=locale,
        link=f"/order-confirm?token={order.confirmation_token}",
    ))
    db.commit()
    db.refresh(order)
    return _customer_order_read(order)


@router.post("/admin/orders/{order_id}/cancel", response_model=schemas.CustomerOrderRead, dependencies=[Depends(get_current_admin)])
def admin_cancel_order(order_id: int, db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    order = (
        db.query(models.CustomerOrder)
        .options(
            selectinload(models.CustomerOrder.user),
            selectinload(models.CustomerOrder.leads).selectinload(models.Lead.product),
        )
        .filter(models.CustomerOrder.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status in ("customer_confirmed", "cancelled"):
        raise HTTPException(status_code=400, detail="Order already finalized or cancelled")
    cancel_order(db, order, actor=f"{current_admin.first_name} {current_admin.last_name}".strip())
    db.commit()
    db.refresh(order)
    return _customer_order_read(order)


@router.patch("/admin/leads/{lead_id}/assign", response_model=schemas.LeadRead, dependencies=[Depends(get_current_admin)])
def admin_assign_lead(lead_id: int, payload: schemas.LeadAssignUpdate, db: Session = Depends(get_db)):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if payload.assigned_to is not None:
        user = db.query(models.User).filter(models.User.id == payload.assigned_to).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
    lead.assigned_to = payload.assigned_to
    db.commit()
    db.refresh(lead)
    history = list(lead.history or [])
    history.append({"ts": datetime.utcnow().isoformat(), "action": "assigned", "to_val": str(payload.assigned_to) if payload.assigned_to else None})
    lead.history = history
    db.commit()
    db.refresh(lead)
    return lead


@router.patch("/admin/leads/bulk", dependencies=[Depends(get_current_admin)])
def admin_bulk_action(payload: schemas.LeadBulkAction, db: Session = Depends(get_db)):
    leads = db.query(models.Lead).options(selectinload(models.Lead.customer_order)).filter(models.Lead.id.in_(payload.lead_ids)).all()
    if not leads:
        raise HTTPException(status_code=404, detail="No leads found")
    ts = datetime.utcnow().isoformat()
    updated = 0
    for lead in leads:
        history = list(lead.history or [])
        if payload.action == "set_status":
            valid = {"new", "confirmed", "contacted", "closed", "cancelled"}
            if payload.value not in valid:
                raise HTTPException(status_code=400, detail=f"Invalid status: {payload.value}")
            # Same guard as the single-item endpoint: a lead whose order was already cancelled
            # (and therefore already restocked) must not be reactivated here — skip it rather
            # than fail the whole batch, so an unrelated cancelled lead in the selection doesn't
            # block updating the rest.
            if lead.customer_order and lead.customer_order.status == "cancelled":
                continue
            old = lead.status
            lead.status = payload.value
            history.append({"ts": ts, "action": "bulk_status_change", "from_val": old, "to_val": payload.value})
            reserve_or_release_stock_for_lead(db, lead, old, payload.value)
        elif payload.action == "assign":
            uid = int(payload.value) if payload.value else None
            lead.assigned_to = uid
            history.append({"ts": ts, "action": "bulk_assign", "to_val": payload.value})
        lead.history = history
        updated += 1
    db.commit()
    return {"updated": updated}


@router.get("/admin/leads/conversion", dependencies=[Depends(get_current_admin)])
def admin_lead_conversion(db: Session = Depends(get_db)):
    from sqlalchemy import func
    verticals = [
        row[0] for row in
        db.query(models.Vertical.slug).order_by(models.Vertical.display_order.asc()).all()
    ]
    result = []
    for vertical in verticals:
        product_ids = [
            r[0] for r in db.query(models.Product.id).filter(models.Product.vertical == vertical).all()
        ]
        if not product_ids:
            continue
        total = db.query(models.Lead).filter(models.Lead.product_id.in_(product_ids)).count()
        if total == 0:
            continue
        confirmed = db.query(models.Lead).filter(models.Lead.product_id.in_(product_ids), models.Lead.status == "confirmed").count()
        contacted = db.query(models.Lead).filter(models.Lead.product_id.in_(product_ids), models.Lead.status == "contacted").count()
        closed = db.query(models.Lead).filter(models.Lead.product_id.in_(product_ids), models.Lead.status == "closed").count()
        result.append({
            "vertical": vertical,
            "total": total,
            "confirmed": confirmed,
            "contacted": contacted,
            "closed": closed,
            "conversion_rate": round((confirmed + contacted + closed) / total * 100, 1),
        })
    return result


@router.post("/admin/leads/send-followup-reminders", dependencies=[Depends(get_current_admin)])
def send_followup_reminders(stale_days: int = 3, db: Session = Depends(get_db)):
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(days=stale_days)
    stale_leads = (
        db.query(models.Lead)
        .options(selectinload(models.Lead.user), selectinload(models.Lead.product))
        .filter(models.Lead.status == "new", models.Lead.created_at <= cutoff)
        .all()
    )
    email_sender = get_email_sender()
    sent = 0
    for lead in stale_leads:
        if not lead.user:
            continue
        product_title = lead.product.title_he if lead.product else "מוצר"
        try:
            email_sender.send(
                to=ADMIN_NOTIFICATION_EMAIL,
                subject=f"⏰ תזכורת: פנייה ממתינה {stale_days}+ ימים — {lead.user.first_name} {lead.user.last_name}",
                html_body=f"""
                <div dir="rtl" style="font-family:Arial,sans-serif;color:#111;">
                  <h2 style="color:#b8860b;">פנייה ממתינה לטיפול 🔔</h2>
                  <p>הפנייה הבאה ממתינה כבר <strong>{stale_days}+ ימים</strong> ועדיין בסטטוס "חדש":</p>
                  <p><strong>לקוח:</strong> {lead.user.first_name} {lead.user.last_name} ({lead.user.email})</p>
                  <p><strong>מוצר:</strong> {product_title}</p>
                  <p><strong>תאריך פנייה:</strong> {lead.created_at.strftime("%d/%m/%Y")}</p>
                </div>""",
                locale="he",
            )
            sent += 1
        except Exception:
            pass
    return {"sent": sent, "total_stale": len(stale_leads)}


_APPOINTMENT_REMINDER_BODY = {
    "he": '<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;"><h2 style="color:#b8860b;">תזכורת לפגישה — <span dir="ltr">TIVUTA</span></h2><p>שלום {name},</p><p>זוהי תזכורת ידידותית לגבי הפגישה שלך עבור <strong>{title}</strong>.</p><p><strong>מועד:</strong> {date}</p><p>לשאלות, צור איתנו קשר.</p></div>',
    "en": "<p>Hi {name}, this is a reminder about your appointment for <strong>{title}</strong> on {date}.</p>",
    "fr": "<p>Bonjour {name}, ceci est un rappel amical concernant votre rendez-vous pour <strong>{title}</strong> le {date}.</p>",
    "yi": '<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;"><p>שלום {name},</p><p>דאָס איז אַ פרײַנדלעכע דערמאָנונג וועגן אײַער טרעפונג פאר <strong>{title}</strong> דעם {date}.</p></div>',
}
_APPOINTMENT_REMINDER_SUBJECT = {
    "he": "תזכורת לפגישה — {title}",
    "en": "Appointment reminder — {title}",
    "fr": "Rappel de rendez-vous — {title}",
    "yi": "דערמאָנונג פֿון טרעפונג — {title}",
}
_APPOINTMENT_REMINDER_NOTIF_TITLE = {
    "he": "תזכורת לפגישה: {title}",
    "en": "Appointment reminder: {title}",
    "fr": "Rappel de rendez-vous : {title}",
    "yi": "דערמאָנונג פֿון טרעפונג: {title}",
}
_APPOINTMENT_REMINDER_NOTIF_MESSAGE = {
    "he": "הפגישה שלך נקבעה ל-{date}",
    "en": "Your appointment is scheduled for {date}",
    "fr": "Votre rendez-vous est prévu pour le {date}",
    "yi": "אײַער טרעפונג איז פארטיילט פאר {date}",
}


@router.post("/admin/leads/{lead_id}/send-appointment-reminder", dependencies=[Depends(get_current_admin)])
def send_appointment_reminder(lead_id: int, db: Session = Depends(get_db)):
    lead = (
        db.query(models.Lead)
        .options(selectinload(models.Lead.user), selectinload(models.Lead.product))
        .filter(models.Lead.id == lead_id, models.Lead.lead_type == "appointment")
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Appointment lead not found")
    if not lead.user or not lead.scheduled_at:
        raise HTTPException(status_code=400, detail="Lead has no user or scheduled date")
    locale = lead.locale or "he"
    product_title = getattr(lead.product, f"title_{locale}", None) or (lead.product.title_he if lead.product else "מוצר")
    scheduled_str = lead.scheduled_at.strftime("%d/%m/%Y %H:%M")
    safe_name = html_escape(lead.user.first_name)
    body = _APPOINTMENT_REMINDER_BODY.get(locale, _APPOINTMENT_REMINDER_BODY["he"]).format(
        name=safe_name, title=product_title, date=scheduled_str
    )
    subject = _APPOINTMENT_REMINDER_SUBJECT.get(locale, _APPOINTMENT_REMINDER_SUBJECT["he"]).format(title=product_title)
    notif_title = _APPOINTMENT_REMINDER_NOTIF_TITLE.get(locale, _APPOINTMENT_REMINDER_NOTIF_TITLE["he"]).format(title=product_title)
    notif_message = _APPOINTMENT_REMINDER_NOTIF_MESSAGE.get(locale, _APPOINTMENT_REMINDER_NOTIF_MESSAGE["he"]).format(date=scheduled_str)
    get_email_sender().send(to=lead.user.email, subject=subject, html_body=body, locale=locale)

    # Create in-app notification for the user, in their resolved language
    notif = models.Notification(
        user_id=lead.user_id,
        type="appointment_reminder",
        title=notif_title,
        message=notif_message,
        locale=locale,
        link="/profile#my-orders",
    )
    db.add(notif)
    db.commit()
    return {"sent": True}


@router.patch("/admin/leads/{lead_id}/notes", response_model=schemas.LeadRead, dependencies=[Depends(get_current_admin)])
def admin_update_lead_notes(lead_id: int, payload: schemas.LeadNotesUpdate, db: Session = Depends(get_db)):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.notes = payload.notes
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/admin/leads/stats", dependencies=[Depends(get_current_admin)])
def admin_lead_stats(days: int = 14, db: Session = Depends(get_db)):
    from datetime import timedelta
    since = datetime.utcnow() - timedelta(days=days)
    leads = db.query(models.Lead).filter(models.Lead.created_at >= since).all()
    counts: dict = {}
    for i in range(days):
        d = (datetime.utcnow() - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        counts[d] = 0
    for lead in leads:
        d = lead.created_at.strftime("%Y-%m-%d")
        if d in counts:
            counts[d] += 1
    return [{"date": k, "count": v} for k, v in sorted(counts.items())]



@router.patch("/admin/leads/{lead_id}/status", response_model=schemas.LeadRead, dependencies=[Depends(get_current_admin)])
def admin_update_lead_status(lead_id: int, status: str, db: Session = Depends(get_db)):
    """Updates a single line item's status only — never emails or notifies the customer by
    itself (that used to happen here, immediately, per item; it was moved to
    POST /admin/orders/{id}/finalize so the customer gets exactly one consolidated summary once
    the admin has actually finished reviewing the whole order, not one email per item)."""
    valid = {"new", "confirmed", "contacted", "closed"}
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid}")
    lead = db.query(models.Lead).options(selectinload(models.Lead.customer_order)).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    # A lead whose order was cancelled (order-level cancel already restocked it and marked it
    # "cancelled") must not be individually reactivated from here — that would silently
    # double-decrement stock (reserve_or_release_stock_for_lead has no notion of order status).
    # The order itself would need to be un-cancelled first, which isn't a supported operation.
    if lead.customer_order and lead.customer_order.status == "cancelled":
        raise HTTPException(status_code=400, detail="לא ניתן לשנות סטטוס של פריט שההזמנה שלו בוטלה")
    old_status = lead.status
    lead.status = status
    history = list(lead.history or [])
    history.append({"ts": datetime.utcnow().isoformat(), "action": "status_change", "from_val": old_status, "to_val": status})
    lead.history = history
    reserve_or_release_stock_for_lead(db, lead, old_status, status)
    db.commit()
    db.refresh(lead)
    return lead
