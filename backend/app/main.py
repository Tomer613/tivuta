import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth, catalog, distributions, favorites, leads, notifications, products, promotions, reviews, surveys, translate, users

app = FastAPI(title="Tivuta - The Working Haredi Ecosystem")

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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
