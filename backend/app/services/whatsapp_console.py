import sys

from .notifications import SendResult


class ConsoleWhatsAppSender:
    """Dev fallback: logs the WhatsApp message instead of sending it."""

    def send(self, *, to_phone: str, text: str, locale: str = "he") -> SendResult:
        message = f"[whatsapp:console] to={to_phone}\n{text}"
        try:
            print(message)
        except UnicodeEncodeError:
            sys.stdout.buffer.write((message + "\n").encode("utf-8", errors="replace"))
        return SendResult(success=True, provider_message_id="console")
