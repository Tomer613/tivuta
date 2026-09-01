"""Order-lifecycle logic shared across routers (admin manual cancel in routers/leads.py, the
24h auto-cancel cron in routers/order_confirm.py) — kept here rather than imported router-to-
router, matching this codebase's convention that cross-cutting logic lives in services/.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from .. import models
from .inventory import reserve_or_release_stock_for_lead


def cancel_order(db: Session, order: models.CustomerOrder, actor: Optional[str] = None) -> None:
    """Restocks every line item that was "confirmed" (releasing its reservation) and moves every
    still-open line item to "cancelled" too, so an order's line items read coherently once the
    order itself is cancelled. Does not commit — the caller decides the transaction boundary."""
    ts = datetime.utcnow().isoformat()
    for lead in order.leads:
        if lead.lead_type == "general_inquiry" or lead.status in ("closed", "cancelled"):
            continue
        old_status = lead.status
        lead.status = "cancelled"
        lead_history = list(lead.history or [])
        lead_history.append({"ts": ts, "action": "status_change", "from_val": old_status, "to_val": "cancelled"})
        lead.history = lead_history
        reserve_or_release_stock_for_lead(db, lead, old_status, "cancelled")

    old_order_status = order.status
    order.status = "cancelled"
    order.cancelled_at = datetime.utcnow()
    order_history = list(order.history or [])
    order_history.append({"ts": ts, "action": "cancelled", "from_val": old_order_status, "to_val": "cancelled", "actor": actor})
    order.history = order_history
