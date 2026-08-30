import os
from datetime import datetime, timedelta
from html import escape as html_escape
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import SessionLocal
from ..security import get_current_admin, get_db, verify_cron_secret
from ..services import get_email_sender, loyalty
from ..services.surveys import resolve_survey_image_url

router = APIRouter(tags=["distributions"])

APP_BASE_URL = os.environ.get("APP_BASE_URL", "https://tivuta.co.il")
# Same subdomain frontend/src/lib/share.ts points at - a dedicated CNAME onto this same backend
# service, so a shared poll link unfurls with a real og:image/title wherever it's forwarded
# (see routers/share.py), not just when the campaign email itself renders the inline image.
SHARE_BASE_URL = os.environ.get("SHARE_BASE_URL", "https://share.tivuta.co.il")


# ─── Per-recipient translation dicts ────────────────────────────────────────────
# he/en are authoritative; fr and yi are best-effort AI translations, not sourced from a native
# speaker - worth a native-speaker review before this reaches real recipients. The admin preview/
# send-test locale switcher (see admin_preview_distribution/admin_send_test_distribution) exists
# partly so that review is actually easy to do before a real campaign goes out.
GREETING = {"he": "שלום {name},", "en": "Hi {name},", "fr": "Bonjour {name},", "yi": "שלום {name},"}
SURVEY_BADGE = {
    "he": "סקר חדש מחכה לך 🗳️", "en": "A new poll is waiting for you 🗳️",
    "fr": "Un nouveau sondage vous attend 🗳️", "yi": "אַ נײַע אַנקעטע ווארט אויף אײַך 🗳️",
}
VOTE_BUTTON = {"he": "לחץ להצביע", "en": "Click to vote", "fr": "Cliquez pour voter", "yi": "קליק צו שטימען"}
DEAL_BADGE = {
    "he": "דיל מיוחד עבורך ✨", "en": "A special deal for you ✨",
    "fr": "Une offre spéciale pour vous ✨", "yi": "אַ ספּעציעלער דיל פֿאַר אײַך ✨",
}
PRICE_ON_REQUEST = {"he": "לפי בקשה", "en": "Price on request", "fr": "Prix sur demande", "yi": "פּרײַז אויף פֿאַרלאַנג"}
PURCHASE_BUTTON = {"he": "לפרטים ורכישה", "en": "Details & purchase", "fr": "Détails et achat", "yi": "פּרטים און קויפן"}
OPTION_FALLBACK = {"he": "אפשרות {n}", "en": "Option {n}", "fr": "Option {n}", "yi": "אָפּציע {n}"}
UNSUBSCRIBE_LINE = {
    "he": "הודעה זו נשלחה מ-<span dir=\"ltr\">Tivuta</span>.", "en": "This message was sent by Tivuta.",
    "fr": "Ce message a été envoyé par Tivuta.", "yi": "די מעלדונג איז געשיקט געוואָרן פֿון Tivuta.",
}
UNSUBSCRIBE_LINK = {
    "he": "לביטול הרשמה לחץ כאן", "en": "Click here to unsubscribe",
    "fr": "Cliquez ici pour vous désabonner", "yi": "קליקט דאָ צו אַראָפּנעמען זיך",
}
SITE_LINK = {
    "he": "לאתר <span dir=\"ltr\">Tivuta</span>", "en": "To the Tivuta website",
    "fr": "Vers le site Tivuta", "yi": "צום Tivuta וועבזייטל",
}


def _dir_and_align(locale: str) -> tuple[str, str]:
    """Every campaign-email builder below needs this same (dir, text-align) pair, computed once
    per recipient and repeated on every element (not left to CSS inheritance, which real email
    clients like Outlook don't reliably honor)."""
    is_rtl = locale in schemas.RTL_LOCALES
    return ("rtl" if is_rtl else "ltr"), ("right" if is_rtl else "left")


def _absolute_image_url(raw: Optional[str]) -> Optional[str]:
    """Resolves a possibly-bare filename (LocalDiskImageStorage) or already-full URL
    (SupabaseImageStorage) into an absolute URL usable inside an email. Mirrors
    routers/share.py's _resolve_image_url, minus the Request-based fallback (this runs as a
    background task with no Request available)."""
    if not raw:
        return None
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    return f"{APP_BASE_URL}/images/products/{raw}"


