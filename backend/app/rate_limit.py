import os

from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared by main.py (registers the middleware/exception handler) and any router
# that needs @limiter.limit(...) — kept in its own module so routers don't have
# to import from main.py, which would create a circular import (main.py imports
# the routers).

# Presence-check, same "ships dark until configured" shape as main.py's SENTRY_DSN — unset
# (every environment today) means exactly the original in-memory storage; set only once Render
# is scaled past the single instance backend/Procfile currently runs (in-memory storage under-
# counts across multiple processes, since each tracks its own separate counters).
REDIS_URL = os.environ.get("REDIS_URL", "")

limiter = Limiter(key_func=get_remote_address, storage_uri=REDIS_URL or None)
