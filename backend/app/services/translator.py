import json
import os

_client = None


def _get_client():
    global _client
    if _client is None:
        try:
            from anthropic import Anthropic
            _client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        except Exception as e:
            raise RuntimeError(f"Anthropic client not available: {e}")
    return _client


# Sends whatever text is passed in (currently title_he/description_he only) to
# Anthropic's API over the network. Don't route PII-bearing fields (names,
# addresses, phone/ID numbers, etc.) through this helper without revisiting
# that data-sharing decision first.
def translate_product(title_he: str, description_he: str) -> dict:
    prompt = f"""You are a professional translator for a luxury Jewish marketplace in Israel serving the Haredi (Ultra-Orthodox) community.

Translate the following Hebrew product title and description into English, French, and Yiddish (use authentic Ashkenazi/Haredi Yiddish).

Be accurate, professional, and culturally appropriate for the Haredi community.

Hebrew title: {title_he}
Hebrew description: {description_he}

Respond with ONLY valid JSON in this exact format, no extra text:
{{
  "title_en": "...",
  "description_en": "...",
  "title_fr": "...",
  "description_fr": "...",
  "title_yi": "...",
  "description_yi": "..."
}}"""

    client = _get_client()
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    text = message.content[0].text.strip()
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end])