# ─── Rich email builders ───────────────────────────────────────────────────────

def _email_wrapper(inner_html: str, locale: str) -> str:
    dir_attr, align = _dir_and_align(locale)
    logo_url = f"{APP_BASE_URL}/branding/logo-email.png"
    unsubscribe_url = f"{APP_BASE_URL}/{locale}/profile#notification-preferences"
    return f"""<!DOCTYPE html>
<html dir="{dir_attr}" lang="{locale}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111a2f;font-family:Arial,Helvetica,sans-serif;">
  <div dir="{dir_attr}" style="max-width:600px;margin:0 auto;padding:32px 16px;direction:{dir_attr};text-align:{align};">
    <div style="text-align:center;margin:0 0 24px 0;">
      <img src="{logo_url}" width="220" height="77" alt="Tivuta" style="width:220px;max-width:220px;height:auto;display:inline-block;" />
    </div>
    <div style="background:#0e1628;border-radius:24px;padding:36px;border:1px solid rgba(212,175,55,0.25);">
      {inner_html}
    </div>
    <p style="color:rgba(240,230,211,0.3);font-size:11px;text-align:center;margin-top:24px;">
      {UNSUBSCRIBE_LINE.get(locale, UNSUBSCRIBE_LINE["he"])}
      <a href="{unsubscribe_url}" style="color:#d4af37;text-decoration:underline;">{UNSUBSCRIBE_LINK.get(locale, UNSUBSCRIBE_LINK["he"])}</a>
    </p>
  </div>
</body>
</html>"""


def _build_survey_email(
    survey: models.Survey, survey_url: str, product_image_url: Optional[str], locale: str, first_name: str
) -> str:
    dir_attr, align = _dir_and_align(locale)
    img_block = (
        f'<div style="margin:0 0 28px 0;border-radius:16px;overflow:hidden;">'
        f'<img src="{product_image_url}" alt="מוצר" width="500" style="width:100%;max-width:500px;height:auto;display:block;" /></div>'
    ) if product_image_url else ''

    def _option_html(i: int, opt: models.SurveyOption) -> str:
        if opt.label_override_he:
            # Unconditionally Hebrew content - no translated sibling column exists on
            # SurveyOption, so this stays rtl/right regardless of the recipient's own locale.
            return (
                f'<div dir="rtl" style="background:#111a2f;border-radius:12px;padding:12px 16px;margin:8px 0;direction:rtl;text-align:right;">'
                f'<span style="color:#f0e6d3;font-size:15px;">{opt.label_override_he}</span></div>'
            )
        label = OPTION_FALLBACK.get(locale, OPTION_FALLBACK["he"]).format(n=i + 1)
        return (
            f'<div dir="{dir_attr}" style="background:#111a2f;border-radius:12px;padding:12px 16px;margin:8px 0;direction:{dir_attr};text-align:{align};">'
            f'<span style="color:#f0e6d3;font-size:15px;">{label}</span></div>'
        )

    options_html = ''.join(_option_html(i, opt) for i, opt in enumerate(survey.options))
    question = getattr(survey, f"question_{locale}", None) or survey.question_he
    greeting = GREETING.get(locale, GREETING["he"]).format(name=html_escape(first_name))
    badge = SURVEY_BADGE.get(locale, SURVEY_BADGE["he"])
    vote_label = VOTE_BUTTON.get(locale, VOTE_BUTTON["he"])

    inner = f"""
    <p dir="{dir_attr}" style="color:#f0e6d3;font-size:14px;margin:0 0 4px 0;direction:{dir_attr};text-align:{align};">{greeting}</p>
    <p dir="{dir_attr}" style="color:#d4af37;font-size:13px;margin:0 0 12px 0;font-weight:700;direction:{dir_attr};text-align:{align};">{badge}</p>
    {img_block}
    <h2 dir="{dir_attr}" style="color:#f0e6d3;font-size:20px;line-height:1.5;margin:0 0 20px 0;direction:{dir_attr};text-align:{align};">{question}</h2>
    <div style="margin:0 0 28px 0;">{options_html}</div>
    <div style="text-align:center;">
      <a href="{survey_url}"
         style="display:inline-block;background:#d4af37;color:#080d1f;padding:14px 36px;
                border-radius:50px;text-decoration:none;font-weight:900;font-size:16px;">
        {vote_label}
      </a>
    </div>
    <p style="color:#f0e6d3;opacity:0.35;font-size:11px;text-align:center;margin:20px 0 0 0;">
      {survey_url}
    </p>"""
    return _email_wrapper(inner, locale)


