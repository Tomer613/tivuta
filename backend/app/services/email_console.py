import sys

from .notifications import SendResult


class ConsoleEmailSender:
    """Dev fallback: logs the email instead of sending it."""

    def send(self, *, to: str, subject: str, html_body: str, locale: str = "he") -> SendResult:
        message = f"[email:console] to={to} subject={subject!r}\n{html_body}"
        try:
            print(message)
        except UnicodeEncodeError:
            # Windows console codepages (e.g. cp1252) can't print Hebrew/RTL text.
            sys.stdout.buffer.write((message + "\n").encode("utf-8", errors="replace"))
        return SendResult(success=True, provider_message_id="console")
