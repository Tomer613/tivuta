from typing import Optional, Protocol
from pydantic import BaseModel


class SendResult(BaseModel):
    success: bool
    provider_message_id: Optional[str] = None
    error: Optional[str] = None


class EmailSender(Protocol):
    def send(self, *, to: str, subject: str, html_body: str, locale: str = "he") -> SendResult: ...
