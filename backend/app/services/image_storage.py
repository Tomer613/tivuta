import os
import uuid
from typing import Protocol

import httpx


class ImageStorage(Protocol):
    def save(self, *, filename: str, content: bytes, content_type: str) -> str:
        """Persists the image and returns the value to store as Product.image_url."""
        ...


class LocalDiskImageStorage:
    """Dev fallback: writes to the local filesystem, served by FastAPI's StaticFiles mount.

    Not durable on PaaS platforms without a persistent disk (e.g. Render's default
    ephemeral filesystem is wiped on every deploy) — use SupabaseImageStorage in prod.
    """

    def __init__(self):
        self.images_dir = os.environ.get(
            "IMAGES_DIR",
            os.path.normpath(os.path.join(os.path.dirname(__file__), "../../../frontend/public/images/products")),
        )

    def save(self, *, filename: str, content: bytes, content_type: str) -> str:
        os.makedirs(self.images_dir, exist_ok=True)
        dest = os.path.join(self.images_dir, filename)
        with open(dest, "wb") as f:
            f.write(content)
        return filename


class SupabaseImageStorage:
    """Uploads to a Supabase Storage bucket via its REST API and returns the public URL.

    Requires the bucket to be public (Supabase dashboard → Storage → bucket → make public) —
    reads are unauthenticated, only the upload here is authenticated via the service role key.
    """

    def __init__(self):
        self.base_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
        self.service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        self.bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "product-images")

    def save(self, *, filename: str, content: bytes, content_type: str) -> str:
        response = httpx.post(
            f"{self.base_url}/storage/v1/object/{self.bucket}/{filename}",
            headers={
                "Authorization": f"Bearer {self.service_role_key}",
                "apikey": self.service_role_key,
                "Content-Type": content_type,
            },
            content=content,
            timeout=30.0,
        )
        if response.status_code >= 400:
            raise RuntimeError(f"Supabase Storage upload failed ({response.status_code}): {response.text}")
        return f"{self.base_url}/storage/v1/object/public/{self.bucket}/{filename}"


def generate_image_filename(original_filename: str) -> str:
    ext = os.path.splitext(original_filename or "")[1].lower() or ".jpg"
    return f"{uuid.uuid4().hex}{ext}"
