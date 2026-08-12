import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from .rate_limit import limiter
from .routers import analytics, auth, catalog, distributions, favorites, leads, notifications, products, promotions, reviews, sales, share, surveys, translate, users, vendor_portal, vendors, verticals

# Error monitoring — inert until SENTRY_DSN is set (same "skip until configured" pattern as
# get_email_sender()/get_image_storage()). No traces_sample_rate: errors only, no APM/tracing.
SENTRY_DSN = os.environ.get("SENTRY_DSN", "")
if SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment="production" if os.environ.get("DATABASE_URL") else "development",
    )

app = FastAPI(title="Tivuta - The Working Haredi Ecosystem")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Paths that serve FastAPI's own Swagger/ReDoc UI, which loads CDN-hosted JS/CSS —
# a strict CSP would break them, so they're excluded from that one header below.
_CSP_EXEMPT_PATHS = {"/docs", "/redoc", "/openapi.json"}
# The /share/* unfurl pages (routers/share.py) set their own, narrower CSP directly on the
# response — they need an inline <style> block for their branded look, which the blanket
# default-src 'none' below would otherwise strip out.
_CSP_EXEMPT_PREFIXES = ("/share/",)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    path = request.url.path
    if path not in _CSP_EXEMPT_PATHS and not path.startswith(_CSP_EXEMPT_PREFIXES):
        response.headers["Content-Security-Policy"] = "default-src 'none'"
    return response

# Serve uploaded product images — in prod set IMAGES_DIR env var to the actual upload path
_IMAGES_DIR = os.environ.get(
    "IMAGES_DIR",
    os.path.normpath(os.path.join(os.path.dirname(__file__), "../../frontend/public/images/products")),
)
os.makedirs(_IMAGES_DIR, exist_ok=True)
app.mount("/images/products", StaticFiles(directory=_IMAGES_DIR), name="product-images")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

extra_origins = os.environ.get("CORS_ORIGINS", "")
if extra_origins:
    origins.extend(origin.strip() for origin in extra_origins.split(",") if origin.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Confirmed by an exhaustive survey of every frontend fetch call site: no request anywhere
    # in the app sets credentials: 'include' (auth is a Bearer token in localStorage, never
    # cookies), and only these methods/headers are ever actually used — narrowed from ["*"] and
    # allow_credentials=True, which were both unused permissiveness, not load-bearing.
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/")
def read_root():
    return {"message": "Welcome to the Tivuta API", "status": "active"}


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(catalog.router)
app.include_router(products.router)
app.include_router(promotions.router)
app.include_router(leads.router)
app.include_router(surveys.router)
app.include_router(distributions.router)
app.include_router(translate.router)
app.include_router(favorites.router)
app.include_router(notifications.router)
app.include_router(reviews.router)
app.include_router(vendors.router)
app.include_router(sales.router)
app.include_router(vendor_portal.router)
app.include_router(verticals.router)
app.include_router(share.router)
app.include_router(analytics.router)