def _build_deal_email(product: models.Product, product_url: str, locale: str, first_name: str) -> str:
    dir_attr, align = _dir_and_align(locale)
    product_image_url = _absolute_image_url(product.image_url)
    title = getattr(product, f"title_{locale}", None) or product.title_he
    img_block = (
        f'<div style="margin:0 0 28px 0;border-radius:16px;overflow:hidden;">'
        f'<img src="{product_image_url}" alt="{title}"'
        f' width="500" style="width:100%;max-width:500px;height:auto;display:block;" /></div>'
    ) if product_image_url else ''

    price_text = f'₪{int(product.price):,}' if product.price else PRICE_ON_REQUEST.get(locale, PRICE_ON_REQUEST["he"])
    greeting = GREETING.get(locale, GREETING["he"]).format(name=html_escape(first_name))
    badge = DEAL_BADGE.get(locale, DEAL_BADGE["he"])
    purchase_label = PURCHASE_BUTTON.get(locale, PURCHASE_BUTTON["he"])

    inner = f"""
    <p dir="{dir_attr}" style="color:#f0e6d3;font-size:14px;margin:0 0 4px 0;direction:{dir_attr};text-align:{align};">{greeting}</p>
    <p dir="{dir_attr}" style="color:#d4af37;font-size:13px;margin:0 0 12px 0;font-weight:700;direction:{dir_attr};text-align:{align};">{badge}</p>
    {img_block}
    <h2 dir="{dir_attr}" style="color:#f0e6d3;font-size:20px;line-height:1.5;margin:0 0 8px 0;direction:{dir_attr};text-align:{align};">{title}</h2>
    <p dir="{dir_attr}" style="color:#d4af37;font-size:28px;font-weight:900;margin:0 0 28px 0;direction:{dir_attr};text-align:{align};">{price_text}</p>
    <div style="text-align:center;">
      <a href="{product_url}"
         style="display:inline-block;background:#d4af37;color:#080d1f;padding:14px 36px;
                border-radius:50px;text-decoration:none;font-weight:900;font-size:16px;">
        {purchase_label}
      </a>
    </div>"""
    return _email_wrapper(inner, locale)


def _build_fallback_email(subject: str, message: str, locale: str, first_name: str) -> str:
    dir_attr, align = _dir_and_align(locale)
    greeting = GREETING.get(locale, GREETING["he"]).format(name=html_escape(first_name))
    site_link = SITE_LINK.get(locale, SITE_LINK["he"])
    # subject/message are distribution.title_he/message_he - admin-authored, Hebrew-only for every
    # recipient by deliberate scope decision, so these two stay hardcoded rtl/right regardless of
    # the recipient's own locale, same as a Hebrew product title embedded in an English page
    # elsewhere in this app.
    inner = f"""
    <p dir="{dir_attr}" style="color:#f0e6d3;font-size:14px;margin:0 0 12px 0;direction:{dir_attr};text-align:{align};">{greeting}</p>
    <h2 dir="rtl" style="color:#f0e6d3;font-size:20px;margin:0 0 16px 0;direction:rtl;text-align:right;">{subject}</h2>
    <p dir="rtl" style="color:#f0e6d3;opacity:0.8;font-size:15px;line-height:1.7;direction:rtl;text-align:right;">{message}</p>
    <p dir="{dir_attr}" style="margin-top:24px;direction:{dir_attr};text-align:{align};">
      <a href="{APP_BASE_URL}" style="color:#d4af37;font-weight:700;">{site_link}</a>
    </p>"""
    return _email_wrapper(inner, locale)


