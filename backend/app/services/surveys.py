from typing import Optional

from .. import models


def resolve_survey_image_url(survey: models.Survey) -> Optional[str]:
    """The single source of truth for "what image represents this poll" - shared by the
    campaign-email builder (routers/distributions.py) and the WhatsApp/email link-preview page
    (routers/share.py) so they can't silently drift on the fallback rule.

    Prefers the admin-set Survey.image_url; falls back to the first option's product photo (the
    original, pre-image-field behavior) so an existing product poll with no explicit image still
    shows something reasonable. Returns the raw stored value (bare filename or full Supabase URL,
    same convention as Product.image_url) - callers resolve it to an absolute URL themselves.
    """
    if survey.image_url:
        return survey.image_url
    for opt in survey.options:
        if opt.product and opt.product.image_url:
            return opt.product.image_url
    return None
