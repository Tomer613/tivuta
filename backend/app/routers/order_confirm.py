import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..security import get_db, verify_cron_secret
from ..services import get_email_sender
from ..services.orders import cancel_order

router = APIRouter(tags=["order-confirm"])

APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:3000")
REMINDER_WINDOW_HOURS = 12  # a reminder fires once this many hours before the 24h deadline


def _order_by_token(db: Session, token: str) -> models.CustomerOrder:
    order = (
        db.query(models.CustomerOrder)
        .options(selectinload(models.CustomerOrder.leads).selectinload(models.Lead.product))
        .filter(models.CustomerOrder.confirmation_token == token)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Confirmation link not found")
    return order


def _build_order_confirm_read(order: models.CustomerOrder) -> schemas.OrderConfirmRead:
    """Real prices always included here, regardless of Vertical.hide_prices — this is the one
    place a customer must see exactly what they're being charged before confirming."""
    items = []
    total = 0.0
    for lead in order.leads:
        if lead.lead_type == "general_inquiry":
            continue
        product = lead.product
        title = (getattr(product, "title_he", None) if product else None) or None
        items.append(schemas.OrderConfirmLineRead(
            id=lead.id,
            product_title_he=title,
            quantity=lead.quantity,
            unit_price_snapshot=lead.unit_price_snapshot,
            list_price_snapshot=lead.list_price_snapshot,
            notes=lead.notes,
            status=lead.status,
        ))
        if lead.unit_price_snapshot is not None:
            total += lead.unit_price_snapshot * (lead.quantity or 1)
    return schemas.OrderConfirmRead(
        order_number=order.order_number,
        status=order.status,
        confirmation_deadline=order.confirmation_deadline,
        confirmed_at=order.confirmed_at,
        custom_items_note=order.custom_items_note,
        gabbai_community_name_snapshot=order.gabbai_community_name_snapshot,
        items=items,
        total=total,
    )


@router.get("/order-confirm/{token}", response_model=schemas.OrderConfirmRead)
def get_order_confirmation(token: str, db: Session = Depends(get_db)):
    """Public, token-gated — no login involved, matching this codebase's other emailed-link-grants-
    access patterns (User/Vendor reset tokens). Returns the order regardless of its current status
    (awaiting_customer / customer_confirmed / cancelled) so the page can render the right message
    even on a revisit after the fact, rather than a bare 404."""
    order = _order_by_token(db, token)
    return _build_order_confirm_read(order)


@router.post("/order-confirm/{token}/confirm", response_model=schemas.OrderConfirmRead)
def confirm_order(token: str, db: Session = Depends(get_db)):
    order = _order_by_token(db, token)
    if order.status != "awaiting_customer":
        raise HTTPException(status_code=400, detail="This order is not awaiting confirmation")
    if order.confirmation_deadline and datetime.utcnow() > order.confirmation_deadline:
        raise HTTPException(status_code=410, detail="The confirmation window for this order has expired")

    order.status = "customer_confirmed"
    order.confirmed_at = datetime.utcnow()
    history = list(order.history or [])
    history.append({"ts": datetime.utcnow().isoformat(), "action": "customer_confirmed", "from_val": "awaiting_customer", "to_val": "customer_confirmed"})
    order.history = history
    db.commit()
    db.refresh(order)
    return _build_order_confirm_read(order)


_REMINDER_SUBJECT = {
    "he": "תזכורת: יש לאשר את ההזמנה שלך — TIVUTA",
    "en": "Reminder: please confirm your order — TIVUTA",
    "fr": "Rappel : merci de confirmer votre commande — TIVUTA",
    "yi": "דערמאָנונג: ביטע באשטעטיקט אײַער בעשטעלונג — TIVUTA",
}
_REMINDER_BODY = {
    "he": '<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;"><p>שמנו לב שעדיין לא אישרת את ההזמנה <strong>{order_number}</strong>.</p><p>ההזמנה תבוטל אוטומטית אם לא תאושר בזמן.</p><p><a href="{confirm_url}" style="background:#d4af37;color:#080d1f;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">אישור ההזמנה</a></p></div>',
    "en": '<p>We noticed you haven\'t confirmed order <strong>{order_number}</strong> yet.</p><p>It will be automatically cancelled if not confirmed in time.</p><p><a href="{confirm_url}" style="background:#d4af37;color:#080d1f;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Confirm my order</a></p>',
    "fr": '<p>Nous avons remarqué que vous n\'avez pas encore confirmé la commande <strong>{order_number}</strong>.</p><p>Elle sera automatiquement annulée si elle n\'est pas confirmée à temps.</p><p><a href="{confirm_url}" style="background:#d4af37;color:#080d1f;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Confirmer ma commande</a></p>',
    "yi": '<div dir="rtl" style="font-family:Arial,sans-serif;color:#111;"><p>מיר האָבן באמערקט אַז איר האָט נאָך נישט באשטעטיגט די בעשטעלונג <strong>{order_number}</strong>.</p><p>זי וועט ווערן אָפּגעזאָגט אויב נישט באשטעטיגט בצייטנס.</p><p><a href="{confirm_url}" style="background:#d4af37;color:#080d1f;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">באשטעטיקן</a></p></div>',
}


@router.post("/api/orders/send-confirmation-reminders")
def send_confirmation_reminders(request: Request, db: Session = Depends(get_db)):
    """Cron endpoint — called by GitHub Actions alongside the other scheduled jobs. Sends one
    reminder email (never more than one, per reminder_sent_at) to any order that's past the
    halfway point of its 24h confirmation window and hasn't been confirmed yet."""
    verify_cron_secret(request)
    now = datetime.utcnow()
    halfway_cutoff = now + timedelta(hours=REMINDER_WINDOW_HOURS)
    due = (
        db.query(models.CustomerOrder)
        .options(selectinload(models.CustomerOrder.user))
        .filter(
            models.CustomerOrder.status == "awaiting_customer",
            models.CustomerOrder.reminder_sent_at.is_(None),
            models.CustomerOrder.confirmation_deadline.isnot(None),
            models.CustomerOrder.confirmation_deadline <= halfway_cutoff,
            models.CustomerOrder.confirmation_deadline > now,
        )
        .all()
    )
    sent = 0
    for order in due:
        user = order.user
        if not user:
            continue
        locale = user.preferred_language or "he"
        confirm_url = f"{APP_BASE_URL}/{locale}/order-confirm?token={order.confirmation_token}"
        subject = _REMINDER_SUBJECT.get(locale, _REMINDER_SUBJECT["he"])
        body = _REMINDER_BODY.get(locale, _REMINDER_BODY["he"]).format(order_number=order.order_number, confirm_url=confirm_url)
        try:
            get_email_sender().send(to=user.email, subject=subject, html_body=body, locale=locale)
            sent += 1
        except Exception:
            pass
        order.reminder_sent_at = now
    db.commit()
    return {"reminders_sent": sent, "ids": [o.id for o in due]}


@router.post("/api/orders/auto-cancel-expired")
def auto_cancel_expired_orders(request: Request, db: Session = Depends(get_db)):
    """Cron endpoint — cancels every order whose 24h confirmation window has passed with no
    customer response, restocking every line item that had been reserved (see services/orders.py
    cancel_order, the same function the admin's manual cancel button uses)."""
    verify_cron_secret(request)
    now = datetime.utcnow()
    expired = (
        db.query(models.CustomerOrder)
        .options(selectinload(models.CustomerOrder.leads).selectinload(models.Lead.product))
        .filter(
            models.CustomerOrder.status == "awaiting_customer",
            models.CustomerOrder.confirmation_deadline.isnot(None),
            models.CustomerOrder.confirmation_deadline <= now,
        )
        .all()
    )
    for order in expired:
        cancel_order(db, order, actor="system")
    db.commit()
    return {"cancelled": len(expired), "ids": [o.id for o in expired]}
