import os

from .notifications import EmailSender, WhatsAppSender
from .email_console import ConsoleEmailSender
from .email_resend import ResendEmailSender
from .whatsapp_console import ConsoleWhatsAppSender
from .whatsapp_meta import MetaCloudWhatsAppSender


def get_email_sender() -> EmailSender:
    provider = os.environ.get("EMAIL_PROVIDER", "console")
    if provider == "resend":
        return ResendEmailSender()
    return ConsoleEmailSender()


def get_whatsapp_sender() -> WhatsAppSender:
    provider = os.environ.get("WHATSAPP_PROVIDER", "console")
    if provider == "meta_cloud":
        return MetaCloudWhatsAppSender()
    return ConsoleWhatsAppSender()