# ─── Shared email content builder ──────────────────────────────────────────────

def _build_distribution_email(distribution: models.Distribution, locale: str, first_name: str) -> tuple[str, str]:
    """Builds (subject, html) for a distribution's email content, personalized for one recipient's
    locale and first name - survey/daily_deal-specific template with a fallback. Shared by the real
    send, the preview, and the send-test endpoint so exactly one code path decides what an email
    looks like. Reads distribution.survey/.product via ORM relationship access (lazy-loads if not
    already eager-loaded by the caller's own query) - the caller's session must still be open.

    subject is always distribution.title_he, unchanged regardless of locale - the admin's own
    campaign title stays Hebrew-only for every recipient, a deliberate scope decision (see
    CLAUDE.md's distribution-personalization session)."""
    subject = distribution.title_he or "TIVUTA"
    message = distribution.message_he or ""
    html: Optional[str] = None

    if distribution.distribution_type == "survey" and distribution.survey_id and distribution.survey:
        survey = distribution.survey
        survey_url = f"{SHARE_BASE_URL}/share/surveys/{survey.id}?locale={locale}"
        product_image_url = _absolute_image_url(resolve_survey_image_url(survey))
        html = _build_survey_email(survey, survey_url, product_image_url, locale, first_name)
    elif distribution.distribution_type == "daily_deal" and distribution.product_id and distribution.product:
        product = distribution.product
        product_url = f"{SHARE_BASE_URL}/share/products/{product.id}?locale={locale}"
        html = _build_deal_email(product, product_url, locale, first_name)

    if not html:
        html = _build_fallback_email(subject, message, locale, first_name)

    return subject, html


# ─── Background send task ──────────────────────────────────────────────────────

