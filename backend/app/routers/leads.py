import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..security import get_current_admin, get_current_user, get_db
from ..services import get_email_sender, loyalty
from ..services.pricing import compute_effective_unit_price

router = APIRouter(tags=["leads"])

# ── Change this env-var in production to redirect admin notifications ──────────
ADMIN_NOTIFICATION_EMAIL = os.environ.get("ADMIN_NOTIFICATION_EMAIL", "support@tivuta.co.il")

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


STATUS_EMAIL_SUBJECT: dict[str, dict[str, str]] = {
    "confirmed": {"he": "הפנייה שלך אושרה — TIVUTA", "en": "Your request confirmed — TIVUTA", "fr": "Votre demande confirmée — TIVUTA", "yi": "אייער פנייה איז באשטעטיגט — TIVUTA"},
    "contacted": {"he": "הפנייה שלך טופלה — TIVUTA", "en": "Your request handled — TIVUTA", "fr": "Votre demande traitée — TIVUTA", "yi": "אייער פנייה איז באהאנדלט — TIVUTA"},
}


def _status_update_body(locale: str, product_title: str, status: str) -> str:
    if status == "confirmed":
        if locale == "he":
            return f'<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;"><p>שמחים לבשר שהפנייה שלך לגבי <strong>{product_title}</strong> אושרה.</p><p>נציג שלנו ייצור איתך קשר בקרוב לתיאום הפרטים.</p></div>'
        return f"<p>Your request regarding <strong>{product_title}</strong> has been confirmed. Our representative will contact you soon.</p>"
    if status == "contacted":
        if locale == "he":
            return f'<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;"><p>הפנייה שלך לגבי <strong>{product_title}</strong> טופלה.</p><p>אנו מקווים שהשירות עמד בציפיותיך. לשאלות נוספות, פנה אלינו בכל עת.</p></div>'
        return f"<p>Your request regarding <strong>{product_title}</strong> has been handled. We hope the service met your expectations.</p>"
    return ""


def _confirmation_body(locale: str, product_title: str, scheduled_at):
    if scheduled_at:
        if locale == "he":
            return f"<p>תודה שקבעת פגישה להתרשמות עבור <strong>{product_title}</strong>.</p><p>נציג שלנו ייצור איתך קשר לאישור הפרטים.</p>"
        return f"<p>Thank you for scheduling an appointment for <strong>{product_title}</strong>.</p><p>Our representative will contact you to confirm the details.</p>"
    if locale == "he":
        return f"<p>תודה על פנייתך בנושא <strong>{product_title}</strong>.</p><p>נציג שלנו ייצור איתך קשר בהקדם.</p>"
    return f"<p>Thank you for your interest in <strong>{product_title}</strong>.</p><p>Our representative will reach out to you shortly.</p>"


