from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared by main.py (registers the middleware/exception handler) and any router
# that needs @limiter.limit(...) — kept in its own module so routers don't have
# to import from main.py, which would create a circular import (main.py imports
# the routers).
limiter = Limiter(key_func=get_remote_address)
