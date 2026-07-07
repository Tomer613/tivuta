import os

from .notifications import EmailSender
from .email_console import ConsoleEmailSender
from .email_resend import ResendEmailSender


def get_email_sender() -> EmailSender:
    provider = os.environ.get("EMAIL_PROVIDER", "console")
    if provider == "resend":
        return ResendEmailSender()
    return ConsoleEmailSender()