def _send_distribution(distribution_id: int) -> None:
    """Sends email to every member user in the target audience. Runs in a background thread.
    WhatsApp channel is handled client-side via deep link — skipped here."""
    db = SessionLocal()
    try:
        distribution = db.query(models.Distribution).filter(models.Distribution.id == distribution_id).first()
        if not distribution:
            return

        distribution.status = "sending"
        distribution.sending_started_at = datetime.utcnow()
        db.commit()

        try:
            # Smoke-test that this distribution's own content actually builds at all (a broken
            # survey/product reference, a malformed template, etc.) before spending any time on
            # the per-recipient loop below - a systemic template bug should fail the whole
            # distribution immediately, the same way it always has, rather than surface only as a
            # growing per-user failure count (or not surface at all, if the audience is empty).
            # The real per-recipient (subject, html) - which does vary by locale/first_name - is
            # built fresh inside the loop for each actual send.
            _build_distribution_email(distribution, "he", "")

            # Only send to member users; apply segmentation filters
            user_query = db.query(models.User).filter(models.User.role == "member")
            if distribution.filter_city:
                user_query = user_query.filter(models.User.city == distribution.filter_city)
            users = user_query.all()
            if distribution.filter_membership_track:
                track = distribution.filter_membership_track
                users = [u for u in users if u.membership_tracks and track in u.membership_tracks]

            # Retrying a "failed" distribution (admin_send_distribution allows this) must never
            # re-send to someone who already got a real email in an earlier attempt - skip anyone
            # with an existing "sent" log for this distribution. A "failed" log doesn't skip, since
            # retrying is precisely for the people it didn't reach yet.
            already_sent_user_ids = {
                row.user_id
                for row in db.query(models.DistributionSendLog.user_id)
                .filter(models.DistributionSendLog.distribution_id == distribution.id, models.DistributionSendLog.status == "sent")
                .all()
            }

            email_sender = get_email_sender()
            actual_sends = 0
            actual_failures = 0

            for user in users:
                if "email" not in distribution.channels or user.id in already_sent_user_ids:
                    continue
                log = models.DistributionSendLog(
                    distribution_id=distribution.id,
                    user_id=user.id,
                    channel="email",
                )
                try:
                    locale = user.preferred_language or "he"
                    subject, email_html = _build_distribution_email(distribution, locale, user.first_name)
                    result = email_sender.send(to=user.email, subject=subject, html_body=email_html, locale=locale)
                    if result.success:
                        log.status = "sent"
                        log.provider_message_id = result.provider_message_id
                        log.sent_at = datetime.utcnow()
                        actual_sends += 1
                    else:
                        log.status = "failed"
                        log.error = result.error
                        actual_failures += 1
                except Exception as e:
                    log.status = "failed"
                    log.error = str(e)
                    actual_failures += 1
                # Committed immediately, not batched with the final status write below - the
                # email these rows describe was already actually (and irreversibly) sent, so the
                # record of it must survive even if something later in this function throws.
                # Without this, a crash between here and the final commit would roll back the
                # log entries for emails that genuinely went out, and a subsequent retry (now
                # possible from "failed") would have no way to know they'd already been sent.
                db.add(log)
                db.commit()

            # Re-read whatsapp_confirmed_at before deciding the final status - POST .../send
            # returns (and schedules this background task) before the task actually starts
            # running, so an admin can plausibly hit "confirm" via a completely separate request
            # while this function is still mid-flight. Without refreshing, the stale in-memory
            # `distribution` loaded at the top of this function would blindly overwrite status
            # back to awaiting_whatsapp_confirmation even after a genuine concurrent confirmation.
            db.refresh(distribution)

            # WhatsApp has no server-to-server delivery confirmation (it's a client-side deep
            # link the admin has to press send on themselves) - an email-less distribution is
            # never marked "sent" on nothing but an empty loop; it lands in
            # awaiting_whatsapp_confirmation until the admin explicitly confirms via
            # PATCH .../confirm-whatsapp.
            if "email" in distribution.channels:
                distribution.status = "sent" if actual_sends > 0 or actual_failures == 0 else "failed"
                distribution.sent_at = datetime.utcnow()
            elif "whatsapp" in distribution.channels:
                if distribution.whatsapp_confirmed_at:
                    distribution.status = "sent"
                    distribution.sent_at = distribution.sent_at or datetime.utcnow()
                else:
                    distribution.status = "awaiting_whatsapp_confirmation"
            else:
                distribution.status = "failed"
            db.commit()
        except Exception:
            # Never leave a distribution stuck at "sending" forever - any unexpected failure
            # anywhere above (DB hiccup, template bug, etc.) must still land on a terminal,
            # recoverable status. Background task failures are otherwise invisible - nothing
            # surfaces them anywhere - so silently dying here would strand the row with no way to
            # delete or retry it (the exact "stuck at שולח..." dead end this was written to fix).
            db.rollback()
            distribution.status = "failed"
            db.commit()
    finally:
        db.close()


def _serialize_distribution(dist: models.Distribution) -> schemas.DistributionRead:
    sent_count = sum(1 for log in dist.send_logs if log.status == "sent")
    failed_count = sum(1 for log in dist.send_logs if log.status == "failed")
    skipped_count = sum(1 for log in dist.send_logs if log.status == "skipped")
    survey_title = (dist.survey.question_he[:60] if dist.survey and dist.survey.question_he else None)
    product_title = dist.product.title_he if dist.product else None
    return schemas.DistributionRead.model_validate(dist).model_copy(update={
        "sent_count": sent_count,
        "failed_count": failed_count,
        "skipped_count": skipped_count,
        "survey_title": survey_title,
        "product_title": product_title,
    })


# ─── Admin endpoints ───────────────────────────────────────────────────────────

@router.get("/admin/distributions", response_model=List[schemas.DistributionRead], dependencies=[Depends(get_current_admin)])
def admin_list_distributions(db: Session = Depends(get_db)):
    distributions = (
        db.query(models.Distribution)
        .options(
            selectinload(models.Distribution.send_logs),
            selectinload(models.Distribution.survey),
            selectinload(models.Distribution.product),
        )
        .order_by(models.Distribution.created_at.desc())
        .all()
    )
    return [_serialize_distribution(dist) for dist in distributions]


