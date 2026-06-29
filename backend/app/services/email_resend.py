import os
import httpx

from .notifications import SendResult


class ResendEmailSender:
    """https://resend.com - simple HTTP email API, default production provider."""

    def __init__(self):
        self.api_key = os.environ.get("RESEND_API_KEY", "")
        self.from_addr = os.environ.get("EMAIL_FROM", "Tivuta <no-reply@tivuta.co.il>")

    def send(self, *, to: str, subject: str, html_body: str, locale: str = "he") -> SendResult:
        try:
            response = httpx.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "from": self.from_addr,
                    "to": [to],
                    "subject": subject,
                    "html": html_body,
                },
                timeout=10.0,
            )
            if response.status_code >= 400:
                return SendResult(success=False, error=response.text)
            data = response.json()
            return SendResult(success=True, provider_message_id=data.get("id"))
        except Exception as e:
            return SendResult(success=False, error=str(e))
