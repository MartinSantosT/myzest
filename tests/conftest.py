"""
Shared fixtures for Zest tests.
In-memory SQLite DB + FastAPI TestClient.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base
from app.main import app, get_db, hash_password
from app import models


# --- In-memory DB for tests ---
SQLALCHEMY_DATABASE_URL = "sqlite:///file::memory:?cache=shared"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Override the DB dependency across the entire app
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    """Creates tables before each test, removes them after."""
    Base.metadata.create_all(bind=engine)
    # Create directories expected by the app
    import os
    os.makedirs("app/static/uploads", exist_ok=True)
    os.makedirs("data", exist_ok=True)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    """DB session for tests that need direct access."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    """FastAPI TestClient."""
    return TestClient(app)


@pytest.fixture
def test_user(db):
    """Creates a test user and returns their data."""
    user = models.User(
        email="test@zest.local",
        name="Test Chef",
        password_hash=hash_password("test1234"),
        is_admin=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(client, test_user):
    """Headers with valid JWT token for the test user."""
    response = client.post("/auth/login", json={
        "email": "test@zest.local",
        "password": "test1234",
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