@router.get("/admin/distributions/{distribution_id}/recipients", response_model=List[schemas.DistributionRecipientRead], dependencies=[Depends(get_current_admin)])
def admin_list_distribution_recipients(distribution_id: int, db: Session = Depends(get_db)):
    distribution = (
        db.query(models.Distribution)
        .options(selectinload(models.Distribution.send_logs).selectinload(models.DistributionSendLog.user))
        .filter(models.Distribution.id == distribution_id)
        .first()
    )
    if not distribution:
        raise HTTPException(status_code=404, detail="Distribution not found")

    # Failures first (most actionable), then sent, then anything still pending.
    order = {"failed": 0, "sent": 1, "pending": 2}
    logs = sorted(distribution.send_logs, key=lambda log: order.get(log.status, 3))
    result = []
    for log in logs:
        # SQLite has no FK enforcement in this app and admin_delete_user has no check for
        # historical references, so a member who received a past distribution could later be
        # deleted, leaving this log's user_id dangling - degrade gracefully instead of a 500.
        user = log.user
        result.append(
            schemas.DistributionRecipientRead(
                user_id=log.user_id,
                email=user.email if user else "(משתמש נמחק)",
                first_name=user.first_name if user else "",
                last_name=user.last_name if user else "",
                channel=log.channel,
                status=log.status,
                error=log.error,
                provider_message_id=log.provider_message_id,
                sent_at=log.sent_at,
            )
        )
    return result


@router.post("/admin/distributions", response_model=schemas.DistributionRead)
def admin_create_distribution(
    payload: schemas.DistributionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin),
):
    if payload.distribution_type not in ("survey", "daily_deal"):
        raise HTTPException(status_code=400, detail="distribution_type must be 'survey' or 'daily_deal'")

    distribution = models.Distribution(
        distribution_type=payload.distribution_type,
        survey_id=payload.survey_id,
        product_id=payload.product_id,
        title_he=payload.title_he,
        message_he=payload.message_he,
        channels=payload.channels,
        scheduled_at=payload.scheduled_at,
        filter_membership_track=payload.filter_membership_track,
        filter_city=payload.filter_city,
        whatsapp_manual_mode=payload.whatsapp_manual_mode,
        created_by=current_user.id,
    )
    db.add(distribution)
    db.commit()
    db.refresh(distribution)
    return distribution


@router.post("/admin/distributions/{distribution_id}/send", dependencies=[Depends(get_current_admin)])
def admin_send_distribution(distribution_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    distribution = db.query(models.Distribution).filter(models.Distribution.id == distribution_id).first()
    if not distribution:
        raise HTTPException(status_code=404, detail="Distribution not found")
    # "failed" is included so a genuine transient failure (network blip, etc.) can be retried
    # without deleting and recreating the whole distribution.
    if distribution.status not in ("draft", "failed"):
        raise HTTPException(status_code=400, detail="ניתן לשלוח רק הפצות במצב טיוטה או הפצות שנכשלו")
    background_tasks.add_task(_send_distribution, distribution_id)
    return {"message": "Distribution send started"}


@router.patch("/admin/distributions/{distribution_id}/confirm-whatsapp", response_model=schemas.DistributionRead, dependencies=[Depends(get_current_admin)])
def admin_confirm_whatsapp_sent(distribution_id: int, db: Session = Depends(get_db)):
    """The admin's explicit "yes, I actually pressed send in WhatsApp" confirmation - the only
    thing that's ever allowed to mark a WhatsApp share as real. See _send_distribution's status
    logic above for why this can't be inferred automatically."""
    distribution = (
        db.query(models.Distribution)
        .options(selectinload(models.Distribution.send_logs), selectinload(models.Distribution.survey), selectinload(models.Distribution.product))
        .filter(models.Distribution.id == distribution_id)
        .first()
    )
    if not distribution:
        raise HTTPException(status_code=404, detail="Distribution not found")
    if "whatsapp" not in distribution.channels:
        raise HTTPException(status_code=400, detail="This distribution has no WhatsApp channel to confirm")

    distribution.whatsapp_confirmed_at = datetime.utcnow()
    if distribution.status == "awaiting_whatsapp_confirmation":
        distribution.status = "sent"
        distribution.sent_at = distribution.sent_at or datetime.utcnow()
    db.commit()
    db.refresh(distribution)
    return _serialize_distribution(distribution)


@router.post("/admin/distributions/manual-whatsapp-share", response_model=schemas.DistributionRead, dependencies=[Depends(get_current_admin)])
def admin_create_manual_whatsapp_share(
    payload: schemas.ManualWhatsAppShareCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin),
):
    """One-click quick-log for a manual WhatsApp share (e.g. the poll page's share button) - the
    frontend only ever calls this AFTER the admin has already confirmed "yes I shared it", so the
    row is created already fully confirmed. There is no unconfirmed intermediate state for this
    path, unlike a full campaign distribution created via the normal create+send flow."""
    if payload.distribution_type not in ("survey", "daily_deal"):
        raise HTTPException(status_code=400, detail="distribution_type must be 'survey' or 'daily_deal'")

    now = datetime.utcnow()
    distribution = models.Distribution(
        distribution_type=payload.distribution_type,
        survey_id=payload.survey_id,
        product_id=payload.product_id,
        title_he=payload.title_he,
        channels=["whatsapp"],
        status="sent",
        sent_at=now,
        whatsapp_confirmed_at=now,
        is_manual_share=True,
        created_by=current_user.id,
    )
    db.add(distribution)
    db.commit()
    db.refresh(distribution)
    return _serialize_distribution(distribution)