@router.post("/leads", response_model=schemas.LeadRead)
def create_lead(payload: schemas.LeadCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Creates an appointment lead. Plain product-interest requests (no scheduled_at) are no
    longer accepted here — they go through /leads/cart-checkout instead, so there is exactly one
    code path that creates a product order, whether it came from the cart or a single-click
    "contact me now" button."""
    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    locale = current_user.preferred_language or payload.locale or "he"
    vertical = db.query(models.Vertical).filter(models.Vertical.slug == product.vertical).first()
    supports_appointments = bool(vertical and vertical.supports_appointments)
    if not (supports_appointments and payload.scheduled_at):
        raise HTTPException(status_code=400, detail="Use /leads/cart-checkout for product interest requests")
    lead_type = "appointment"

    order = models.CustomerOrder(user_id=current_user.id)
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


def _cart_confirmation_body(locale: str, items: list, order_number: str) -> str:
    rows = "".join(f"<li>{title} × {qty}</li>" for title, qty in items)
    if locale == "he":
        return f'<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;"><p>תודה על פנייתך. ריכזנו את הבקשה שלך (הזמנה <strong>{order_number}</strong>) עבור {len(items)} מוצרים:</p><ul>{rows}</ul><p>נציג שלנו ייצור איתך קשר בהקדם.</p></div>'
    return f"<p>Thank you for your interest. We received your request (order <strong>{order_number}</strong>) for {len(items)} products:</p><ul>{rows}</ul><p>Our representative will reach out to you shortly.</p>"


def _cart_admin_notification_body(user: models.User, items: list, order_number: str) -> str:
    rows = "".join(f"<li>{title} × {qty}</li>" for title, qty in items)
    return f"""
    <div dir="rtl" style="font-family:Arial,sans-serif;color:#111;">
      <h2 style="color:#b8860b;">בקשת קשר מרוכזת מהסל — הזמנה {order_number} ({len(items)} מוצרים) 🛒</h2>
      <ul>{rows}</ul>
      <hr/>
      <p><strong>שם:</strong> {user.first_name} {user.last_name}</p>
      <p><strong>מייל:</strong> <a href="mailto:{user.email}">{user.email}</a></p>
      <p><strong>טלפון:</strong> {user.phone or '—'}</p>
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

    locale = current_user.preferred_language or payload.locale or "he"
    cart_group_id = uuid.uuid4().hex

    # Combined quantity per quantity-discount bundle across this one checkout call — the
    # "cumulative across the bundle's items in the cart" scope decided for this feature. A
    # separate checkout call (e.g. two single-item "contact me now" clicks) does not combine.
    bundle_aggregates: dict[int, int] = {}
    for product_id, quantity in merged_quantities.items():
        bundle_id = products_by_id[product_id].quantity_discount_bundle_id
        if bundle_id is not None:
            bundle_aggregates[bundle_id] = bundle_aggregates.get(bundle_id, 0) + quantity

    order = models.CustomerOrder(user_id=current_user.id)
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
            html_body=_cart_admin_notification_body(current_user, email_items, order.order_number),
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
            created_at=order.created_at,
            items=[_my_order_line_from_lead(lead) for lead in order.leads],
        )
        for order in orders
    ]


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

    locale = current_user.preferred_language or payload.locale or "he"

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
    """Creates a general inquiry — deliberately NOT wrapped in a CustomerOrder (unlike every other
    lead-creating path here), so it surfaces in GET /admin/leads instead of /admin/orders. This is
    the one lead type that isn't "an order" in any sense."""
    locale = current_user.preferred_language or payload.locale or "he"

    new_lead = models.Lead(
        user_id=current_user.id,
        product_id=None,
        customer_order_id=None,
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
    result = []
    for order in orders:
        user = order.user
        result.append(schemas.CustomerOrderRead(
            id=order.id,
            order_number=order.order_number,
            user_id=order.user_id,
            user_name=f"{user.first_name} {user.last_name}".strip() if user else None,
            user_email=user.email if user else None,
            user_phone=user.phone if user else None,
            notes=order.notes,
            created_at=order.created_at,
            items=[_order_line_from_lead(lead) for lead in order.leads],
        ))
    return result


@router.patch("/admin/orders/{order_id}/notes", dependencies=[Depends(get_current_admin)])
def admin_update_order_notes(order_id: int, payload: schemas.OrderNotesUpdate, db: Session = Depends(get_db)):
    order = db.query(models.CustomerOrder).filter(models.CustomerOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.notes = payload.notes
    db.commit()
    return {"id": order.id, "notes": order.notes}


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
    leads = db.query(models.Lead).filter(models.Lead.id.in_(payload.lead_ids)).all()
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
            old = lead.status
            lead.status = payload.value
            history.append({"ts": ts, "action": "bulk_status_change", "from_val": old, "to_val": payload.value})
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
    notif_locale = loyalty.resolve_locale_or_en(locale)
    if notif_locale == "he":
        body = f'<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;"><h2 style="color:#b8860b;">תזכורת לפגישה — <span dir="ltr">TIVUTA</span></h2><p>שלום {lead.user.first_name},</p><p>זוהי תזכורת ידידותית לגבי הפגישה שלך עבור <strong>{product_title}</strong>.</p><p><strong>מועד:</strong> {scheduled_str}</p><p>לשאלות, צור איתנו קשר.</p></div>'
        subject = f"תזכורת לפגישה — {product_title}"
        notif_title = f"תזכורת לפגישה: {product_title}"
        notif_message = f"הפגישה שלך נקבעה ל-{scheduled_str}"
    else:
        body = f"<p>Hi {lead.user.first_name}, this is a reminder about your appointment for <strong>{product_title}</strong> on {scheduled_str}.</p>"
        subject = f"Appointment reminder — {product_title}"
        notif_title = f"Appointment reminder: {product_title}"
        notif_message = f"Your appointment is scheduled for {scheduled_str}"
    get_email_sender().send(to=lead.user.email, subject=subject, html_body=body, locale=locale)

    # Create in-app notification for the user, in their resolved language
    notif = models.Notification(
        user_id=lead.user_id,
        type="appointment_reminder",
        title=notif_title,
        message=notif_message,
        locale=notif_locale,
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
    valid = {"new", "confirmed", "contacted", "closed"}
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid}")
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    old_status = lead.status
    lead.status = status
    history = list(lead.history or [])
    history.append({"ts": datetime.utcnow().isoformat(), "action": "status_change", "from_val": old_status, "to_val": status})
    lead.history = history
    db.commit()
    db.refresh(lead)

    if status in ("confirmed", "contacted") and old_status != status:
        user = db.query(models.User).filter(models.User.id == lead.user_id).first()
        product = db.query(models.Product).filter(models.Product.id == lead.product_id).first()
        if user and product:
            locale = lead.locale or "he"
            product_title = getattr(product, f"title_{locale}", None) or product.title_he
            body = _status_update_body(locale, product_title, status)
            if body:
                subject = STATUS_EMAIL_SUBJECT[status].get(locale, STATUS_EMAIL_SUBJECT[status]["he"])
                try:
                    get_email_sender().send(to=user.email, subject=subject, html_body=body, locale=locale)
                except Exception:
                    pass
            # In-app notification, in the same resolved language as the email above.
            notif_locale = loyalty.resolve_locale_or_en(locale)
            if notif_locale == "he":
                title_map = {
                    "confirmed": f"הפנייה שלך אושרה — {product_title}",
                    "contacted": f"הפנייה שלך טופלה — {product_title}",
                }
                notif_title = title_map.get(status, "עדכון סטטוס פנייה")
                notif_message = f"הפנייה שלך לגבי {product_title} עודכנה לסטטוס: {status}"
            else:
                title_map = {
                    "confirmed": f"Your request confirmed — {product_title}",
                    "contacted": f"Your request handled — {product_title}",
                }
                notif_title = title_map.get(status, "Request status update")
                notif_message = f"Your request for {product_title} was updated to status: {status}"
            notif = models.Notification(
                user_id=lead.user_id,
                type="lead_status",
                title=notif_title,
                message=notif_message,
                locale=notif_locale,
                link="/profile#my-orders",
            )
            db.add(notif)
            db.commit()

    return lead
