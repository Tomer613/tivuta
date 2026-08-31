import html

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session, selectinload

from .. import models
from ..schemas import RTL_LOCALES, normalize_locale
from ..security import get_db
from ..services.surveys import resolve_survey_image_url

router = APIRouter(prefix="/share", tags=["share"])

FRONTEND_BASE_URL = "https://www.tivuta.co.il"
_DESCRIPTION_MAX_LEN = 200

# Kept generic ("there", not "the product") so this same copy reads correctly for both the
# product and survey redirect pages below.
_TEXT = {
    "he": {"redirecting": "מעביר אותך הלאה...", "fallback_link": "לחץ כאן אם אינך מועבר אוטומטית"},
    "en": {"redirecting": "Taking you there...", "fallback_link": "Click here if you are not redirected automatically"},
    "fr": {"redirecting": "Nous vous redirigeons...", "fallback_link": "Cliquez ici si vous n'êtes pas redirigé automatiquement"},
    "yi": {"redirecting": "מ'ר איבערפירט אייך...", "fallback_link": "קליקט דא אויב איר ווערט נישט אויטאמאטיש איבערגעפירט"},
}


def _resolve_image_url(request: Request, image_url: str | None) -> str:
    if not image_url:
        return f"{FRONTEND_BASE_URL}/opengraph-image"
    if image_url.startswith("http://") or image_url.startswith("https://"):
        return image_url
    # Local-dev-only case (LocalDiskImageStorage) — never real in production, where
    # SupabaseImageStorage already stores a full URL. Derived from the current request's own
    # host rather than a hardcoded domain, since /images/products is served by this same app
    # regardless of which hostname (share.tivuta.co.il or otherwise) reached it.
    return f"{str(request.base_url).rstrip('/')}/images/products/{image_url}"


def _redirect_page(destination: str, *, title: str = "", description: str = "", image: str = "", locale: str = "he") -> str:
    t = _TEXT.get(locale, _TEXT["he"])
    safe_destination = html.escape(destination, quote=True)
    safe_title = html.escape(title or "Tivuta")
    safe_description = html.escape(description)
    safe_image = html.escape(image, quote=True)
    dir_attr = "rtl" if locale in RTL_LOCALES else "ltr"

    meta_tags = f'<meta property="og:title" content="{safe_title}"/>'
    if safe_description:
        meta_tags += f'<meta property="og:description" content="{safe_description}"/>'
    if safe_image:
        meta_tags += f'<meta property="og:image" content="{safe_image}"/>'

    return f"""<!DOCTYPE html>
<html lang="{locale}" dir="{dir_attr}">
<head>
<meta charset="utf-8"/>
<title>{safe_title}</title>
{meta_tags}
<meta property="og:type" content="website"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta http-equiv="refresh" content="0;url={safe_destination}"/>
<meta name="robots" content="noindex"/>
<style>
body {{ margin:0; min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center;
        gap:12px; background:#111a2f; color:#f0e6d3; font-family:sans-serif; text-align:center; padding:24px; }}
.wordmark {{ color:#d4af37; font-weight:900; font-size:28px; letter-spacing:2px; }}
a {{ color:#d4af37; }}
</style>
</head>
<body>
<div class="wordmark">TIVUTA</div>
<p>{safe_title}</p>
<p>{html.escape(t["redirecting"])}</p>
<a href="{safe_destination}">{html.escape(t["fallback_link"])}</a>
</body>
</html>"""


@router.get("/products/{product_id}", response_class=HTMLResponse)
def share_product(product_id: int, request: Request, locale: str = "he", db: Session = Depends(get_db)):
    locale = normalize_locale(locale)
    destination = f"{FRONTEND_BASE_URL}/{locale}/products?id={product_id}"

    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product or not product.is_active:
        body = _redirect_page(destination, locale=locale)
    else:
        title = getattr(product, f"title_{locale}", None) or product.title_he
        description = getattr(product, f"description_{locale}", None) or product.description_he or ""
        if len(description) > _DESCRIPTION_MAX_LEN:
            description = description[:_DESCRIPTION_MAX_LEN] + "…"
        image = _resolve_image_url(request, product.image_url)
        body = _redirect_page(destination, title=title, description=description, image=image, locale=locale)

    return HTMLResponse(
        content=body,
        headers={
            "Content-Security-Policy": "default-src 'self'; style-src 'unsafe-inline'",
            "X-Robots-Tag": "noindex",
        },
    )


@router.get("/surveys/{survey_id}", response_class=HTMLResponse)
def share_survey(survey_id: int, request: Request, locale: str = "he", db: Session = Depends(get_db)):
    locale = normalize_locale(locale)
    destination = f"{FRONTEND_BASE_URL}/{locale}/survey?id={survey_id}"

    survey = (
        db.query(models.Survey)
        .options(selectinload(models.Survey.options).selectinload(models.SurveyOption.product))
        .filter(models.Survey.id == survey_id)
        .first()
    )
    if not survey or not survey.is_active:
        body = _redirect_page(destination, locale=locale)
    else:
        title = getattr(survey, f"question_{locale}", None) or survey.question_he
        image = _resolve_image_url(request, resolve_survey_image_url(survey))
        body = _redirect_page(destination, title=title, image=image, locale=locale)

    return HTMLResponse(
        content=body,
        headers={
            "Content-Security-Policy": "default-src 'self'; style-src 'unsafe-inline'",
            "X-Robots-Tag": "noindex",
        },
    )