@router.get("/admin/distributions/{distribution_id}/preview", dependencies=[Depends(get_current_admin)])
def admin_preview_distribution(
    distribution_id: int,
    locale: str = "he",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin),
):
    distribution = (
        db.query(models.Distribution)
        .options(
            selectinload(models.Distribution.survey).selectinload(models.Survey.options).selectinload(models.SurveyOption.product),
            selectinload(models.Distribution.product),
        )
        .filter(models.Distribution.id == distribution_id)
        .first()
    )
    if not distribution:
        raise HTTPException(status_code=404, detail="Distribution not found")

    locale = locale if locale in schemas.VALID_PREFERRED_LANGUAGES else "he"
    subject, html = _build_distribution_email(distribution, locale, current_user.first_name)

    # Count target audience
    user_query = db.query(models.User).filter(models.User.role == "member")
    if distribution.filter_city:
        user_query = user_query.filter(models.User.city == distribution.filter_city)
    users = user_query.all()
    if distribution.filter_membership_track:
        track = distribution.filter_membership_track
        users = [u for u in users if u.membership_tracks and track in u.membership_tracks]

    return {"html": html, "subject": subject, "recipient_count": len(users)}


@router.post("/admin/distributions/{distribution_id}/send-test", dependencies=[Depends(get_current_admin)])
def admin_send_test_distribution(
    distribution_id: int,
    locale: str = "he",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin),
):
    """Sends exactly one real email to the admin's own address, using the same template a real
    send would use - a side-channel verification action, not a real send. Deliberately never
    touches status/sent_at/DistributionSendLog, since a test send must never look like (or count
    toward) a real campaign send. This is how an admin can actually check their own system, since
    real campaign sends only ever go to role == "member" users - admins are never recipients."""
    distribution = (
        db.query(models.Distribution)
        .options(
            selectinload(models.Distribution.survey).selectinload(models.Survey.options).selectinload(models.SurveyOption.product),
            selectinload(models.Distribution.product),
        )
        .filter(models.Distribution.id == distribution_id)
        .first()
    )
    if not distribution:
        raise HTTPException(status_code=404, detail="Distribution not found")

    # The active provider is surfaced alongside success/error because ConsoleEmailSender (the
    # unconfigured-EMAIL_PROVIDER fallback) always reports success=True while only ever writing
    # to server logs the admin never sees - a "successful" test send that's silently going
    # nowhere would otherwise look identical to a real one on the frontend.
    provider = os.environ.get("EMAIL_PROVIDER", "console")
    locale = locale if locale in schemas.VALID_PREFERRED_LANGUAGES else "he"
    subject, html = _build_distribution_email(distribution, locale, current_user.first_name)
    result = get_email_sender().send(to=current_user.email, subject=f"[בדיקה] {subject}", html_body=html, locale=locale)
    return {"success": result.success, "error": result.error, "provider": provider}


