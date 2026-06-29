import os
import httpx

from .notifications import SendResult


class MetaCloudWhatsAppSender:
    """https://developers.facebook.com/docs/whatsapp/cloud-api - default production provider."""

    def __init__(self):
        self.token = os.environ.get("WHATSAPP_CLOUD_API_TOKEN", "")
        self.phone_number_id = os.environ.get("WHATSAPP_CLOUD_PHONE_NUMBER_ID", "")

    def send(self, *, to_phone: str, text: str, locale: str = "he") -> SendResult:
        try:
            response = httpx.post(
                f"https://graph.facebook.com/v19.0/{self.phone_number_id}/messages",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "messaging_product": "whatsapp",
                    "to": to_phone,
                    "type": "text",
                    "text": {"body": text},
                },
                timeout=10.0,
            )
            if response.status_code >= 400:
                return SendResult(success=False, error=response.text)
            data = response.json()
            message_id = data.get("messages", [{}])[0].get("id")
            return SendResult(success=True, provider_message_id=message_id)
        except Exception as e:
            return SendResult(success=False, error=str(e))
