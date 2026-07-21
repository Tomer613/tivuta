import os

from .notifications import EmailSender
from .email_console import ConsoleEmailSender
from .email_resend import ResendEmailSender
from .image_storage import ImageStorage, LocalDiskImageStorage, SupabaseImageStorage


def get_email_sender() -> EmailSender:
    provider = os.environ.get("EMAIL_PROVIDER", "console")
    if provider == "resend":
        return ResendEmailSender()
    return ConsoleEmailSender()


def get_image_storage() -> ImageStorage:
    provider = os.environ.get("IMAGE_STORAGE_PROVIDER", "local")
    if provider == "supabase":
        return SupabaseImageStorage()
    return LocalDiskImageStorage()
