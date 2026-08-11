import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models
from app.database import Base
from app.main import app
from app.rate_limit import limiter
from app.security import get_db, get_password_hash

# A single shared in-memory SQLite connection (StaticPool) for the whole test run — the
# standard FastAPI-documented pattern for testing against SQLite, since a plain in-memory
# DB is otherwise per-connection and each new Session would see an empty database.
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture()
def db_engine():
    """Fresh schema per test — the suite is small enough that this costs nothing meaningful
    and avoids any risk of one test's leftover rows affecting another."""
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session(db_engine):
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_engine):
    # The slowapi limiter is process-global state; TestClient has no real IP, so every request
    # in a test run shares one rate-limit bucket unless reset before each test.
    limiter.reset()
    return TestClient(app)


@pytest.fixture()
def make_user(db_session):
    def _make(email="member@example.com", password="testpass123", **kwargs):
        user = models.User(
            email=email,
            first_name=kwargs.pop("first_name", "Test"),
            last_name=kwargs.pop("last_name", "User"),
            hashed_password=get_password_hash(password),
            **kwargs,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _make


@pytest.fixture()
def make_vendor(db_session):
    def _make(vertical="diamonds", name_he="ספק בדיקה", **kwargs):
        vendor = models.Vendor(vertical=vertical, name_he=name_he, **kwargs)
        db_session.add(vendor)
        db_session.commit()
        db_session.refresh(vendor)
        return vendor

    return _make