@router.delete("/admin/distributions/{distribution_id}", dependencies=[Depends(get_current_admin)])
def admin_delete_distribution(distribution_id: int, db: Session = Depends(get_db)):
    distribution = db.query(models.Distribution).filter(models.Distribution.id == distribution_id).first()
    if not distribution:
        raise HTTPException(status_code=404, detail="Distribution not found")
    # awaiting_whatsapp_confirmation, failed, and sending are all included alongside draft -
    # nothing was confirmably sent yet in any of these states. "sending" specifically is a manual
    # escape hatch: it's meant to be transient (the background task should move it to a terminal
    # status within moments), but if it's ever stuck there for any reason not caught by
    # _send_distribution's own exception handling, the admin needs a way out that doesn't require
    # a direct DB fix.
    if distribution.status not in ("draft", "awaiting_whatsapp_confirmation", "failed", "sending"):
        raise HTTPException(status_code=400, detail="לא ניתן למחוק הפצה שכבר נשלחה")
    db.delete(distribution)
    db.commit()
    return {"message": "deleted"}


@router.post("/api/distributions/process-scheduled")
def process_scheduled_distributions(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Cron endpoint — called by GitHub Actions every 15 minutes.
    Finds draft distributions whose scheduled_at has passed and fires them."""
    verify_cron_secret(request)

    now = datetime.utcnow()
    due = (
        db.query(models.Distribution)
        .filter(
            models.Distribution.status == "draft",
            models.Distribution.scheduled_at.isnot(None),
            models.Distribution.scheduled_at <= now,
        )
        .all()
    )

    # Mark all as "sending" immediately so an overlapping cron run doesn't double-trigger them
    for dist in due:
        dist.status = "sending"
        dist.sending_started_at = datetime.utcnow()
    db.commit()

    for dist in due:
        background_tasks.add_task(_send_distribution, dist.id)

    return {"triggered": len(due), "ids": [d.id for d in due]}


@router.post("/api/distributions/timeout-stuck-sends")
def timeout_stuck_distributions(request: Request, db: Session = Depends(get_db)):
    """Cron endpoint — called by GitHub Actions every 15 minutes, alongside process-scheduled.
    A distribution stuck at status == "sending" past the configured timeout almost certainly hit
    a failure _send_distribution's own exception handling didn't catch — there's no live watchdog
    process on this single-instance Render deployment, so a periodic sweep is the only way to
    reliably close these out instead of leaving an admin staring at "שולח..." forever.

    Every current code path that sets status == "sending" also stamps sending_started_at in the
    same write - so a row with status == "sending" and sending_started_at == NULL can only be one
    that reached "sending" before this column existed. There's no future start instant coming for
    it, and it's necessarily already older than any reasonable timeout (it predates this whole
    feature), so it's swept immediately rather than left waiting for a timestamp it will never get.

    A distribution that's still genuinely mid-send when this fires (a real send taking longer
    than the configured timeout) can get marked "failed" here — but _send_distribution's own
    final status write runs after this, unconditionally, once it actually finishes, so the real
    outcome always wins the last write and the row never ends up stuck on a wrong terminal state
    either way. Pick a timeout comfortably above real send times to avoid the false-failed window
    in between."""
    verify_cron_secret(request)

    timeout_minutes = loyalty.get_setting_float(db, "stuck_sending_timeout_minutes")
    cutoff = datetime.utcnow() - timedelta(minutes=timeout_minutes)
    stuck = (
        db.query(models.Distribution)
        .filter(
            models.Distribution.status == "sending",
            or_(
                models.Distribution.sending_started_at.is_(None),
                models.Distribution.sending_started_at <= cutoff,
            ),
        )
        .all()
    )
    for dist in stuck:
        dist.status = "failed"
    db.commit()

    return {"timed_out": len(stuck), "ids": [d.id for d in stuck]}
